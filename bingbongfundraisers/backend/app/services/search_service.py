from app.repositories.fra_repository import FRARepository
from app.repositories.user_preference_repository import UserPreferenceRepository


class SearchService:
    # DN-01: Search FRA
    @staticmethod
    def search_fra(keyword: str = None, category_id: int = None, end_date: str = None):
        results = FRARepository.search(keyword, category_id, end_date)
        return {"count": len(results), "results": results}

    # DO-01: Search and Match to Interests
    @staticmethod
    def search_and_match(query: str = None, donor_id: int = None):
        results = FRARepository.search(keyword=query)

        if donor_id:
            prefs = UserPreferenceRepository.get_by_user(donor_id)
            if prefs and prefs.get("preferred_categories"):
                preferred_cats = prefs["preferred_categories"]
                preferred = [r for r in results if r["category_id"] in preferred_cats]
                others = [r for r in results if r["category_id"] not in preferred_cats]
                results = preferred + others

        return {"count": len(results), "results": results}

    # DO-02: Recommendations
    @staticmethod
    def get_recommendations(donor_id: int):
        prefs = UserPreferenceRepository.get_by_user(donor_id)
        recommended = []

        if prefs and prefs.get("preferred_categories"):
            for cat_id in prefs["preferred_categories"]:
                fras = FRARepository.get_by_category(cat_id, limit=5)
                recommended.extend(fras)

        seen_ids = {f["id"] for f in recommended}
        trending = FRARepository.get_trending(limit=10)
        for fra in trending:
            if fra["id"] not in seen_ids:
                recommended.append(fra)

        return {"donor_id": donor_id, "count": len(recommended), "recommendations": recommended}

    @staticmethod
    def get_trending():
        trending = FRARepository.get_trending(limit=10)
        return {"count": len(trending), "trending": trending}
