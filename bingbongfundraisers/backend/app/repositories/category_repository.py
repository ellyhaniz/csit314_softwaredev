from app.config.db import get_db


class CategoryRepository:
    @classmethod
    def get_all(cls):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM categories ORDER BY name")
            return [dict(r) for r in cur.fetchall()]

    @classmethod
    def get_by_id(cls, cat_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM categories WHERE id = %s", (cat_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def get_by_slug(cls, slug: str):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM categories WHERE slug = %s", (slug,))
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def create(cls, name: str):
        slug = name.lower().replace(" ", "-").replace("&", "and")
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO categories (name, slug) VALUES (%s, %s) RETURNING *",
                (name, slug),
            )
            return dict(cur.fetchone())

    @classmethod
    def update(cls, cat_id: int, name: str):
        slug = name.lower().replace(" ", "-").replace("&", "and")
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE categories SET name = %s, slug = %s WHERE id = %s RETURNING *",
                (name, slug, cat_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @classmethod
    def delete(cls, cat_id: int):
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM categories WHERE id = %s RETURNING id", (cat_id,))
            return cur.fetchone() is not None

    @classmethod
    def is_in_use(cls, cat_id: int) -> bool:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM fund_raising_activities WHERE category_id = %s LIMIT 1",
                (cat_id,),
            )
            return cur.fetchone() is not None
