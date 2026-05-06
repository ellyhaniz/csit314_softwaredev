from fastapi import FastAPI

from app.routes.hello_routes import router as hello_router

app = FastAPI(title="Fundraising App API")

app.include_router(hello_router)
