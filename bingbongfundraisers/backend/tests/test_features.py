"""
Manual test cases implemented as automated pytest tests.
Run with: pytest tests/test_features.py -v
"""

from unittest.mock import MagicMock, patch
import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_fra(fra_id=1, status="active", fund_raiser_id=3, donee_id=2):
    return {
        "id": fra_id,
        "title": "Help Sick Children",
        "status": status,
        "fund_raiser_id": fund_raiser_id,
        "donee_id": donee_id,
        "target_amount": 15000.0,
        "current_amount": 3200.0,
    }

def make_donation(donation_id=1, fra_id=1, donor_id=1, amount=100.0, status="completed"):
    return {
        "id": donation_id,
        "fra_id": fra_id,
        "donor_id": donor_id,
        "amount": amount,
        "status": status,
        "message": None,
        "is_anonymous": False,
    }


# ---------------------------------------------------------------------------
# DO-04: Donation — normal amount (below threshold)
# ---------------------------------------------------------------------------

class TestDonation:
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_normal_donation_is_completed(self, mock_create, mock_update, mock_get_fra):
        """Donation below S$5,000 threshold should have status 'completed'."""
        mock_get_fra.return_value = make_fra()
        mock_create.return_value = make_donation(amount=100.0, status="completed")

        from app.services.donation_service import DonationService
        result = DonationService.create_donation({
            "fra_id": 1, "donor_id": 1, "amount": 100.0,
            "message": None, "is_anonymous": False,
        })

        assert result["flagged"] is False
        assert result["donation"]["status"] == "completed"
        mock_update.assert_called_once_with(1, 100.0)

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_large_donation_is_flagged(self, mock_create, mock_update, mock_get_fra):
        """Donation >= S$5,000 should be flagged and NOT added to campaign total."""
        mock_get_fra.return_value = make_fra()
        mock_create.return_value = make_donation(amount=7000.0, status="flagged")

        from app.services.donation_service import DonationService
        result = DonationService.create_donation({
            "fra_id": 1, "donor_id": 1, "amount": 7000.0,
            "message": None, "is_anonymous": False,
        })

        assert result["flagged"] is True
        assert result["donation"]["status"] == "flagged"
        mock_update.assert_not_called()

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_donation_to_inactive_campaign_rejected(self, mock_get_fra):
        """Donation to a closed/expired campaign should raise 400."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra(status="expired")

        from app.services.donation_service import DonationService
        with pytest.raises(HTTPException) as exc_info:
            DonationService.create_donation({
                "fra_id": 1, "donor_id": 1, "amount": 50.0,
                "message": None, "is_anonymous": False,
            })
        assert exc_info.value.status_code == 400

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_donation_zero_amount_rejected(self, mock_get_fra):
        """Donation of S$0 or less should raise 400."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra()

        from app.services.donation_service import DonationService
        with pytest.raises(HTTPException) as exc_info:
            DonationService.create_donation({
                "fra_id": 1, "donor_id": 1, "amount": 0,
                "message": None, "is_anonymous": False,
            })
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# UA-05: Flagged donation review — approve and reject
# ---------------------------------------------------------------------------

class TestFlaggedDonationReview:
    @patch("app.repositories.donation_repository.DonationRepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    def test_approve_donation_updates_campaign_total(self, mock_update_amount, mock_update_status):
        """Approving a flagged donation should set status to 'completed' and add to FRA total."""
        mock_update_status.return_value = make_donation(amount=7000.0, status="completed")

        from app.services.moderation_service import ModerationService
        result = ModerationService.review_donation(1, "approve")

        mock_update_status.assert_called_once_with(1, "completed")
        mock_update_amount.assert_called_once_with(1, 7000.0)
        assert result["donation"]["status"] == "completed"

    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.donation_repository.DonationRepository.update_status")
    def test_reject_donation_adds_violation_to_donor(self, mock_update_status, mock_create_violation, mock_increment):
        """Rejecting a flagged donation should add a violation to the donor."""
        mock_update_status.return_value = make_donation(amount=7000.0, status="refunded", donor_id=1)

        from app.services.moderation_service import ModerationService
        ModerationService.review_donation(1, "reject")

        mock_create_violation.assert_called_once()
        mock_increment.assert_called_once_with(1)


# ---------------------------------------------------------------------------
# UA-03: User violations — warn, suspend, ban
# ---------------------------------------------------------------------------

class TestUserActions:
    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_warn_increments_violation_count(self, mock_create, mock_increment, mock_get_user):
        """Issuing a warning should add a violation record and increment count without suspending."""
        mock_get_user.return_value = {"id": 3, "status": "active", "email": "fundraiser@sim.com"}

        from app.services.moderation_service import ModerationService
        result = ModerationService.apply_user_action(3, "warn", "Misleading content", 4)

        mock_create.assert_called_once()
        mock_increment.assert_called_once_with(3)
        assert result["message"] == "User warn"

    @patch("app.repositories.user_repository.UserRepository.update_status")
    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_suspend_changes_user_status(self, mock_create, mock_increment, mock_get_user, mock_update_status):
        """Suspending a user should set their status to 'suspended'."""
        mock_get_user.return_value = {"id": 3, "status": "active"}
        mock_update_status.return_value = {"id": 3, "status": "suspended"}

        from app.services.moderation_service import ModerationService
        ModerationService.apply_user_action(3, "suspend", "Repeated violations", 4)

        mock_update_status.assert_called_once_with(3, "suspended")

    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    def test_invalid_action_raises_error(self, mock_get_user):
        """An unrecognised action should raise a 400 error."""
        from fastapi import HTTPException
        mock_get_user.return_value = {"id": 3, "status": "active"}

        from app.services.moderation_service import ModerationService
        with pytest.raises(HTTPException) as exc_info:
            ModerationService.apply_user_action(3, "delete", "test", 4)
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# PM-03: Report campaign → fundraiser gets violation when actioned
# ---------------------------------------------------------------------------

class TestReportCampaign:
    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.update_status")
    def test_actioning_report_adds_violation_to_fundraiser(
        self, mock_update, mock_get_report, mock_get_fra,
        mock_create_violation, mock_increment, mock_notify
    ):
        """When PM actions a report, the fundraiser should receive +1 violation."""
        mock_get_report.return_value = {
            "id": 1, "fra_id": 1, "reported_by": 1, "status": "pending"
        }
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update.return_value = {"id": 1, "status": "actioned"}

        from app.services.moderation_service import ModerationService
        ModerationService.action_report(1, "actioned", reviewed_by=5, fra_action="suspended")

        mock_create_violation.assert_called_once()
        mock_increment.assert_called_once_with(3)

    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.update_status")
    def test_dismissing_report_does_not_add_violation(
        self, mock_update, mock_get_report, mock_get_fra,
        mock_create_violation, mock_increment, mock_notify
    ):
        """Dismissing a report should NOT add a violation to the fundraiser."""
        mock_get_report.return_value = {
            "id": 1, "fra_id": 1, "reported_by": 1, "status": "pending"
        }
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update.return_value = {"id": 1, "status": "dismissed"}

        from app.services.moderation_service import ModerationService
        ModerationService.action_report(1, "dismissed", reviewed_by=5, fra_action=None)

        mock_create_violation.assert_not_called()
        mock_increment.assert_not_called()


# ---------------------------------------------------------------------------
# DN-02: Thank donors — sends notification to donor
# ---------------------------------------------------------------------------

class TestThankDonors:
    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.thank_you_repository.ThankYouRepository.save")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_thank_you_notifies_donor(self, mock_get_fra, mock_save, mock_notify):
        """Sending a thank you should create a notification for the donor."""
        mock_get_fra.return_value = make_fra()
        mock_save.return_value = {"id": 1, "message": "Thank you!"}

        from app.services.thank_you_service import ThankYouService
        ThankYouService.send_thank_you(
            fra_id=1, fund_raiser_id=2, donor_id=1, message="Thank you so much!"
        )

        mock_notify.assert_called_once()
        call_args = mock_notify.call_args[0]
        assert call_args[0] == 1
        assert "thank you" in call_args[1].lower()

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_thank_you_unauthorised_user_rejected(self, mock_get_fra):
        """A user who is neither the fundraiser nor the linked donee cannot send thank you."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra(fund_raiser_id=3, donee_id=2)

        from app.services.thank_you_service import ThankYouService
        with pytest.raises(HTTPException) as exc_info:
            ThankYouService.send_thank_you(
                fra_id=1, fund_raiser_id=99, donor_id=1, message="Thank you!"
            )
        assert exc_info.value.status_code == 403
