from typing import Optional

from fastapi import APIRouter, Query

from app.controllers.search_controller import (
    RecommendationController,
    SearchFRAController,
    SearchMatchController,
)

router = APIRouter(prefix="/api", tags=["Search & Discovery"])


# DN-01: Search FRA
@router.get("/search", summary="DN-01: Search Fund Raising Activities")
def search_fra(
    keyword: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    end_date: Optional[str] = Query(None),
):
    return SearchFRAController.search_fra(keyword, category_id, end_date)


# DO-01: Search with preference matching
@router.get("/search/match", summary="DO-01: Search and Match to Interests")
def search_match(
    query: Optional[str] = Query(None),
    donor_id: Optional[int] = Query(None),
):
    return SearchMatchController.search_campaigns(query, donor_id)


# DO-02: Recommendations
@router.get("/recommendations/trending", summary="DO-02: Get Trending Campaigns")
def get_trending():
    return RecommendationController.get_trending()


@router.get("/recommendations/{donor_id}", summary="DO-02: Get Personalised Recommendations")
def get_recommendations(donor_id: int):
    return RecommendationController.get_recommendations(donor_id)
