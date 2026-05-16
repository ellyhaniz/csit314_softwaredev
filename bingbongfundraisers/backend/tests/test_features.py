"""
Automated test cases covering all 18 user stories.
Run with: python -m pytest tests/test_features.py -v
"""

from unittest.mock import patch
import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_fra(fra_id=1, status="active", fund_raiser_id=3, donee_id=2,
             target=15000.0, current=3200.0):
    return {
        "id": fra_id,
        "title": "Help Sick Children",
        "status": status,
        "fund_raiser_id": fund_raiser_id,
        "donee_id": donee_id,
        "target_amount": target,
        "current_amount": current,
        "end_date": "2099-12-31",
        "view_count": 50,
        "impact_score": 0.0,
        "category_id": 1,
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
# FR-01: Create Fundraising Activity (FRA)
# ---------------------------------------------------------------------------

class TestCreateFRA:
    @patch("app.repositories.fra_repository.FRARepository.create")
    @patch("app.repositories.user_repository.UserRepository.get_by_email")
    def test_create_fra_links_donee_by_email(self, mock_get_email, mock_create):
        """Creating an FRA with a valid donee email should link the donee to the campaign."""
        mock_get_email.return_value = {"id": 2, "user_type": "donee", "email": "donee@sim.com"}
        mock_create.return_value = make_fra(donee_id=2)

        from app.services.fra_service import FRAService
        result = FRAService.create_fra({
            "title": "Help Sick Children",
            "target_amount": 15000.0,
            "end_date": "2099-12-31",
            "fund_raiser_id": 3,
            "category_id": 1,
            "donee_email": "donee@sim.com",
        })

        mock_create.assert_called_once()
        assert result["donee_id"] == 2

    @patch("app.repositories.user_repository.UserRepository.get_by_email")
    def test_create_fra_invalid_donee_email_rejected(self, mock_get_email):
        """Providing an email that belongs to a non-donee user should raise 400."""
        from fastapi import HTTPException
        mock_get_email.return_value = {"id": 5, "user_type": "donor", "email": "donor@sim.com"}

        from app.services.fra_service import FRAService
        with pytest.raises(HTTPException) as exc_info:
            FRAService.create_fra({
                "title": "Help Sick Children",
                "target_amount": 15000.0,
                "end_date": "2099-12-31",
                "fund_raiser_id": 3,
                "category_id": 1,
                "donee_email": "donor@sim.com",
            })
        assert exc_info.value.status_code == 400

    def test_create_fra_past_end_date_rejected(self):
        """An FRA with an end date in the past should raise 400."""
        from fastapi import HTTPException

        from app.services.fra_service import FRAService
        with pytest.raises(HTTPException) as exc_info:
            FRAService.create_fra({
                "title": "Old Campaign",
                "target_amount": 5000.0,
                "end_date": "2020-01-01",
                "fund_raiser_id": 3,
                "category_id": 1,
                "donee_email": None,
            })
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# FR-02: Auto-close expired campaigns
# ---------------------------------------------------------------------------

class TestExpiredCampaign:
    @patch("app.repositories.fra_repository.FRARepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.get_expired")
    def test_expired_campaigns_are_closed(self, mock_get_expired, mock_update_status):
        """check_and_close_expired should mark all past-end-date FRAs as expired."""
        mock_get_expired.return_value = [make_fra(fra_id=1), make_fra(fra_id=2)]
        mock_update_status.return_value = make_fra(status="expired")

        from app.services.fra_service import FRAService
        result = FRAService.check_and_close_expired()

        assert result["closed_count"] == 2
        assert mock_update_status.call_count == 2


# ---------------------------------------------------------------------------
# FR-03: Post campaign update
# ---------------------------------------------------------------------------

class TestPostCampaignUpdate:
    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.save")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_post_update_saves_content(self, mock_get_fra, mock_save, mock_calc_score):
        """A fundraiser posting an update should persist it to the campaign."""
        mock_get_fra.return_value = make_fra()
        mock_save.return_value = {"id": 1, "title": "Progress!", "content": "We hit 50%"}
        mock_calc_score.return_value = {"fra_id": 1, "impact_score": 0.1, "sufficient_data": True}

        from app.services.fra_service import FRAService
        result = FRAService.post_update(fra_id=1, title="Progress!", content="We hit 50%")

        mock_save.assert_called_once_with(1, "Progress!", "We hit 50%")
        mock_calc_score.assert_called_once_with(1)
        assert result["title"] == "Progress!"

    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.save")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_post_update_triggers_impact_score_recalculation(self, mock_get_fra, mock_save, mock_calc_score):
        """Posting a campaign update should trigger impact score recalculation."""
        mock_get_fra.return_value = make_fra()
        mock_save.return_value = {"id": 1, "title": "Milestone", "content": "Goal reached!"}
        mock_calc_score.return_value = {"fra_id": 1, "impact_score": 0.2, "sufficient_data": True}

        from app.services.fra_service import FRAService
        FRAService.post_update(fra_id=1, title="Milestone", content="Goal reached!")

        mock_calc_score.assert_called_once_with(1)

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_post_update_empty_content_rejected(self, mock_get_fra):
        """An update with empty content should raise 400."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra()

        from app.services.fra_service import FRAService
        with pytest.raises(HTTPException) as exc_info:
            FRAService.post_update(fra_id=1, title="Hello", content="   ")
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# PM-01: Generate platform activity report
# ---------------------------------------------------------------------------

class TestPlatformReport:
    @patch("app.repositories.platform_report_repository.PlatformReportRepository.create")
    @patch("app.repositories.user_repository.UserRepository.get_new_count")
    @patch("app.repositories.user_repository.UserRepository.get_active_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_total_donations")
    @patch("app.repositories.fra_repository.FRARepository.get_new_count")
    def test_generate_report_aggregates_data(
        self, mock_new_fras, mock_total_donations,
        mock_active_users, mock_new_users, mock_create
    ):
        """Generating a report should aggregate FRA, donation, and user stats."""
        mock_new_fras.return_value = 5
        mock_total_donations.return_value = 12000.0
        mock_active_users.return_value = 30
        mock_new_users.return_value = 8
        mock_create.return_value = {"id": 1, "new_fras": 5, "total_donations": 12000.0}

        from app.services.report_service import ReportService
        result = ReportService.generate_report("2026-01-01", "2026-01-31", generated_by=4)

        mock_create.assert_called_once()
        assert result["report"]["new_fras"] == 5

    def test_generate_report_invalid_date_range_rejected(self):
        """start_date after end_date should raise 400."""
        from fastapi import HTTPException

        from app.services.report_service import ReportService
        with pytest.raises(HTTPException) as exc_info:
            ReportService.generate_report("2026-05-31", "2026-01-01")
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# PM-02: Manage categories
# ---------------------------------------------------------------------------

class TestCategoryManagement:
    @patch("app.repositories.category_repository.CategoryRepository.create")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_slug")
    def test_add_new_category_succeeds(self, mock_get_slug, mock_create):
        """Adding a brand-new category should persist it."""
        mock_get_slug.return_value = None
        mock_create.return_value = {"id": 5, "name": "Environment"}

        from app.services.category_service import CategoryService
        result = CategoryService.add_category("Environment")

        mock_create.assert_called_once_with("Environment")
        assert result["category"]["name"] == "Environment"

    @patch("app.repositories.category_repository.CategoryRepository.get_by_slug")
    def test_add_duplicate_category_rejected(self, mock_get_slug):
        """Adding a category whose slug already exists should raise 409."""
        from fastapi import HTTPException
        mock_get_slug.return_value = {"id": 1, "name": "Health"}

        from app.services.category_service import CategoryService
        with pytest.raises(HTTPException) as exc_info:
            CategoryService.add_category("Health")
        assert exc_info.value.status_code == 409

    @patch("app.repositories.category_repository.CategoryRepository.is_in_use")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_id")
    def test_delete_category_in_use_rejected(self, mock_get_by_id, mock_in_use):
        """Deleting a category that is still assigned to active FRAs should raise 409."""
        from fastapi import HTTPException
        mock_get_by_id.return_value = {"id": 1, "name": "Health"}
        mock_in_use.return_value = True

        from app.services.category_service import CategoryService
        with pytest.raises(HTTPException) as exc_info:
            CategoryService.delete_category(1)
        assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# PM-03: Report campaign → fundraiser gets violation when actioned
# ---------------------------------------------------------------------------

class TestReportCampaign:
    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.fra_repository.FRARepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.update_status")
    def test_actioning_report_adds_violation_to_fundraiser(
        self, mock_update_report, mock_get_report, mock_get_fra, mock_update_fra,
        mock_create_violation, mock_increment, mock_notify
    ):
        """When PM actions a report, the fundraiser should receive +1 violation."""
        mock_get_report.return_value = {"id": 1, "fra_id": 1, "reported_by": 1, "status": "pending"}
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update_report.return_value = {"id": 1, "status": "actioned"}
        mock_update_fra.return_value = make_fra(status="suspended")

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
        mock_get_report.return_value = {"id": 1, "fra_id": 1, "reported_by": 1, "status": "pending"}
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update.return_value = {"id": 1, "status": "dismissed"}

        from app.services.moderation_service import ModerationService
        ModerationService.action_report(1, "dismissed", reviewed_by=5, fra_action=None)

        mock_create_violation.assert_not_called()
        mock_increment.assert_not_called()


# ---------------------------------------------------------------------------
# DN-01: Browse / search campaigns
# ---------------------------------------------------------------------------

class TestBrowseCampaigns:
    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_search_returns_matching_campaigns(self, mock_search):
        """Searching with a keyword should return all matching active campaigns."""
        mock_search.return_value = [make_fra(fra_id=1), make_fra(fra_id=2)]

        from app.services.search_service import SearchService
        result = SearchService.search_fra(keyword="children")

        mock_search.assert_called_once_with("children", None, None)
        assert result["count"] == 2


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
        ThankYouService.send_thank_you(fra_id=1, fund_raiser_id=2, donor_id=1, message="Thank you so much!")

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
            ThankYouService.send_thank_you(fra_id=1, fund_raiser_id=99, donor_id=1, message="Thank you!")
        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# DN-03: Save campaign to favourites
# ---------------------------------------------------------------------------

class TestFavourites:
    @patch("app.repositories.fra_repository.FRARepository.increment_shortlist")
    @patch("app.repositories.favourite_repository.FavouriteRepository.save")
    @patch("app.repositories.favourite_repository.FavouriteRepository.exists")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_save_new_favourite_succeeds(self, mock_get_fra, mock_exists, mock_save, mock_inc):
        """A donor saving a campaign to favourites should persist the record."""
        mock_get_fra.return_value = make_fra()
        mock_exists.return_value = False
        mock_save.return_value = {"id": 1, "user_id": 1, "fra_id": 1}

        from app.services.favourite_service import FavouriteService
        result = FavouriteService.save_fra(user_id=1, fra_id=1)

        mock_save.assert_called_once_with(1, 1)
        assert result["message"] == "FRA saved to favourites"

    @patch("app.repositories.favourite_repository.FavouriteRepository.exists")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_duplicate_favourite_rejected(self, mock_get_fra, mock_exists):
        """Saving the same campaign twice should raise 409."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra()
        mock_exists.return_value = True

        from app.services.favourite_service import FavouriteService
        with pytest.raises(HTTPException) as exc_info:
            FavouriteService.save_fra(user_id=1, fra_id=1)
        assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# DO-01: Search and match to donor interests
# ---------------------------------------------------------------------------

class TestSearchMatch:
    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_preferred_categories_ranked_first(self, mock_search, mock_prefs):
        """Campaigns matching the donor's preferred categories should appear before others."""
        mock_search.return_value = [
            {**make_fra(fra_id=1), "category_id": 2},
            {**make_fra(fra_id=2), "category_id": 1},
        ]
        mock_prefs.return_value = {"preferred_categories": [1]}

        from app.services.search_service import SearchService
        result = SearchService.search_and_match(query="help", donor_id=1)

        assert result["results"][0]["id"] == 2


# ---------------------------------------------------------------------------
# DO-02: Personalised recommendations
# ---------------------------------------------------------------------------

class TestRecommendations:
    @patch("app.repositories.fra_repository.FRARepository.get_trending")
    @patch("app.repositories.fra_repository.FRARepository.get_by_category")
    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    def test_recommendations_include_preferred_categories(self, mock_prefs, mock_by_cat, mock_trending):
        """Recommendations should prioritise campaigns in the donor's preferred categories."""
        mock_prefs.return_value = {"preferred_categories": [1]}
        mock_by_cat.return_value = [make_fra(fra_id=10)]
        mock_trending.return_value = [make_fra(fra_id=20)]

        from app.services.search_service import SearchService
        result = SearchService.get_recommendations(donor_id=1)

        ids = [r["id"] for r in result["recommendations"]]
        assert 10 in ids
        assert result["count"] >= 1


# ---------------------------------------------------------------------------
# DO-04: Make a donation
# ---------------------------------------------------------------------------

class TestDonation:
    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_normal_donation_is_completed(self, mock_create, mock_update, mock_get_fra, mock_calc_score):
        """Donation below S$5,000 threshold should have status 'completed'."""
        mock_get_fra.return_value = make_fra()
        mock_create.return_value = make_donation(amount=100.0, status="completed")
        mock_calc_score.return_value = {"fra_id": 1, "impact_score": 0.15, "sufficient_data": True}

        from app.services.donation_service import DonationService
        result = DonationService.create_donation({
            "fra_id": 1, "donor_id": 1, "amount": 100.0,
            "message": None, "is_anonymous": False,
        })

        assert result["flagged"] is False
        assert result["donation"]["status"] == "completed"
        mock_update.assert_called_once_with(1, 100.0)
        mock_calc_score.assert_called_once_with(1)

    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_donation_triggers_impact_score_recalculation(self, mock_create, mock_update, mock_get_fra, mock_calc_score):
        """A completed donation should trigger impact score recalculation."""
        mock_get_fra.return_value = make_fra()
        mock_create.return_value = make_donation(amount=100.0, status="completed")
        mock_calc_score.return_value = {"fra_id": 1, "impact_score": 0.15, "sufficient_data": True}

        from app.services.donation_service import DonationService
        DonationService.create_donation({
            "fra_id": 1, "donor_id": 1, "amount": 100.0,
            "message": None, "is_anonymous": False,
        })

        mock_calc_score.assert_called_once_with(1)

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
# DO-09: Impact score
# ---------------------------------------------------------------------------

class TestImpactScore:
    @patch("app.repositories.fra_repository.FRARepository.update_impact_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.get_count_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_impact_score_calculated_from_donations_and_views(
        self, mock_get_fra, mock_donation_count, mock_update_count, mock_update_score
    ):
        """Impact score should be computed from funding %, donor count, views, and updates."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=5000.0)
        mock_donation_count.return_value = 10
        mock_update_count.return_value = 3
        mock_update_score.return_value = make_fra()

        from app.services.fra_service import FRAService
        result = FRAService.calculate_and_update_score(fra_id=1)

        # funding=1.0 (50% funded * 2.0) + donors=1.0 (10/10) + views=0.5 (50/100) + updates=0.5 (3/5 capped)
        assert result["sufficient_data"] is True
        assert result["impact_score"] == 3.0


# ---------------------------------------------------------------------------
# DO-10: Progress bar / campaign progress data
# ---------------------------------------------------------------------------

class TestProgressData:
    @patch("app.repositories.donation_repository.DonationRepository.get_recent_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_progress_percentage_is_calculated(self, mock_get_fra, mock_count, mock_recent):
        """Progress data should correctly compute the funding percentage."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=5000.0)
        mock_count.return_value = 20
        mock_recent.return_value = []

        from app.services.fra_service import FRAService
        result = FRAService.get_progress_data(fra_id=1)

        assert result["percentage"] == 50.0
        assert result["donor_count"] == 20


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

    @patch("app.repositories.user_repository.UserRepository.update_status")
    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_ban_changes_user_status_to_banned(self, mock_create, mock_increment, mock_get_user, mock_update_status):
        """Banning a user should set their status to 'banned'."""
        mock_get_user.return_value = {"id": 3, "status": "active"}
        mock_update_status.return_value = {"id": 3, "status": "banned"}

        from app.services.moderation_service import ModerationService
        ModerationService.apply_user_action(3, "ban", "Fraud", 4)

        mock_update_status.assert_called_once_with(3, "banned")

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
# UA-07: Detect unusual donation spikes
# ---------------------------------------------------------------------------

class TestSpikeDetection:
    @patch("app.repositories.fra_repository.FRARepository.set_spike_flagged")
    @patch("app.repositories.donation_repository.DonationRepository.get_hourly_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_active_fra_ids")
    def test_spike_flagged_when_hourly_count_exceeds_threshold(
        self, mock_active_ids, mock_hourly_count, mock_set_spike
    ):
        """A campaign receiving >= 5 donations in an hour should be spike-flagged."""
        mock_active_ids.return_value = [1]
        mock_hourly_count.return_value = 7
        mock_set_spike.return_value = make_fra()

        from app.services.moderation_service import ModerationService
        result = ModerationService.monitor_donations()

        mock_set_spike.assert_called_once_with(1, True)
        assert result["spikes_detected"] == 1

    @patch("app.repositories.fra_repository.FRARepository.set_spike_flagged")
    @patch("app.repositories.donation_repository.DonationRepository.get_hourly_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_active_fra_ids")
    def test_no_spike_below_threshold(
        self, mock_active_ids, mock_hourly_count, mock_set_spike
    ):
        """A campaign with fewer than 5 donations per hour should not be flagged."""
        mock_active_ids.return_value = [1]
        mock_hourly_count.return_value = 3

        from app.services.moderation_service import ModerationService
        result = ModerationService.monitor_donations()

        mock_set_spike.assert_not_called()
        assert result["spikes_detected"] == 0
