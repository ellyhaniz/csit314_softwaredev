import hashlib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config.db import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, email, user_type, full_name, status FROM users "
            "WHERE email = %s AND password_hash = %s",
            (request.email, hash_password(request.password)),
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if user["status"] in ("suspended", "banned"):
            raise HTTPException(status_code=403, detail="Account suspended or banned")
        return {
            "id": user["id"],
            "email": user["email"],
            "user_type": user["user_type"],
            "full_name": user["full_name"],
        }


@router.post("/register")
def register(request: RegisterRequest):
    if request.user_type not in ("fund_raiser", "donor", "donee"):
        raise HTTPException(status_code=400, detail="user_type must be fund_raiser, donor, or donee")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (request.email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")
        cur.execute(
            "INSERT INTO users (email, password_hash, user_type, full_name, phone, status, violation_count) "
            "VALUES (%s, %s, %s, %s, %s, 'active', 0) RETURNING id, email, user_type, full_name",
            (
                request.email,
                hash_password(request.password),
                request.user_type,
                request.full_name,
                request.phone,
            ),
        )
        user = cur.fetchone()
        return {
            "id": user["id"],
            "email": user["email"],
            "user_type": user["user_type"],
            "full_name": user["full_name"],
        }
