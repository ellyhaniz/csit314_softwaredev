from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.thank_you_controller import ThankDonorController

router = APIRouter(prefix="/api/thank-you", tags=["Thank You Messages"])


class ThankYouRequest(BaseModel):
    fra_id: int
    fund_raiser_id: int
    donor_id: int
    message: str


# DN-02: Thank Donors
@router.get("/donors/{fra_id}", summary="DN-02: Get Donor List for FRA")
def get_donor_list(fra_id: int):
    return ThankDonorController.get_donor_list(fra_id)


@router.post("", summary="DN-02: Send Thank You Message")
def send_thank_you(body: ThankYouRequest):
    return ThankDonorController.send_thank_you(
        body.fra_id, body.fund_raiser_id, body.donor_id, body.message
    )


@router.get("/{fra_id}", summary="DN-02: Get Thank You Messages for FRA")
def get_messages(fra_id: int):
    return ThankDonorController.get_thank_you_messages(fra_id)
