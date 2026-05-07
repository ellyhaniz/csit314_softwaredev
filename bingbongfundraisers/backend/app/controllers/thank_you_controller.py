from app.services.thank_you_service import ThankYouService


class ThankDonorController:
    @staticmethod
    def get_donor_list(fra_id: int):
        return ThankYouService.get_donor_list(fra_id)

    @staticmethod
    def send_thank_you(fra_id: int, fund_raiser_id: int, donor_id: int, message: str):
        return ThankYouService.send_thank_you(fra_id, fund_raiser_id, donor_id, message)

    @staticmethod
    def get_thank_you_messages(fra_id: int):
        return ThankYouService.get_by_fra(fra_id)
