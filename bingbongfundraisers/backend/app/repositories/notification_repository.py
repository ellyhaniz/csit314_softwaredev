from app.config.db import get_db


class NotificationRepository:
    @classmethod
    def create(cls, user_id: int, message: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO notifications (user_id, message) VALUES (%s, %s) RETURNING *",
                (user_id, message),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_by_user(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def mark_all_read(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
                (user_id,),
            )
