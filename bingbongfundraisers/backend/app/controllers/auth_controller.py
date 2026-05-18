import hashlib

from fastapi import HTTPException

from app.config.db import get_db


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class AuthController:
    @staticmethod
    def login(email: str, password: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, email, user_type, full_name, status FROM users "
                "WHERE email = %s AND password_hash = %s",
                (email, _hash_password(password)),
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

    @staticmethod
    def register(email: str, password: str, full_name: str, phone, user_type: str):
        if user_type not in ("fund_raiser", "donor", "donee"):
            raise HTTPException(status_code=400, detail="user_type must be fund_raiser, donor, or donee")
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")
            cur.execute(
                "INSERT INTO users (email, password_hash, user_type, full_name, phone, status, violation_count) "
                "VALUES (%s, %s, %s, %s, %s, 'active', 0) RETURNING id, email, user_type, full_name",
                (email, _hash_password(password), user_type, full_name, phone),
            )
            user = cur.fetchone()
            return {
                "id": user["id"],
                "email": user["email"],
                "user_type": user["user_type"],
                "full_name": user["full_name"],
            }
