from app.config.db import get_db


class ReportedCampaignRepository:
    @classmethod
    def create(cls, fra_id: int, reported_by: int, reason: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO reported_campaigns (fra_id, reported_by, reason) "
                "VALUES (%s, %s, %s) RETURNING *",
                (fra_id, reported_by, reason),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_all(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT rc.*, fra.title AS fra_title "
                "FROM reported_campaigns rc "
                "JOIN fund_raising_activities fra ON fra.id = rc.fra_id "
                "WHERE rc.status = 'pending' "
                "ORDER BY rc.created_at DESC"
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM reported_campaigns WHERE fra_id = %s ORDER BY created_at DESC",
                (fra_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_by_id(cls, report_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM reported_campaigns WHERE id = %s", (report_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def update_status(cls, report_id: int, status: str, reviewed_by: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE reported_campaigns SET status = %s, reviewed_by = %s, "
                "reviewed_at = NOW() WHERE id = %s RETURNING *",
                (status, reviewed_by, report_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None
