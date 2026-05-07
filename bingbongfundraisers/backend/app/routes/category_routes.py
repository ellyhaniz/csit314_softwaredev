from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.category_controller import CategoryController

router = APIRouter(prefix="/api/categories", tags=["Categories"])


class CategoryRequest(BaseModel):
    name: str


# PM-02: Manage Categories
@router.get("", summary="PM-02: List All Categories")
def get_categories():
    return CategoryController.get_all()


@router.post("", summary="PM-02: Add Category")
def add_category(body: CategoryRequest):
    return CategoryController.add_category(body.name)


@router.put("/{cat_id}", summary="PM-02: Edit Category")
def edit_category(cat_id: int, body: CategoryRequest):
    return CategoryController.edit_category(cat_id, body.name)


@router.delete("/{cat_id}", summary="PM-02: Delete Category")
def delete_category(cat_id: int):
    return CategoryController.delete_category(cat_id)
