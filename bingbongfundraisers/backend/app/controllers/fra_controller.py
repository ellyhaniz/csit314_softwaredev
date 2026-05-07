from app.services.fra_service import FRAService


class CreateFRAController:
    @staticmethod
    def create_fra(data: dict):
        return FRAService.create_fra(data)

    @staticmethod
    def get_fra_detail(fra_id: int):
        return FRAService.get_fra_detail(fra_id)


class EndDateController:
    @staticmethod
    def check_expired_fras():
        return FRAService.check_and_close_expired()


class PostUpdateController:
    @staticmethod
    def post_update(fra_id: int, title: str, content: str):
        return FRAService.post_update(fra_id, title, content)

    @staticmethod
    def get_update_history(fra_id: int):
        return FRAService.get_updates(fra_id)


class ImpactScoreController:
    @staticmethod
    def get_impact_score(fra_id: int):
        return FRAService.get_impact_score(fra_id)

    @staticmethod
    def update_score(fra_id: int):
        return FRAService.calculate_and_update_score(fra_id)


class ProgressController:
    @staticmethod
    def get_progress_data(fra_id: int):
        return FRAService.get_progress_data(fra_id)
