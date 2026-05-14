from fastapi import HTTPException

from app.repositories.favourite_repository import FavouriteRepository
from app.repositories.fra_repository import FRARepository


class FavouriteService:
    # DN-03: Save FRA to Favourites
    @staticmethod
    def save_fra(user_id: int, fra_id: int):
        fra = FRARepository.get_by_id(fra_id)
        if not fra:
            raise HTTPException(status_code=404, detail="FRA not found")

        if FavouriteRepository.exists(user_id, fra_id):
            raise HTTPException(status_code=409, detail="FRA already in favourites")

        saved = FavouriteRepository.save(user_id, fra_id)
        FRARepository.increment_shortlist(fra_id)
        return {"message": "FRA saved to favourites", "favourite": saved}

    @staticmethod
    def get_favourites(user_id: int):
        return FavouriteRepository.get_by_user(user_id)
