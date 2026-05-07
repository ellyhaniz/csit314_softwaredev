from app.config.db import get_db


class PlatformReportRepository:
    @classmethod
    def create(cls, data: dict):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO platform_reports
                    (period, report_date, new_fras, total_donations,
                     active_users, new_users, generated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data["period"], data["report_date"], data["new_fras"],
                    data["total_donations"], data["active_users"],
                    data["new_users"], data.get("generated_by"),
                ),
            )
            return dict(cur.fetchone())

    @classmethod
    def get_by_id(cls, report_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM platform_reports WHERE id = %s", (report_id,))
            row = cur.fetchone()
            return dict(row) if row else None
