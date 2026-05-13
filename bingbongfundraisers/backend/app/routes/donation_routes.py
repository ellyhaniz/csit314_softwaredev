from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.repositories.donation_repository import DonationRepository
from app.repositories.fra_repository import FRARepository

router = APIRouter(prefix="/api/donations", tags=["donations"])


class DonationRequest(BaseModel):
    fra_id: int
    donor_id: int
    amount: float
    message: str | None = None
    is_anonymous: bool = False


@router.post("")
def create_donation(request: DonationRequest):
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    fra = FRARepository.get_by_id(request.fra_id)
    if not fra:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if fra["status"] != "active":
        raise HTTPException(status_code=400, detail="Campaign is no longer accepting donations")

    status = "flagged" if request.amount >= DonationRepository.FLAG_THRESHOLD else "completed"

    donation = DonationRepository.create({
        "fra_id": request.fra_id,
        "donor_id": request.donor_id,
        "amount": request.amount,
        "message": request.message,
        "is_anonymous": request.is_anonymous,
        "status": status,
    })

    if status == "completed":
        FRARepository.update_current_amount(request.fra_id, request.amount)

    return {
        "message": "Donation successful",
        "donation": donation,
        "flagged": status == "flagged",
    }
