from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.moderation_controller import (
    DonationFlagController,
    ModerationController,
    ReportedCampaignController,
    SpikeDetectionController,
)

router = APIRouter(prefix="/api/moderation", tags=["Moderation"])


class CreateReportRequest(BaseModel):
    fra_id: int
    reported_by: int
    reason: str


class ActionReportRequest(BaseModel):
    action: str
    reviewed_by: int
    fra_action: Optional[str] = None


class UserActionRequest(BaseModel):
    action: str
    reason: str
    actioned_by: int


class DonationReviewRequest(BaseModel):
    decision: str


class CheckThresholdRequest(BaseModel):
    donation_id: int
    amount: float


# PM-03: Reported Campaigns
@router.post("/reported", summary="PM-03: Submit Campaign Report")
def create_report(body: CreateReportRequest):
    return ReportedCampaignController.create_report(body.fra_id, body.reported_by, body.reason)


@router.get("/reported", summary="PM-03: Get Reported Campaigns")
def get_reported_campaigns():
    return ReportedCampaignController.get_reported_campaigns()


@router.get("/reported/fra/{fra_id}", summary="PM-03: Get Campaign Detail with Reports")
def get_campaign_detail(fra_id: int):
    return ReportedCampaignController.get_campaign_detail(fra_id)


@router.post("/reported/{report_id}/action", summary="PM-03: Action on Report")
def action_report(report_id: int, body: ActionReportRequest):
    return ReportedCampaignController.action_report(
        report_id, body.action, body.reviewed_by, body.fra_action
    )


# UA-03: Flag Violations
@router.get("/users/flagged", summary="UA-03: Get Flagged Users")
def get_flagged_users():
    return ModerationController.get_flagged_users()


@router.get("/users/{user_id}/violations", summary="UA-03: Get Violation History")
def get_violation_history(user_id: int):
    return ModerationController.get_violation_history(user_id)


@router.post("/users/{user_id}/action", summary="UA-03: Apply Action on User")
def apply_user_action(user_id: int, body: UserActionRequest):
    return ModerationController.apply_action(
        user_id, body.action, body.reason, body.actioned_by
    )


# UA-05: Flag Donations
@router.get("/donations/flagged", summary="UA-05: Get Flagged Donations")
def get_flagged_donations():
    return DonationFlagController.get_flagged_donations()


@router.post("/donations/check-threshold", summary="UA-05: Check and Flag Donation")
def check_threshold(body: CheckThresholdRequest):
    return DonationFlagController.check_threshold(body.donation_id, body.amount)


@router.post("/donations/{donation_id}/review", summary="UA-05: Approve or Reject Donation")
def review_donation(donation_id: int, body: DonationReviewRequest):
    return DonationFlagController.approve_reject(donation_id, body.decision)


# UA-07: Detect Spikes
@router.post("/spikes/monitor", summary="UA-07: Run Spike Detection")
def monitor_donations():
    return SpikeDetectionController.monitor_donations()


@router.get("/spikes", summary="UA-07: Get Spike Alerts")
def get_spike_alerts():
    return SpikeDetectionController.get_spike_alerts()


@router.get("/spikes/{fra_id}", summary="UA-07: Get Spike Detail")
def get_spike_detail(fra_id: int):
    return SpikeDetectionController.get_spike_detail(fra_id)


@router.post("/spikes/{fra_id}/dismiss", summary="UA-07: Dismiss Spike Flag")
def dismiss_spike(fra_id: int):
    return SpikeDetectionController.dismiss_spike(fra_id)
