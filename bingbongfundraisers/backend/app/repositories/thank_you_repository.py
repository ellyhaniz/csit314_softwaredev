from app.config.db import get_db


class ThankYouRepository:
    @classmethod
    def save(cls, fra_id: int, fund_raiser_id: int, donor_id: int, message: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO thank_you_messages (fra_id, fund_raiser_id, donor_id, message) "
                "VALUES (%s, %s, %s, %s) RETURNING *",
                (fra_id, fund_raiser_id, donor_id, message),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM thank_you_messages WHERE fra_id = %s ORDER BY created_at DESC",
                (fra_id,),
            )
            return [dict(r) for r in cur.fetchall()]
