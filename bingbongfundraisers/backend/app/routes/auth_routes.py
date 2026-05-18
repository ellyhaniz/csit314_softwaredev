from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.auth_controller import AuthController

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str | None = None
    user_type: str = "donor"


@router.post("/login")
def login(request: LoginRequest):
    return AuthController.login(request.email, request.password)


@router.post("/register")
def register(request: RegisterRequest):
    return AuthController.register(
        request.email, request.password,
        request.full_name, request.phone, request.user_type,
    )
