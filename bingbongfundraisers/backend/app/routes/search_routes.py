from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.controllers.search_controller import (
    RecommendationController,
    SearchFRAController,
    SearchMatchController,
)
from app.repositories.user_preference_repository import UserPreferenceRepository

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


# DO-02: Preferences
class PreferencesRequest(BaseModel):
    preferred_categories: List[int]


@router.get("/preferences/{user_id}", summary="Get user category preferences")
def get_preferences(user_id: int):
    prefs = UserPreferenceRepository.get_by_user(user_id)
    return {"preferred_categories": prefs["preferred_categories"] if prefs else []}


@router.put("/preferences/{user_id}", summary="Save user category preferences")
def save_preferences(user_id: int, body: PreferencesRequest):
    saved = UserPreferenceRepository.upsert(user_id, body.preferred_categories)
    return {"message": "Preferences saved", "preferred_categories": saved["preferred_categories"]}
