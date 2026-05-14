from fastapi import APIRouter
from pydantic import BaseModel

from app.services.donation_service import DonationService

router = APIRouter(prefix="/api/donations", tags=["donations"])


class DonationRequest(BaseModel):
    fra_id: int
    donor_id: int
    amount: float
    message: str | None = None
    is_anonymous: bool = False


@router.post("")
def create_donation(request: DonationRequest):
    return DonationService.create_donation(request.model_dump())
