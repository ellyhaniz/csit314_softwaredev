from app.config.db import get_db

VIOLATION_FLAG_THRESHOLD = 3


class UserRepository:
    @classmethod
    def get_by_id(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def update_status(cls, user_id: int, status: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET status = %s, updated_at = NOW() "
                "WHERE id = %s RETURNING *",
                (status, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_flagged_users(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM users WHERE violation_count >= %s AND status = 'active' "
                "ORDER BY violation_count DESC",
                (VIOLATION_FLAG_THRESHOLD,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def increment_violation_count(cls, user_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET violation_count = violation_count + 1, updated_at = NOW() "
                "WHERE id = %s RETURNING violation_count",
                (user_id,),
            )
            row = cur.fetchone()
            return row["violation_count"] if row else None

    @classmethod
    def get_active_count(cls, period: str):
        with get_db() as conn:
            cur = conn.cursor()
            intervals = {"daily": "1 day", "weekly": "7 days", "monthly": "30 days"}
            interval = intervals.get(period, "30 days")
            cur.execute(
                f"SELECT COUNT(DISTINCT donor_id) AS count FROM donations "
                f"WHERE created_at >= NOW() - INTERVAL '{interval}'"
            )
            return cur.fetchone()["count"]

    @classmethod
    def get_new_count(cls, period: str):
        with get_db() as conn:
            cur = conn.cursor()
            intervals = {"daily": "1 day", "weekly": "7 days", "monthly": "30 days"}
            interval = intervals.get(period, "30 days")
            cur.execute(
                f"SELECT COUNT(*) AS count FROM users "
                f"WHERE created_at >= NOW() - INTERVAL '{interval}'"
            )
            return cur.fetchone()["count"]
