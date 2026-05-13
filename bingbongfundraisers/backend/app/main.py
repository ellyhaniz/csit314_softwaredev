from fastapi import FastAPI

from app.routes.auth_routes import router as auth_router
from app.routes.donation_routes import router as donation_router
from app.routes.category_routes import router as category_router
from app.routes.favourite_routes import router as favourite_router
from app.routes.fra_routes import router as fra_router
from app.routes.hello_routes import router as hello_router
from app.routes.moderation_routes import router as moderation_router
from app.routes.report_routes import router as report_router
from app.routes.search_routes import router as search_router
from app.routes.thank_you_routes import router as thank_you_router

app = FastAPI(title="BingBong Fundraisers API")

app.include_router(auth_router)
app.include_router(donation_router)
app.include_router(hello_router)
app.include_router(fra_router)
app.include_router(search_router)
app.include_router(favourite_router)
app.include_router(thank_you_router)
app.include_router(category_router)
app.include_router(report_router)
app.include_router(moderation_router)
