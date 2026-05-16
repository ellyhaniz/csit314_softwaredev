from datetime import date

from app.config.db import get_db


class FRARepository:
    @classmethod
    def create(cls, data: dict):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO fund_raising_activities
                    (fund_raiser_id, category_id, title, description,
                     target_amount, end_date, location_text, latitude, longitude, donee_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data["fund_raiser_id"], data["category_id"], data["title"],
                    data.get("description"), data["target_amount"], data["end_date"],
                    data.get("location_text"), data.get("latitude"), data.get("longitude"),
                    data.get("donee_id"),
                ),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_id(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM fund_raising_activities WHERE id = %s", (fra_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def update_current_amount(cls, fra_id: int, amount: float):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET current_amount = current_amount + %s WHERE id = %s",
                (amount, fra_id),
            )

    @classmethod
    def search(cls, keyword: str = None, category_id: int = None, end_date: str = None):
        with get_db() as conn:
            cur = conn.cursor()
            conditions = ["status = 'active'"]
            params = []
            if keyword:
                conditions.append(
                    "to_tsvector('english', title || ' ' || COALESCE(description, '')) "
                    "@@ plainto_tsquery(%s)"
                )
                params.append(keyword)
            if category_id:
                conditions.append("category_id = %s")
                params.append(category_id)
            if end_date:
                conditions.append("end_date <= %s")
                params.append(end_date)
            where = " AND ".join(conditions)
            cur.execute(
                f"SELECT * FROM fund_raising_activities WHERE {where} "
                "ORDER BY created_at DESC LIMIT 50",
                params,
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_by_fund_raiser_id(cls, fund_raiser_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM fund_raising_activities WHERE fund_raiser_id = %s ORDER BY created_at DESC",
                (fund_raiser_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def update_status(cls, fra_id: int, status: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET status = %s, updated_at = NOW() "
                "WHERE id = %s RETURNING *",
                (status, fra_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_expired(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM fund_raising_activities "
                "WHERE end_date < %s AND status = 'active'",
                (date.today(),),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def update_impact_score(cls, fra_id: int, score: float):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET impact_score = %s, updated_at = NOW() "
                "WHERE id = %s RETURNING *",
                (round(score, 2), fra_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def increment_view_count(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET view_count = view_count + 1 WHERE id = %s",
                (fra_id,),
            )

    @classmethod
    def increment_shortlist(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET shortlist_count = shortlist_count + 1 "
                "WHERE id = %s",
                (fra_id,),
            )

    @classmethod
    def get_by_category(cls, category_id: int, limit: int = 20):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM fund_raising_activities "
                "WHERE category_id = %s AND status = 'active' "
                "ORDER BY created_at DESC LIMIT %s",
                (category_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_trending(cls, limit: int = 10):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM fund_raising_activities WHERE status = 'active' "
                "ORDER BY view_count DESC, shortlist_count DESC LIMIT %s",
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def set_spike_flagged(cls, fra_id: int, flagged: bool):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE fund_raising_activities SET is_spike_flagged = %s, updated_at = NOW() "
                "WHERE id = %s RETURNING *",
                (flagged, fra_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_spike_flagged(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM fund_raising_activities WHERE is_spike_flagged = TRUE"
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_new_count(cls, start_date: str, end_date: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) AS count FROM fund_raising_activities "
                "WHERE DATE(created_at) BETWEEN %s AND %s",
                (start_date, end_date),
            )
            return cur.fetchone()["count"]
