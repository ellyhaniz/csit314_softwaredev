from fastapi import HTTPException

from app.repositories.donation_repository import (
    DonationRepository,
    FLAG_THRESHOLD,
    SPIKE_THRESHOLD,
)
from app.repositories.fra_repository import FRARepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.reported_campaign_repository import ReportedCampaignRepository
from app.repositories.user_repository import UserRepository
from app.repositories.user_violation_repository import UserViolationRepository

VALID_REPORT_ACTIONS = {"reviewed", "dismissed", "actioned"}


class ModerationService:
    # PM-03: Reported Campaigns
    @staticmethod
    def create_report(fra_id: int, reported_by: int, reason: str):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="Campaign not found")
        report = ReportedCampaignRepository.create(fra_id, reported_by, reason)
        return {"message": "Campaign reported", "report": report}

    @staticmethod
    def get_reported_campaigns():
        reports = ReportedCampaignRepository.get_all()
        return {"count": len(reports), "reports": reports}

    @staticmethod
    def get_campaign_detail(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        reports = ReportedCampaignRepository.get_by_fra(fra_id)
        return {"fra": fra, "reports": reports}

    @staticmethod
    def action_report(report_id: int, action: str, reviewed_by: int, fra_action: str = None):
        if action not in VALID_REPORT_ACTIONS:
            raise HTTPException(status_code=400, detail=f"Action must be one of: {VALID_REPORT_ACTIONS}")

        report = ReportedCampaignRepository.get_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        updated_report = ReportedCampaignRepository.update_status(report_id, action, reviewed_by)

        updated_fra = None
        if action == "actioned" and fra_action in {"cancelled", "suspended"}:
            updated_fra = FRARepository.update_status(report["fra_id"], fra_action)

        fra = FRARepository.get_by_id(report["fra_id"])
        fra_title = fra["title"] if fra else "a campaign"
        reporter_id = report["reported_by"]

        if action in {"reviewed", "actioned"} and fra:
            fundraiser_id = fra["fund_raiser_id"]
            description = f"Campaign '{fra_title}' was reported and actioned by admin."
            UserViolationRepository.create(fundraiser_id, "reported_campaign", description, reviewed_by)
            UserRepository.increment_violation_count(fundraiser_id)

        if action == "dismissed":
            msg = f"Your report on '{fra_title}' was reviewed. No action was taken."
        elif action == "reviewed":
            msg = f"Your report on '{fra_title}' was reviewed. The fundraiser has been warned."
        elif action == "actioned" and fra_action == "suspended":
            msg = f"Your report on '{fra_title}' was reviewed. The campaign has been suspended."
        elif action == "actioned" and fra_action == "cancelled":
            msg = f"Your report on '{fra_title}' was reviewed. The campaign has been removed."
        else:
            msg = f"Your report on '{fra_title}' has been reviewed."

        NotificationRepository.create(reporter_id, msg)

        return {"message": "Report actioned", "report": updated_report, "fra": updated_fra}

    # UA-03: Flag Violations
    @staticmethod
    def get_flagged_users():
        users = UserRepository.get_flagged_users()
        return {"count": len(users), "flagged_users": users}

    @staticmethod
    def get_violation_history(user_id: int):
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        violations = UserViolationRepository.get_by_user(user_id)
        return {"user": user, "violation_count": len(violations), "violations": violations}

    @staticmethod
    def apply_user_action(user_id: int, action: str, reason: str, actioned_by: int):
        if action not in {"warn", "suspend", "ban"}:
            raise HTTPException(status_code=400, detail="Action must be one of: warn, suspend, ban")

        user = UserRepository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        violation = UserViolationRepository.create(user_id, action, reason, actioned_by)
        UserRepository.increment_violation_count(user_id)

        if action == "suspend":
            updated_user = UserRepository.update_status(user_id, "suspended")
        elif action == "ban":
            updated_user = UserRepository.update_status(user_id, "banned")
        else:
            updated_user = UserRepository.get_by_id(user_id)

        return {"message": f"User {action}", "user": updated_user, "violation": violation}

    # UA-05: Flag Donations
    @staticmethod
    def get_flagged_donations():
        donations = DonationRepository.get_large_donations()
        return {"count": len(donations), "flagged_donations": donations}

    @staticmethod
    def check_and_flag_donation(donation_id: int, amount: float):
        if amount > FLAG_THRESHOLD:
            updated = DonationRepository.update_status(
                donation_id, "flagged", f"Amount exceeds threshold of ${FLAG_THRESHOLD}"
            )
            return {"flagged": True, "donation": updated}
        return {"flagged": False}

    @staticmethod
    def review_donation(donation_id: int, decision: str):
        decision_map = {"approve": "completed", "reject": "refunded"}
        if decision not in decision_map:
            raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")
        status = decision_map[decision]
        updated = DonationRepository.update_status(donation_id, status)
        if not updated:
            raise HTTPException(status_code=404, detail="Donation not found")
        if status == "completed":
            fra_id = updated.get("fra_id")
            amount = float(updated.get("amount", 0))
            if fra_id and amount:
                FRARepository.update_current_amount(fra_id, amount)
        elif status == "refunded":
            donor_id = updated.get("donor_id")
            amount = updated.get("amount", 0)
            if donor_id:
                description = f"Flagged donation of S${amount} was rejected by admin."
                UserViolationRepository.create(donor_id, "rejected_donation", description, None)
                UserRepository.increment_violation_count(donor_id)
        return {"message": f"Donation {decision}d", "donation": updated}

    # UA-07: Detect Spikes
    @staticmethod
    def monitor_donations():
        active_fra_ids = DonationRepository.get_active_fra_ids()
        spikes = []
        for fra_id in active_fra_ids:
            hourly_count = DonationRepository.get_hourly_count(fra_id)
            if hourly_count >= SPIKE_THRESHOLD:
                FRARepository.set_spike_flagged(fra_id, True)
                spikes.append({"fra_id": fra_id, "hourly_count": hourly_count})
        return {"spikes_detected": len(spikes), "spikes": spikes}

    @staticmethod
    def get_spike_alerts():
        flagged = FRARepository.get_spike_flagged()
        enriched = []
        for fra in flagged:
            hourly = DonationRepository.get_hourly_count(fra["id"])
            enriched.append({**fra, "hourly_donation_count": hourly})
        return {"count": len(enriched), "spike_alerts": enriched}

    @staticmethod
    def get_spike_detail(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        hourly_count = DonationRepository.get_hourly_count(fra_id)
        donations = DonationRepository.get_by_fra(fra_id)
        return {
            "fra": fra,
            "hourly_donation_count": hourly_count,
            "is_spike": hourly_count >= SPIKE_THRESHOLD,
            "recent_donations": donations[:20],
        }

    @staticmethod
    def dismiss_spike(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        updated = FRARepository.set_spike_flagged(fra_id, False)
        return {"message": "Spike flag dismissed", "fra": updated}
