from app.config.db import get_db


class UserViolationRepository:
    @classmethod
    def create(cls, user_id: int, violation_type: str, description: str, actioned_by: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO user_violations (user_id, type, description, actioned_by) "
                "VALUES (%s, %s, %s, %s) RETURNING *",
                (user_id, violation_type, description, actioned_by),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_user(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM user_violations WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]
