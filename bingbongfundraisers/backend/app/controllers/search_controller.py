from app.services.search_service import SearchService


class SearchFRAController:
    @staticmethod
    def search_fra(keyword: str = None, category_id: int = None, end_date: str = None):
        return SearchService.search_fra(keyword, category_id, end_date)


class SearchMatchController:
    @staticmethod
    def search_campaigns(query: str = None, donor_id: int = None):
        return SearchService.search_and_match(query, donor_id)


class RecommendationController:
    @staticmethod
    def get_recommendations(donor_id: int):
        return SearchService.get_recommendations(donor_id)

    @staticmethod
    def get_trending():
        return SearchService.get_trending()
