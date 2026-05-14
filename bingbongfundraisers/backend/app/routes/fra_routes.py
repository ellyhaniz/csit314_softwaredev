from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.fra_controller import (
    CreateFRAController,
    EndDateController,
    ImpactScoreController,
    PostUpdateController,
    ProgressController,
)

router = APIRouter(prefix="/api/fra", tags=["Fund Raising Activities"])


class CreateFRARequest(BaseModel):
    fund_raiser_id: int
    category_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    target_amount: float
    end_date: str
    location_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    donee_email: Optional[str] = None


class PostUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: str


# FR-01: Create FRA
@router.post("", summary="FR-01: Create Fund Raising Activity")
def create_fra(body: CreateFRARequest):
    return CreateFRAController.create_fra(body.model_dump())


# FR: Get all FRAs belonging to a fundraiser (must be before /{fra_id})
@router.get("/fundraiser/{fund_raiser_id}", summary="FR: Get FRAs by Fundraiser")
def get_by_fundraiser(fund_raiser_id: int):
    return CreateFRAController.get_by_fund_raiser(fund_raiser_id)


# DN-01 / DO-01: Get FRA detail
@router.get("/{fra_id}", summary="DN-01: Get FRA Detail")
def get_fra_detail(fra_id: int):
    return CreateFRAController.get_fra_detail(fra_id)


# FR-02: Auto-close expired FRAs
@router.post("/check-expired", summary="FR-02: Auto-Close Expired FRAs")
def check_expired():
    return EndDateController.check_expired_fras()


# FR-03: Post campaign update
@router.post("/{fra_id}/updates", summary="FR-03: Post Campaign Update")
def post_update(fra_id: int, body: PostUpdateRequest):
    return PostUpdateController.post_update(fra_id, body.title, body.content)


@router.get("/{fra_id}/updates", summary="FR-03: Get Campaign Updates")
def get_updates(fra_id: int):
    return PostUpdateController.get_update_history(fra_id)


# DO-09: Impact Score
@router.get("/{fra_id}/impact", summary="DO-09: Get Impact Score")
def get_impact_score(fra_id: int):
    return ImpactScoreController.get_impact_score(fra_id)


@router.post("/{fra_id}/impact/update", summary="DO-09: Recalculate Impact Score")
def update_impact_score(fra_id: int):
    return ImpactScoreController.update_score(fra_id)


# DO-10: Progress Bar
@router.get("/{fra_id}/progress", summary="DO-10: Get Progress Bar Data")
def get_progress(fra_id: int):
    return ProgressController.get_progress_data(fra_id)
