from fastapi import HTTPException

from app.repositories.donation_repository import DonationRepository, FLAG_THRESHOLD
from app.repositories.fra_repository import FRARepository


class DonationService:
    @staticmethod
    def create_donation(data: dict):
        if data["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        fra = FRARepository.get_by_id(data["fra_id"])
        if not fra:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if fra["status"] != "active":
            raise HTTPException(status_code=400, detail="Campaign is no longer accepting donations")

        status = "flagged" if data["amount"] >= FLAG_THRESHOLD else "completed"

        donation = DonationRepository.create({
            "fra_id": data["fra_id"],
            "donor_id": data["donor_id"],
            "amount": data["amount"],
            "message": data.get("message"),
            "is_anonymous": data.get("is_anonymous", False),
            "status": status,
        })

        if status == "completed":
            FRARepository.update_current_amount(data["fra_id"], data["amount"])

        return {
            "message": "Donation successful",
            "donation": donation,
            "flagged": status == "flagged",
        }
