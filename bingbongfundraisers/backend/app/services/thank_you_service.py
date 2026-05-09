from fastapi import HTTPException

from app.repositories.donation_repository import DonationRepository
from app.repositories.fra_repository import FRARepository
from app.repositories.thank_you_repository import ThankYouRepository


class ThankYouService:
    # DN-02: Thank Donors
    @staticmethod
    def get_donor_list(fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")
        donors = DonationRepository.get_unique_donors_by_fra(fra_id)
        return {"fra_id": fra_id, "donor_count": len(donors), "donors": donors}

    @staticmethod
    def send_thank_you(fra_id: int, fund_raiser_id: int, donor_id: int, message: str):
        if not message or len(message.strip()) < 5:
            raise HTTPException(status_code=400, detail="Message must be at least 5 characters")
        if len(message) > 1000:
            raise HTTPException(status_code=400, detail="Message must be under 1000 characters")

        saved = ThankYouRepository.save(fra_id, fund_raiser_id, donor_id, message)
        return {"message": "Thank you message sent", "thank_you": saved}

    @staticmethod
    def get_by_fra(fra_id: int):
        messages = ThankYouRepository.get_by_fra(fra_id)
        return {"fra_id": fra_id, "count": len(messages), "messages": messages}
