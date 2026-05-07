from app.services.category_service import CategoryService


class CategoryController:
    @staticmethod
    def get_all():
        return CategoryService.get_all()

    @staticmethod
    def add_category(name: str):
        return CategoryService.add_category(name)

    @staticmethod
    def edit_category(cat_id: int, name: str):
        return CategoryService.edit_category(cat_id, name)

    @staticmethod
    def delete_category(cat_id: int):
        return CategoryService.delete_category(cat_id)
