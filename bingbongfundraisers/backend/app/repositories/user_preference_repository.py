from app.config.db import get_db


class UserPreferenceRepository:
    @classmethod
    def get_by_user(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM user_preferences WHERE user_id = %s", (user_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None
