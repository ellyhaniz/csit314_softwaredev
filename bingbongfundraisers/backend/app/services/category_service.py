from fastapi import HTTPException

from app.repositories.category_repository import CategoryRepository


class CategoryService:
    # PM-02: Manage Categories
    @staticmethod
    def get_all():
        return {"categories": CategoryRepository.get_all()}

    @staticmethod
    def add_category(name: str):
        if not name or len(name.strip()) == 0:
            raise HTTPException(status_code=400, detail="Category name is required")
        existing = CategoryRepository.get_by_slug(
            name.lower().replace(" ", "-").replace("&", "and")
        )
        if existing:
            raise HTTPException(status_code=409, detail="Category already exists")
        created = CategoryRepository.create(name.strip())
        return {"message": "Category created", "category": created}

    @staticmethod
    def edit_category(cat_id: int, name: str):
        existing = CategoryRepository.get_by_id(cat_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        if not name or len(name.strip()) == 0:
            raise HTTPException(status_code=400, detail="Category name is required")
        updated = CategoryRepository.update(cat_id, name.strip())
        return {"message": "Category updated", "category": updated}

    @staticmethod
    def delete_category(cat_id: int):
        existing = CategoryRepository.get_by_id(cat_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        if CategoryRepository.is_in_use(cat_id):
            raise HTTPException(
                status_code=409, detail="Cannot delete category — it is assigned to active FRAs"
            )
        CategoryRepository.delete(cat_id)
        return {"message": "Category deleted"}
