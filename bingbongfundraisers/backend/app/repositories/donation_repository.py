from app.config.db import get_db

SPIKE_THRESHOLD = 5
FLAG_THRESHOLD = 5000.00


class DonationRepository:
    @classmethod
    def create(cls, data: dict):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO donations (fra_id, donor_id, amount, message, is_anonymous, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data["fra_id"], data["donor_id"], data["amount"],
                    data.get("message"), data.get("is_anonymous", False),
                    data.get("status", "completed"),
                ),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM donations WHERE fra_id = %s ORDER BY created_at DESC",
                (fra_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_total_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM donations "
                "WHERE fra_id = %s AND status = 'completed'",
                (fra_id,),
            )
            return float(cur.fetchone()["total"])

    @classmethod
    def get_count_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) AS count FROM donations "
                "WHERE fra_id = %s AND status = 'completed'",
                (fra_id,),
            )
            return cur.fetchone()["count"]

    @classmethod
    def get_by_status(cls, status: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM donations WHERE status = %s ORDER BY created_at DESC",
                (status,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def update_status(cls, donation_id: int, status: str, flagged_reason: str = None):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE donations SET status = %s, flagged_reason = %s "
                "WHERE id = %s RETURNING *",
                (status, flagged_reason, donation_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_hourly_count(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) AS count FROM donations "
                "WHERE fra_id = %s AND created_at >= NOW() - INTERVAL '1 hour'",
                (fra_id,),
            )
            return cur.fetchone()["count"]

    @classmethod
    def get_active_fra_ids(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT DISTINCT fra_id FROM donations "
                "WHERE created_at >= NOW() - INTERVAL '1 hour'"
            )
            return [r["fra_id"] for r in cur.fetchall()]

    @classmethod
    def get_total_donations(cls, start_date: str, end_date: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM donations "
                "WHERE status = 'completed' AND DATE(created_at) BETWEEN %s AND %s",
                (start_date, end_date),
            )
            return float(cur.fetchone()["total"])

    @classmethod
    def get_unique_donors_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT DISTINCT ON (d.donor_id)
                    d.donor_id,
                    CASE WHEN d.is_anonymous THEN 'Anonymous' ELSE u.full_name END AS donor_name,
                    d.amount, d.created_at, d.is_anonymous,
                    CASE WHEN t.id IS NOT NULL THEN TRUE ELSE FALSE END AS thank_you_sent,
                    t.message AS thank_you_message
                FROM donations d
                JOIN users u ON u.id = d.donor_id
                LEFT JOIN thank_you_messages t ON t.fra_id = d.fra_id AND t.donor_id = d.donor_id
                WHERE d.fra_id = %s AND d.status = 'completed'
                ORDER BY d.donor_id, d.created_at DESC
                """,
                (fra_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_recent_by_fra(cls, fra_id: int, limit: int = 6):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT
                    CASE WHEN d.is_anonymous THEN 'Anonymous' ELSE u.full_name END AS donor_name,
                    d.amount, d.created_at
                FROM donations d
                JOIN users u ON u.id = d.donor_id
                WHERE d.fra_id = %s AND d.status = 'completed'
                ORDER BY d.created_at DESC
                LIMIT %s
                """,
                (fra_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]
