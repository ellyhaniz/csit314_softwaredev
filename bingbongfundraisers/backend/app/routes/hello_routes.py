from fastapi import APIRouter

from app.controllers.hello_controller import HelloController

router = APIRouter(tags=["hello"])


@router.get("/health")
def health_check():
    return HelloController.health()


@router.get("/api/health")
def health_check_api():
    return HelloController.health()


@router.get("/api/hello")
def get_hello_count():
    return HelloController.get_hello_count()


@router.post("/api/hello/click")
def click_hello():
    return HelloController.click_hello()
