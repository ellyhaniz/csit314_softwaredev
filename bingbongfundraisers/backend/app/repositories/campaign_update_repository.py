from app.config.db import get_db


class CampaignUpdateRepository:
    @classmethod
    def save(cls, fra_id: int, title: str, content: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO campaign_updates (fra_id, title, content) "
                "VALUES (%s, %s, %s) RETURNING *",
                (fra_id, title, content),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM campaign_updates WHERE fra_id = %s ORDER BY created_at DESC",
                (fra_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_count_by_fra(cls, fra_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) AS count FROM campaign_updates WHERE fra_id = %s",
                (fra_id,),
            )
            return cur.fetchone()["count"]
