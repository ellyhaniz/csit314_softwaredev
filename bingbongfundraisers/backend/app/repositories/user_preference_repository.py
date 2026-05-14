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

    @classmethod
    def upsert(cls, user_id: int, preferred_categories: list):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO user_preferences (user_id, preferred_categories)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE
                  SET preferred_categories = EXCLUDED.preferred_categories,
                      updated_at = NOW()
                RETURNING *
                """,
                (user_id, preferred_categories),
            )
            return dict(cur.fetchone())
