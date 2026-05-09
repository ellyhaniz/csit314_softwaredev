from app.services.favourite_service import FavouriteService

class FavouritesController:
    @staticmethod
    def save_fra(user_id: int, fra_id: int):
        return FavouriteService.save_fra(user_id, fra_id)

    @staticmethod
    def get_favourites_list(user_id: int):
        return FavouriteService.get_favourites(user_id)
