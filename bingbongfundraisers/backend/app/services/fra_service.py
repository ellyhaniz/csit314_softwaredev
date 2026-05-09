from datetime import date

from fastapi import HTTPException

from app.repositories.campaign_update_repository import CampaignUpdateRepository
from app.repositories.donation_repository import DonationRepository
from app.repositories.fra_repository import FRARepository


class FRAService:
    # FR-01: Create FRA
    @staticmethod
    def create_fra(data: dict):
        end = date.fromisoformat(data["end_date"])
        if end <= date.today():
            raise HTTPException(status_code=400, detail="End date must be in the future")
        if data["target_amount"] <= 0:
            raise HTTPException(status_code=400, detail="Target amount must be positive")
        return FRARepository.create(data)

    @staticmethod
    def get_fra_detail(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        return fra

    # FR-02: End Date / Auto-Close
    @staticmethod
    def check_and_close_expired():
        expired = FRARepository.get_expired()
        closed = []
        for fra in expired:
            updated = FRARepository.update_status(fra["id"], "expired")
            closed.append(updated)
        return {"closed_count": len(closed), "closed": closed}

    # FR-03: Post Campaign Update
    @staticmethod
    def post_update(fra_id: int, title: str, content: str):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        if not content or len(content.strip()) == 0:
            raise HTTPException(status_code=400, detail="Update content cannot be empty")
        return CampaignUpdateRepository.save(fra_id, title, content)

    @staticmethod
    def get_updates(fra_id: int):
        return CampaignUpdateRepository.get_by_fra(fra_id)

    # DO-09: Impact Score
    @staticmethod
    def get_impact_score(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        return {"fra_id": fra_id, "impact_score": float(fra["impact_score"])}

    @staticmethod
    def calculate_and_update_score(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")

        donation_count = DonationRepository.get_count_by_fra(fra_id)
        update_count = CampaignUpdateRepository.get_count_by_fra(fra_id)

        if donation_count == 0 and fra["view_count"] == 0:
            return {"fra_id": fra_id, "impact_score": 0.0, "sufficient_data": False}

        target = float(fra["target_amount"])
        current = float(fra["current_amount"])
        funding_score = min((current / target) * 2.0, 2.0) if target > 0 else 0
        donor_score = min(donation_count / 10, 1.5)
        view_score = min(fra["view_count"] / 100, 1.0)
        update_score = min(update_count / 5, 0.5)

        score = round(funding_score + donor_score + view_score + update_score, 2)
        score = min(score, 5.0)

        updated = FRARepository.update_impact_score(fra_id, score)
        return {"fra_id": fra_id, "impact_score": score, "sufficient_data": True, "fra": updated}

    # DO-10: Progress Bar
    @staticmethod
    def get_progress_data(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")

        target = float(fra["target_amount"])
        current = float(fra["current_amount"])
        percentage = round((current / target) * 100, 1) if target > 0 else 0
        percentage = min(percentage, 100)

        today = date.today()
        end = fra["end_date"]
        if isinstance(end, str):
            end = date.fromisoformat(end)
        days_remaining = max((end - today).days, 0)

        donor_count = DonationRepository.get_count_by_fra(fra_id)

        return {
            "fra_id": fra_id,
            "title": fra["title"],
            "current_amount": current,
            "target_amount": target,
            "percentage": percentage,
            "days_remaining": days_remaining,
            "donor_count": donor_count,
            "goal_reached": percentage >= 100,
        }
