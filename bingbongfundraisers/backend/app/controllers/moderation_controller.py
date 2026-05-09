from app.services.moderation_service import ModerationService


class ReportedCampaignController:
    @staticmethod
    def get_reported_campaigns():
        return ModerationService.get_reported_campaigns()

    @staticmethod
    def get_campaign_detail(fra_id: int):
        return ModerationService.get_campaign_detail(fra_id)

    @staticmethod
    def action_report(report_id: int, action: str, reviewed_by: int, fra_action: str = None):
        return ModerationService.action_report(report_id, action, reviewed_by, fra_action)


class ModerationController:
    @staticmethod
    def get_flagged_users():
        return ModerationService.get_flagged_users()

    @staticmethod
    def get_violation_history(user_id: int):
        return ModerationService.get_violation_history(user_id)

    @staticmethod
    def apply_action(user_id: int, action: str, reason: str, actioned_by: int):
        return ModerationService.apply_user_action(user_id, action, reason, actioned_by)


class DonationFlagController:
    @staticmethod
    def get_flagged_donations():
        return ModerationService.get_flagged_donations()

    @staticmethod
    def check_threshold(donation_id: int, amount: float):
        return ModerationService.check_and_flag_donation(donation_id, amount)

    @staticmethod
    def approve_reject(donation_id: int, decision: str):
        return ModerationService.review_donation(donation_id, decision)


class SpikeDetectionController:
    @staticmethod
    def monitor_donations():
        return ModerationService.monitor_donations()

    @staticmethod
    def get_spike_alerts():
        return ModerationService.get_spike_alerts()

    @staticmethod
    def get_spike_detail(fra_id: int):
        return ModerationService.get_spike_detail(fra_id)

    @staticmethod
    def dismiss_spike(fra_id: int):
        return ModerationService.dismiss_spike(fra_id)
