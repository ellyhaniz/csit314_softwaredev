from app.config.db import get_db


class FavouriteRepository:
    @classmethod
    def save(cls, user_id: int, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO favorites (user_id, fra_id) VALUES (%s, %s) "
                "ON CONFLICT (user_id, fra_id) DO NOTHING RETURNING *",
                (user_id, fra_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_by_user(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT f.id, f.created_at, fra.*
                FROM favorites f
                JOIN fund_raising_activities fra ON fra.id = f.fra_id
                WHERE f.user_id = %s
                ORDER BY f.created_at DESC
                """,
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def exists(cls, user_id: int, fra_id: int) -> bool:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM favorites WHERE user_id = %s AND fra_id = %s",
                (user_id, fra_id),
            )
            return cur.fetchone() is not None
