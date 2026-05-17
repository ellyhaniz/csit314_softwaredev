"""
Test cases aligned to Use Case Descriptions.
Each class = one use case. Each method = one flow:
  test_NF__*        Normal Flow
  test_AF{n}{x}__*  Alternative / Exceptional Flow
  test_PRE__*       Pre-condition enforcement
"""

from unittest.mock import patch, call
import pytest


# ---------------------------------------------------------------------------
# Shared helpers
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


# ===========================================================================
# FR-01: Create Fund Raising Activity
# ===========================================================================

class TestFR01_CreateFRA:
    """Use Case: Fund Raiser creates a new FRA with title, description,
    target amount, category, and end date."""

    @patch("app.repositories.fra_repository.FRARepository.create")
    @patch("app.repositories.user_repository.UserRepository.get_by_email")
    def test_NF__valid_fields_with_donee_email__fra_created_and_donee_linked(
        self, mock_get_email, mock_create
    ):
        """Normal Flow: All valid fields submitted -> FRA saved with donee linked."""
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

    def test_AF3A__zero_target_amount__raises_400(self):
        """Alt Flow 3a: Required field invalid (zero target amount) -> system raises 400."""
        from fastapi import HTTPException
        from app.services.fra_service import FRAService

        with pytest.raises(HTTPException) as exc_info:
            FRAService.create_fra({
                "title": "Bad Campaign",
                "target_amount": 0,
                "end_date": "2099-12-31",
                "fund_raiser_id": 3,
                "category_id": 1,
                "donee_email": None,
            })
        assert exc_info.value.status_code == 400

    def test_AF3B__past_end_date__raises_400(self):
        """Alt Flow 3b: End date in the past -> system rejects with 400."""
        from fastapi import HTTPException
        from app.services.fra_service import FRAService

        with pytest.raises(HTTPException) as exc_info:
            FRAService.create_fra({
                "title": "Expired Campaign",
                "target_amount": 5000.0,
                "end_date": "2020-01-01",
                "fund_raiser_id": 3,
                "category_id": 1,
                "donee_email": None,
            })
        assert exc_info.value.status_code == 400


# ===========================================================================
# FR-02: Set Campaign End Date and Auto-Close
# ===========================================================================

class TestFR02_AutoCloseExpiredCampaigns:
    """Use Case: System scheduler closes all FRAs whose end date has passed."""

    @patch("app.repositories.fra_repository.FRARepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.get_expired")
    def test_NF__expired_fras_found__all_closed_and_count_returned(
        self, mock_get_expired, mock_update_status
    ):
        """Normal Flow: Scheduler finds expired FRAs -> each is closed and
        closed_count matches the number of FRAs processed."""
        mock_get_expired.return_value = [make_fra(fra_id=1), make_fra(fra_id=2)]
        mock_update_status.return_value = make_fra(status="expired")

        from app.services.fra_service import FRAService
        result = FRAService.check_and_close_expired()

        assert result["closed_count"] == 2
        assert mock_update_status.call_count == 2

    @patch("app.repositories.fra_repository.FRARepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.get_expired")
    def test_AF2A__no_expired_fras__no_status_updates_performed(
        self, mock_get_expired, mock_update_status
    ):
        """Alt Flow 2a: No campaigns have expired -> system takes no action
        and closed_count is 0."""
        mock_get_expired.return_value = []

        from app.services.fra_service import FRAService
        result = FRAService.check_and_close_expired()

        assert result["closed_count"] == 0
        mock_update_status.assert_not_called()


# ===========================================================================
# FR-03: Post Campaign Updates
# ===========================================================================

class TestFR03_PostCampaignUpdate:
    """Use Case: Fund Raiser posts a titled update to their active campaign."""

    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.save")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_NF__valid_update__saved_and_impact_score_recalculated(
        self, mock_get_fra, mock_save, mock_calc_score
    ):
        """Normal Flow: Valid title and content -> update saved AND impact score
        recalculated (wiring: post_update must trigger score update)."""
        mock_get_fra.return_value = make_fra()
        mock_save.return_value = {"id": 1, "title": "Milestone reached", "content": "We hit 50%!"}
        mock_calc_score.return_value = {"fra_id": 1, "impact_score": 0.2, "sufficient_data": True}

        from app.services.fra_service import FRAService
        result = FRAService.post_update(fra_id=1, title="Milestone reached", content="We hit 50%!")

        mock_save.assert_called_once_with(1, "Milestone reached", "We hit 50%!")
        mock_calc_score.assert_called_once_with(1)
        assert result["title"] == "Milestone reached"

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF4A__empty_content__raises_400(self, mock_get_fra):
        """Alt Flow 4a: Update content is empty/blank -> system displays
        validation error and rejects with 400."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra()

        from app.services.fra_service import FRAService
        with pytest.raises(HTTPException) as exc_info:
            FRAService.post_update(fra_id=1, title="Hello", content="   ")
        assert exc_info.value.status_code == 400

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF2A__fra_not_found__raises_404(self, mock_get_fra):
        """Alt Flow 2a: Fund Raiser has no matching active FRA ->
        system raises 404."""
        from fastapi import HTTPException
        mock_get_fra.return_value = None

        from app.services.fra_service import FRAService
        with pytest.raises(HTTPException) as exc_info:
            FRAService.post_update(fra_id=999, title="Ghost Update", content="Nothing here")
        assert exc_info.value.status_code == 404


# ===========================================================================
# PM-01: Generate Platform Activity Report
# ===========================================================================

class TestPM01_GeneratePlatformReport:
    """Use Case: Platform Management generates a daily/weekly/monthly
    report of new FRAs, total donations, and active users."""

    @patch("app.repositories.platform_report_repository.PlatformReportRepository.create")
    @patch("app.repositories.user_repository.UserRepository.get_new_count")
    @patch("app.repositories.user_repository.UserRepository.get_active_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_total_donations")
    @patch("app.repositories.fra_repository.FRARepository.get_new_count")
    def test_NF__valid_date_range__aggregates_all_stats_and_saves_report(
        self, mock_new_fras, mock_total_donations,
        mock_active_users, mock_new_users, mock_create
    ):
        """Normal Flow: Valid date range -> system retrieves FRA count, donation
        total, and active user count, then saves the report (wiring: all four
        data sources must be queried and report must be persisted)."""
        mock_new_fras.return_value = 5
        mock_total_donations.return_value = 12000.0
        mock_active_users.return_value = 30
        mock_new_users.return_value = 8
        mock_create.return_value = {
            "id": 1, "new_fras": 5, "total_donations": 12000.0,
            "active_users": 30, "new_users": 8,
        }

        from app.services.report_service import ReportService
        result = ReportService.generate_report("2026-01-01", "2026-01-31", generated_by=4)

        mock_new_fras.assert_called_once()
        mock_total_donations.assert_called_once()
        mock_active_users.assert_called_once()
        mock_create.assert_called_once()
        assert result["report"]["new_fras"] == 5
        assert result["report"]["total_donations"] == 12000.0
        assert result["report"]["active_users"] == 30

    def test_AF3A__end_date_before_start_date__raises_400(self):
        """Alt Flow 3a: Date range is invalid (end before start) ->
        system rejects with 400."""
        from fastapi import HTTPException
        from app.services.report_service import ReportService

        with pytest.raises(HTTPException) as exc_info:
            ReportService.generate_report("2026-05-31", "2026-01-01")
        assert exc_info.value.status_code == 400

    @patch("app.repositories.platform_report_repository.PlatformReportRepository.create")
    @patch("app.repositories.user_repository.UserRepository.get_new_count")
    @patch("app.repositories.user_repository.UserRepository.get_active_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_total_donations")
    @patch("app.repositories.fra_repository.FRARepository.get_new_count")
    def test_AF4A__no_data_in_period__report_saved_with_zero_values(
        self, mock_new_fras, mock_total_donations,
        mock_active_users, mock_new_users, mock_create
    ):
        """Alt Flow 4a: No platform activity in the selected period ->
        report is still generated and saved with all-zero values."""
        mock_new_fras.return_value = 0
        mock_total_donations.return_value = 0.0
        mock_active_users.return_value = 0
        mock_new_users.return_value = 0
        mock_create.return_value = {
            "id": 2, "new_fras": 0, "total_donations": 0.0,
            "active_users": 0, "new_users": 0,
        }

        from app.services.report_service import ReportService
        result = ReportService.generate_report("2020-01-01", "2020-01-31")

        mock_create.assert_called_once()
        assert result["report"]["new_fras"] == 0
        assert result["report"]["total_donations"] == 0.0


# ===========================================================================
# PM-02: Manage FRA Categories
# ===========================================================================

class TestPM02_ManageFRACategories:
    """Use Case: Platform Management adds, edits, and deletes FRA categories."""

    @patch("app.repositories.category_repository.CategoryRepository.create")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_slug")
    def test_NF_ADD__unique_name__category_created(self, mock_get_slug, mock_create):
        """Normal Flow (Add): New unique category name -> saved and returned."""
        mock_get_slug.return_value = None
        mock_create.return_value = {"id": 5, "name": "Environment"}

        from app.services.category_service import CategoryService
        result = CategoryService.add_category("Environment")

        mock_create.assert_called_once_with("Environment")
        assert result["category"]["name"] == "Environment"

    @patch("app.repositories.category_repository.CategoryRepository.get_by_slug")
    def test_AF5A__duplicate_category_name__raises_409(self, mock_get_slug):
        """Alt Flow 5a: Category name already exists ->
        system rejects with 409 Conflict."""
        from fastapi import HTTPException
        mock_get_slug.return_value = {"id": 1, "name": "Health"}

        from app.services.category_service import CategoryService
        with pytest.raises(HTTPException) as exc_info:
            CategoryService.add_category("Health")
        assert exc_info.value.status_code == 409

    @patch("app.repositories.category_repository.CategoryRepository.update")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_id")
    def test_NF_EDIT__existing_category__name_updated(self, mock_get_by_id, mock_update):
        """Normal Flow (Edit): Existing category -> name updated and saved."""
        mock_get_by_id.return_value = {"id": 1, "name": "Medical"}
        mock_update.return_value = {"id": 1, "name": "Healthcare"}

        from app.services.category_service import CategoryService
        result = CategoryService.edit_category(1, "Healthcare")

        mock_update.assert_called_once_with(1, "Healthcare")
        assert result["category"]["name"] == "Healthcare"

    @patch("app.repositories.category_repository.CategoryRepository.delete")
    @patch("app.repositories.category_repository.CategoryRepository.is_in_use")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_id")
    def test_NF_DELETE__category_not_in_use__deleted_successfully(
        self, mock_get_by_id, mock_in_use, mock_delete
    ):
        """Normal Flow (Delete): Category not assigned to any FRA -> deleted."""
        mock_get_by_id.return_value = {"id": 2, "name": "Unused"}
        mock_in_use.return_value = False
        mock_delete.return_value = True

        from app.services.category_service import CategoryService
        result = CategoryService.delete_category(2)

        mock_delete.assert_called_once_with(2)
        assert result["message"] == "Category deleted"

    @patch("app.repositories.category_repository.CategoryRepository.is_in_use")
    @patch("app.repositories.category_repository.CategoryRepository.get_by_id")
    def test_AF3A__category_in_use__delete_raises_409(self, mock_get_by_id, mock_in_use):
        """Alt Flow 3a: Category is still assigned to active FRAs ->
        system warns and rejects delete with 409."""
        from fastapi import HTTPException
        mock_get_by_id.return_value = {"id": 1, "name": "Medical"}
        mock_in_use.return_value = True

        from app.services.category_service import CategoryService
        with pytest.raises(HTTPException) as exc_info:
            CategoryService.delete_category(1)
        assert exc_info.value.status_code == 409


# ===========================================================================
# PM-03: View Reported Campaigns
# ===========================================================================

class TestPM03_ViewReportedCampaigns:
    """Use Case: Platform Management reviews reported campaigns and
    decides to dismiss, warn, suspend, or remove."""

    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_all")
    def test_NF_LIST__reports_exist__returns_all_reports_with_count(self, mock_get_all):
        """Normal Flow (step 2): System retrieves and displays all reported
        campaigns with reporter, reason, and date."""
        mock_get_all.return_value = [
            {"id": 1, "fra_id": 1, "reported_by": 5, "reason": "Fake campaign"},
            {"id": 2, "fra_id": 2, "reported_by": 6, "reason": "Misleading"},
        ]

        from app.services.moderation_service import ModerationService
        result = ModerationService.get_reported_campaigns()

        assert result["count"] == 2
        assert len(result["reports"]) == 2

    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.fra_repository.FRARepository.update_status")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.update_status")
    def test_NF_ACTION__report_actioned__fundraiser_gets_violation_and_reporter_notified(
        self, mock_update_report, mock_get_report, mock_get_fra,
        mock_update_fra, mock_create_violation, mock_increment, mock_notify
    ):
        """Normal Flow (steps 4–6): Admin actions a report -> fundraiser
        receives a violation record AND reporter is notified of outcome
        (wiring: both side-effects must fire)."""
        mock_get_report.return_value = {"id": 1, "fra_id": 1, "reported_by": 5, "status": "pending"}
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update_report.return_value = {"id": 1, "status": "actioned"}
        mock_update_fra.return_value = make_fra(status="suspended")

        from app.services.moderation_service import ModerationService
        ModerationService.action_report(1, "actioned", reviewed_by=4, fra_action="suspended")

        mock_create_violation.assert_called_once()
        mock_increment.assert_called_once_with(3)
        mock_notify.assert_called_once()

    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_by_id")
    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.update_status")
    def test_NF_DISMISS__report_dismissed__no_violation_but_reporter_still_notified(
        self, mock_update_report, mock_get_report, mock_get_fra,
        mock_create_violation, mock_notify
    ):
        """Normal Flow (dismiss path): Admin dismisses report -> NO violation
        added to fundraiser, but reporter IS still notified of outcome
        (wiring: notification must fire even on dismiss)."""
        mock_get_report.return_value = {"id": 1, "fra_id": 1, "reported_by": 5, "status": "pending"}
        mock_get_fra.return_value = make_fra(fund_raiser_id=3)
        mock_update_report.return_value = {"id": 1, "status": "dismissed"}

        from app.services.moderation_service import ModerationService
        ModerationService.action_report(1, "dismissed", reviewed_by=4, fra_action=None)

        mock_create_violation.assert_not_called()
        mock_notify.assert_called_once()

    @patch("app.repositories.reported_campaign_repository.ReportedCampaignRepository.get_all")
    def test_AF2A__no_pending_reports__returns_empty_list_with_zero_count(self, mock_get_all):
        """Alt Flow 2a: No campaigns have been reported ->
        system returns empty list and count of 0."""
        mock_get_all.return_value = []

        from app.services.moderation_service import ModerationService
        result = ModerationService.get_reported_campaigns()

        assert result["count"] == 0
        assert result["reports"] == []


# ===========================================================================
# DN-01: Search for Fund Raising Activities
# ===========================================================================

class TestDN01_SearchFRA:
    """Use Case: Donee searches for FRAs by keyword, category, or date range."""

    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_NF__keyword_search__returns_matching_active_campaigns(self, mock_search):
        """Normal Flow (steps 3–4): Donee submits keyword -> system returns
        all matching active FRAs."""
        mock_search.return_value = [make_fra(fra_id=1), make_fra(fra_id=2)]

        from app.services.search_service import SearchService
        result = SearchService.search_fra(keyword="children")

        mock_search.assert_called_once_with("children", None, None)
        assert result["count"] == 2

    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_AF2A__no_input_submitted__all_active_campaigns_returned(self, mock_search):
        """Alt Flow 2a: Donee submits search with no input ->
        system returns all active FRAs."""
        mock_search.return_value = [make_fra(fra_id=1), make_fra(fra_id=2), make_fra(fra_id=3)]

        from app.services.search_service import SearchService
        result = SearchService.search_fra()

        mock_search.assert_called_once_with(None, None, None)
        assert result["count"] == 3

    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_AF4A__no_matching_fras__empty_results_returned(self, mock_search):
        """Alt Flow 4a: No FRAs match the search criteria ->
        system returns empty results list with count of 0."""
        mock_search.return_value = []

        from app.services.search_service import SearchService
        result = SearchService.search_fra(keyword="zzzznonexistent")

        assert result["count"] == 0
        assert result["results"] == []


# ===========================================================================
# DN-02: Thank Donors Through Platform
# ===========================================================================

class TestDN02_ThankDonors:
    """Use Case: Donee sends a personalised thank-you message to a donor."""

    @patch("app.repositories.notification_repository.NotificationRepository.create")
    @patch("app.repositories.thank_you_repository.ThankYouRepository.save")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_NF__valid_message__saved_and_donor_notified(
        self, mock_get_fra, mock_save, mock_notify  
    ):
        """Normal Flow (steps 4–5): Donee types valid message and sends ->
        message is saved AND donor receives a notification
        (wiring: both save and notify must fire)."""
        mock_get_fra.return_value = make_fra(fund_raiser_id=2)
        mock_save.return_value = {"id": 1, "message": "Thank you so much!"}

        from app.services.thank_you_service import ThankYouService
        ThankYouService.send_thank_you(
            fra_id=1, fund_raiser_id=2, donor_id=1, message="Thank you so much!"
        )

        mock_save.assert_called_once()
        mock_notify.assert_called_once()
        notified_user_id = mock_notify.call_args[0][0]
        assert notified_user_id == 1

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF4A__message_too_short__raises_400(self, mock_get_fra):
        """Alt Flow 4a: Message field is empty or under minimum length ->
        system displays validation error and raises 400."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra(fund_raiser_id=2)

        from app.services.thank_you_service import ThankYouService
        with pytest.raises(HTTPException) as exc_info:
            ThankYouService.send_thank_you(fra_id=1, fund_raiser_id=2, donor_id=1, message="Hi")
        assert exc_info.value.status_code == 400

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_PRE__unauthorised_sender__raises_403(self, mock_get_fra):
        """Pre-condition: Only the linked fundraiser or donee may send thank you ->
        any other user is rejected with 403."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra(fund_raiser_id=3, donee_id=2)

        from app.services.thank_you_service import ThankYouService
        with pytest.raises(HTTPException) as exc_info:
            ThankYouService.send_thank_you(
                fra_id=1, fund_raiser_id=99, donor_id=1, message="Thank you!"
            )
        assert exc_info.value.status_code == 403


# ===========================================================================
# DN-03: Save FRA to Favourites
# ===========================================================================

class TestDN03_SaveToFavourites:
    """Use Case: Donee saves a Fund Raising Activity to their favourites list."""

    @patch("app.repositories.fra_repository.FRARepository.increment_shortlist")
    @patch("app.repositories.favourite_repository.FavouriteRepository.save")
    @patch("app.repositories.favourite_repository.FavouriteRepository.exists")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_NF__new_favourite__saved_and_campaign_shortlist_incremented(
        self, mock_get_fra, mock_exists, mock_save, mock_inc
    ):
        """Normal Flow (steps 4–5): FRA not yet in favourites -> record saved
        AND campaign shortlist count incremented
        (wiring: both save and increment must fire)."""
        mock_get_fra.return_value = make_fra()
        mock_exists.return_value = False
        mock_save.return_value = {"id": 1, "user_id": 1, "fra_id": 1}

        from app.services.favourite_service import FavouriteService
        result = FavouriteService.save_fra(user_id=1, fra_id=1)

        mock_save.assert_called_once_with(1, 1)
        mock_inc.assert_called_once_with(1)
        assert result["message"] == "FRA saved to favourites"

    @patch("app.repositories.favourite_repository.FavouriteRepository.exists")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF_A__already_in_favourites__raises_409(self, mock_get_fra, mock_exists):
        """Alt Flow a: FRA is already in the Donee's favourites ->
        system displays 'Already in Favourites' and raises 409."""
        from fastapi import HTTPException
        mock_get_fra.return_value = make_fra()
        mock_exists.return_value = True

        from app.services.favourite_service import FavouriteService
        with pytest.raises(HTTPException) as exc_info:
            FavouriteService.save_fra(user_id=1, fra_id=1)
        assert exc_info.value.status_code == 409

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_PRE__fra_not_found__raises_404(self, mock_get_fra):
        """Pre-condition: FRA must exist and be active ->
        unknown FRA raises 404."""
        from fastapi import HTTPException
        mock_get_fra.return_value = None

        from app.services.favourite_service import FavouriteService
        with pytest.raises(HTTPException) as exc_info:
            FavouriteService.save_fra(user_id=1, fra_id=999)
        assert exc_info.value.status_code == 404


# ===========================================================================
# DO-01: Search and Match Fundraising Campaigns
# ===========================================================================

class TestDO01_SearchAndMatchCampaigns:
    """Use Case: Donor searches campaigns and results are ranked by relevance
    to their preferences."""

    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_NF__search_with_donor_preferences__preferred_categories_ranked_first(
        self, mock_search, mock_prefs
    ):
        """Normal Flow (steps 3–4): Donor searches with filters and has saved
        preferences -> results re-ranked so preferred-category campaigns appear
        before others (wiring: preferences must be fetched and applied)."""
        mock_search.return_value = [
            {**make_fra(fra_id=1), "category_id": 2},
            {**make_fra(fra_id=2), "category_id": 1},
        ]
        mock_prefs.return_value = {"preferred_categories": [1]}

        from app.services.search_service import SearchService
        result = SearchService.search_and_match(query="help", donor_id=1)

        mock_prefs.assert_called_once_with(1)
        assert result["results"][0]["id"] == 2

    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_AF2A__no_filters_applied__all_campaigns_returned_without_reranking(
        self, mock_search, mock_prefs
    ):
        """Alt Flow 2a: No filters or donor id provided -> system returns all
        active campaigns without preference reranking."""
        mock_search.return_value = [make_fra(fra_id=1), make_fra(fra_id=2)]

        from app.services.search_service import SearchService
        result = SearchService.search_and_match(query=None, donor_id=None)

        mock_prefs.assert_not_called()
        assert result["count"] == 2

    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    @patch("app.repositories.fra_repository.FRARepository.search")
    def test_AF3A__no_matching_campaigns__empty_results(self, mock_search, mock_prefs):
        """Alt Flow 3a: No campaigns match the search criteria ->
        system returns empty results."""
        mock_search.return_value = []
        mock_prefs.return_value = {"preferred_categories": [1]}

        from app.services.search_service import SearchService
        result = SearchService.search_and_match(query="nonexistent", donor_id=1)

        assert result["count"] == 0
        assert result["results"] == []


# ===========================================================================
# DO-02: Receive Personalised Campaign Recommendations
# ===========================================================================

class TestDO02_PersonalisedRecommendations:
    """Use Case: System generates personalised campaign recommendations
    based on donor preferences and past activity."""

    @patch("app.repositories.fra_repository.FRARepository.get_trending")
    @patch("app.repositories.fra_repository.FRARepository.get_by_category")
    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    def test_NF__donor_has_preferences__preferred_campaigns_in_recommendations(
        self, mock_prefs, mock_by_cat, mock_trending
    ):
        """Normal Flow (steps 2–4): Donor has saved preferences -> recommendations
        include campaigns from preferred categories first, then trending
        (wiring: both category lookup and trending must be queried)."""
        mock_prefs.return_value = {"preferred_categories": [1]}
        mock_by_cat.return_value = [make_fra(fra_id=10)]
        mock_trending.return_value = [make_fra(fra_id=20)]

        from app.services.search_service import SearchService
        result = SearchService.get_recommendations(donor_id=1)

        mock_by_cat.assert_called_once()
        mock_trending.assert_called_once()
        ids = [r["id"] for r in result["recommendations"]]
        assert 10 in ids
        assert 20 in ids

    @patch("app.repositories.fra_repository.FRARepository.get_trending")
    @patch("app.repositories.fra_repository.FRARepository.get_by_category")
    @patch("app.repositories.user_preference_repository.UserPreferenceRepository.get_by_user")
    def test_AF2A__no_preferences_set__only_trending_campaigns_returned(
        self, mock_prefs, mock_by_cat, mock_trending
    ):
        """Alt Flow 2a: Donor has no prior preferences -> system skips category
        lookup and returns trending campaigns only
        (wiring: get_by_category must NOT be called)."""
        mock_prefs.return_value = None
        mock_trending.return_value = [make_fra(fra_id=20), make_fra(fra_id=21)]

        from app.services.search_service import SearchService
        result = SearchService.get_recommendations(donor_id=1)

        mock_by_cat.assert_not_called()
        ids = [r["id"] for r in result["recommendations"]]
        assert 20 in ids


# ===========================================================================
# DO-09: View Campaign Impact Score
# ===========================================================================

class TestDO09_CampaignImpactScore:
    """Use Case: Donor views an impact score calculated from donation volume,
    number of updates, and engagement metrics."""

    @patch("app.repositories.fra_repository.FRARepository.update_impact_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.get_count_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_NF__campaign_with_activity_data__score_calculated_from_all_factors(
        self, mock_get_fra, mock_donation_count, mock_update_count, mock_update_score
    ):
        """Normal Flow (step 2): Campaign has donations, updates, and views ->
        score computed from all four factors and persisted
        (wiring: score must be saved back to the FRA)."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=5000.0)
        mock_donation_count.return_value = 10
        mock_update_count.return_value = 3
        mock_update_score.return_value = make_fra()

        from app.services.fra_service import FRAService
        result = FRAService.calculate_and_update_score(fra_id=1)

        mock_update_score.assert_called_once()
        assert result["sufficient_data"] is True
        assert result["impact_score"] == 3.0

    @patch("app.repositories.fra_repository.FRARepository.update_impact_score")
    @patch("app.repositories.campaign_update_repository.CampaignUpdateRepository.get_count_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF2A__no_activity_data__score_not_available(
        self, mock_get_fra, mock_donation_count, mock_update_count, mock_update_score
    ):
        """Alt Flow 2a: Insufficient data (no donations, no views, no updates) ->
        system returns sufficient_data=False and does NOT save a score."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=0.0)
        mock_get_fra.return_value["view_count"] = 0
        mock_donation_count.return_value = 0
        mock_update_count.return_value = 0

        from app.services.fra_service import FRAService
        result = FRAService.calculate_and_update_score(fra_id=1)

        mock_update_score.assert_not_called()
        assert result["sufficient_data"] is False
        assert result["impact_score"] == 0.0


# ===========================================================================
# DO-10: View Real-Time Progress Bar and Analytics
# ===========================================================================

class TestDO10_RealtimeProgressBar:
    """Use Case: Donor views a real-time progress bar showing percentage
    funded, donor count, and days remaining."""

    @patch("app.repositories.donation_repository.DonationRepository.get_recent_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_NF__partial_funding__correct_percentage_and_goal_not_reached(
        self, mock_get_fra, mock_count, mock_recent
    ):
        """Normal Flow (steps 3–5): Campaign is 50% funded -> progress bar
        shows 50.0% and goal_reached is False."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=5000.0)
        mock_count.return_value = 20
        mock_recent.return_value = []

        from app.services.fra_service import FRAService
        result = FRAService.get_progress_data(fra_id=1)

        assert result["percentage"] == 50.0
        assert result["donor_count"] == 20
        assert result["goal_reached"] is False

    @patch("app.repositories.donation_repository.DonationRepository.get_recent_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF2A__no_donations_yet__zero_percent_progress(
        self, mock_get_fra, mock_count, mock_recent
    ):
        """Alt Flow 2a: No donations have been made ->
        system shows 0% progress bar."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=0.0)
        mock_count.return_value = 0
        mock_recent.return_value = []

        from app.services.fra_service import FRAService
        result = FRAService.get_progress_data(fra_id=1)

        assert result["percentage"] == 0.0
        assert result["donor_count"] == 0
        assert result["goal_reached"] is False

    @patch("app.repositories.donation_repository.DonationRepository.get_recent_by_fra")
    @patch("app.repositories.donation_repository.DonationRepository.get_count_by_fra")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_AF4A__campaign_fully_funded__goal_reached_indicator_shown(
        self, mock_get_fra, mock_count, mock_recent
    ):
        """Alt Flow 4a: Campaign has reached or exceeded its goal ->
        system sets goal_reached=True."""
        mock_get_fra.return_value = make_fra(target=10000.0, current=10000.0)
        mock_count.return_value = 100
        mock_recent.return_value = []

        from app.services.fra_service import FRAService
        result = FRAService.get_progress_data(fra_id=1)

        assert result["percentage"] == 100.0
        assert result["goal_reached"] is True


# ===========================================================================
# UA-03: Highlight Users with Repeated Violations
# ===========================================================================

class TestUA03_HighlightRepeatedViolations:
    """Use Case: User Admin warns, suspends, or bans users who have exceeded
    the violation threshold."""

    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_NF_WARN__user_warned__violation_recorded_and_count_incremented(
        self, mock_create, mock_increment, mock_get_user
    ):
        """Normal Flow (Warn): Admin issues a warning -> violation record created
        and count incremented, account status NOT changed
        (wiring: create and increment must fire; update_status must NOT)."""
        mock_get_user.return_value = {"id": 3, "status": "active", "email": "user@sim.com"}

        from app.services.moderation_service import ModerationService
        result = ModerationService.apply_user_action(3, "warn", "Misleading content", 4)

        mock_create.assert_called_once()
        mock_increment.assert_called_once_with(3)
        assert result["message"] == "User warn"

    @patch("app.repositories.user_repository.UserRepository.update_status")
    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_NF_SUSPEND__user_suspended__violation_recorded_and_status_set(
        self, mock_create, mock_increment, mock_get_user, mock_update_status
    ):
        """Normal Flow (Suspend): Admin suspends user -> violation recorded,
        count incremented, AND account status set to 'suspended'
        (wiring: all three side-effects must fire)."""
        mock_get_user.return_value = {"id": 3, "status": "active"}
        mock_update_status.return_value = {"id": 3, "status": "suspended"}

        from app.services.moderation_service import ModerationService
        ModerationService.apply_user_action(3, "suspend", "Repeated violations", 4)

        mock_create.assert_called_once()
        mock_increment.assert_called_once_with(3)
        mock_update_status.assert_called_once_with(3, "suspended")

    @patch("app.repositories.user_repository.UserRepository.update_status")
    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    def test_NF_BAN__user_banned__violation_recorded_and_status_set(
        self, mock_create, mock_increment, mock_get_user, mock_update_status
    ):
        """Normal Flow (Ban): Admin bans user -> violation recorded,
        count incremented, AND account status set to 'banned'
        (wiring: all three side-effects must fire)."""
        mock_get_user.return_value = {"id": 3, "status": "active"}
        mock_update_status.return_value = {"id": 3, "status": "banned"}

        from app.services.moderation_service import ModerationService
        ModerationService.apply_user_action(3, "ban", "Fraud", 4)

        mock_create.assert_called_once()
        mock_increment.assert_called_once_with(3)
        mock_update_status.assert_called_once_with(3, "banned")

    @patch("app.repositories.user_repository.UserRepository.get_by_id")
    def test_EF__invalid_action_type__raises_400(self, mock_get_user):
        """Exceptional Flow: An unrecognised action is submitted ->
        system rejects with 400."""
        from fastapi import HTTPException
        mock_get_user.return_value = {"id": 3, "status": "active"}

        from app.services.moderation_service import ModerationService
        with pytest.raises(HTTPException) as exc_info:
            ModerationService.apply_user_action(3, "delete", "test", 4)
        assert exc_info.value.status_code == 400


# ===========================================================================
# UA-05: Flag Donations Exceeding Threshold
# ===========================================================================

class TestUA05_FlagHighValueDonations:
    """Use Case: System auto-flags donations >= S$5,000 for admin review.
    Admin can approve or reject after verification."""

    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_NF__donation_at_threshold__flagged_and_not_added_to_campaign_total(
        self, mock_create, mock_update_amount, mock_get_fra
    ):
        """Normal Flow (steps 2–3): Donation >= S$5,000 -> status set to
        'flagged' and campaign total NOT updated
        (wiring: update_current_amount must NOT be called when flagged)."""
        mock_get_fra.return_value = make_fra()
        mock_create.return_value = make_donation(amount=7000.0, status="flagged")

        from app.services.donation_service import DonationService
        result = DonationService.create_donation({
            "fra_id": 1, "donor_id": 1, "amount": 7000.0,
            "message": None, "is_anonymous": False,
        })

        assert result["flagged"] is True
        assert result["donation"]["status"] == "flagged"
        mock_update_amount.assert_not_called()

    @patch("app.services.fra_service.FRAService.calculate_and_update_score")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.create")
    def test_AF2A__donation_below_threshold__completed_total_updated_and_score_recalculated(
        self, mock_create, mock_update_amount, mock_get_fra, mock_calc_score
    ):
        """Alt Flow 2a: Donation < S$5,000 -> status 'completed', amount added to
        campaign total, and impact score recalculated
        (wiring: update_amount AND score recalculation must both fire)."""
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
        mock_update_amount.assert_called_once_with(1, 100.0)
        mock_calc_score.assert_called_once_with(1)

    @patch("app.repositories.fra_repository.FRARepository.update_current_amount")
    @patch("app.repositories.donation_repository.DonationRepository.update_status")
    def test_NF_APPROVE__admin_approves_flagged_donation__status_completed_and_total_updated(
        self, mock_update_status, mock_update_amount
    ):
        """Normal Flow (step 6 – approve): Admin approves flagged donation ->
        status set to 'completed' AND amount added to campaign total
        (wiring: both status update and amount update must fire)."""
        mock_update_status.return_value = make_donation(
            donation_id=1, fra_id=1, donor_id=1, amount=7000.0, status="completed"
        )

        from app.services.moderation_service import ModerationService
        result = ModerationService.review_donation(1, "approve")

        mock_update_status.assert_called_once_with(1, "completed")
        mock_update_amount.assert_called_once_with(1, 7000.0)
        assert result["donation"]["status"] == "completed"

    @patch("app.repositories.user_repository.UserRepository.increment_violation_count")
    @patch("app.repositories.user_violation_repository.UserViolationRepository.create")
    @patch("app.repositories.donation_repository.DonationRepository.update_status")
    def test_NF_REJECT__admin_rejects_flagged_donation__refunded_and_donor_violation_added(
        self, mock_update_status, mock_create_violation, mock_increment
    ):
        """Normal Flow (step 6 – reject): Admin rejects flagged donation ->
        status set to 'refunded' AND violation record added to donor's account
        (wiring: violation create and increment must both fire)."""
        mock_update_status.return_value = make_donation(
            donation_id=1, fra_id=1, donor_id=1, amount=7000.0, status="refunded"
        )

        from app.services.moderation_service import ModerationService
        ModerationService.review_donation(1, "reject")

        mock_update_status.assert_called_once_with(1, "refunded")
        mock_create_violation.assert_called_once()
        mock_increment.assert_called_once_with(1)


# ===========================================================================
# UA-07: Detect Unusual Donation Spikes
# ===========================================================================

class TestUA07_DetectDonationSpikes:
    """Use Case: System continuously monitors donation activity and alerts
    the User Admin when unusual spikes are detected."""

    @patch("app.repositories.fra_repository.FRARepository.set_spike_flagged")
    @patch("app.repositories.donation_repository.DonationRepository.get_hourly_count")
    @patch("app.repositories.donation_repository.DonationRepository.get_active_fra_ids")
    def test_NF__hourly_count_meets_threshold__campaign_spike_flagged(
        self, mock_active_ids, mock_hourly_count, mock_set_spike
    ):
        """Normal Flow (steps 2–3): Campaign receives >= 5 donations per hour ->
        system flags it as a spike and alert is recorded
        (wiring: set_spike_flagged must be called with True)."""
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
    def test_AF2A__hourly_count_below_threshold__no_spike_flagged(
        self, mock_active_ids, mock_hourly_count, mock_set_spike
    ):
        """Alt Flow 2a: Donation rate is within normal variance ->
        system does NOT flag the campaign."""
        mock_active_ids.return_value = [1]
        mock_hourly_count.return_value = 3

        from app.services.moderation_service import ModerationService
        result = ModerationService.monitor_donations()

        mock_set_spike.assert_not_called()
        assert result["spikes_detected"] == 0

    @patch("app.repositories.fra_repository.FRARepository.set_spike_flagged")
    @patch("app.repositories.fra_repository.FRARepository.get_by_id")
    def test_DISMISS__admin_marks_spike_as_legitimate__flag_removed(
        self, mock_get_fra, mock_set_spike
    ):
        """Alt Flow 2a (dismiss path): Admin reviews and marks activity as
        legitimate -> spike flag is removed from the campaign."""
        mock_get_fra.return_value = make_fra()
        mock_set_spike.return_value = {**make_fra(), "spike_flagged": False}

        from app.services.moderation_service import ModerationService
        result = ModerationService.dismiss_spike(fra_id=1)

        mock_set_spike.assert_called_once_with(1, False)
        assert result["message"] == "Spike flag dismissed"
