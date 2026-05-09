from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.favourite_controller import FavouritesController

router = APIRouter(prefix="/api/favourites", tags=["Favourites"])


class SaveFavouriteRequest(BaseModel):
    user_id: int
    fra_id: int


# DN-03: Save to Favourites
@router.post("", summary="DN-03: Save FRA to Favourites")
def save_favourite(body: SaveFavouriteRequest):
    return FavouritesController.save_fra(body.user_id, body.fra_id)


@router.get("/{user_id}", summary="DN-03: Get User Favourites")
def get_favourites(user_id: int):
    return FavouritesController.get_favourites_list(user_id)
