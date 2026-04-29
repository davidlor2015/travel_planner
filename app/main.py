# Path: app/main.py
# Summary: Implements main functionality.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.routes import (
    ai,
    auth,
    budget,
    destinations,
    invites,
    matching,
    packing,
    prep,
    reservations,
    search,
    trip_execution,
    trips,
)
from app.api.middleware.error_handler import global_exception_handler
from app.api.middleware.request_metrics import request_metrics_middleware
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import configure_logging
from app.core.monitoring import initialize_sentry

configure_logging()
initialize_sentry()

app = FastAPI(title="Waypoint API")

# CORS — origins are configured via CORS_ORIGINS env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting — slowapi reads app.state.limiter; the exception handler
# converts RateLimitExceeded into a proper 429 JSON response.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_exception_handler(Exception, global_exception_handler)
app.middleware("http")(request_metrics_middleware)

app.include_router(auth.router, prefix="/v1/auth", tags=["Auth"])
app.include_router(trips.router, prefix="/v1/trips", tags=["Trips"])
app.include_router(trip_execution.router, prefix="/v1/trips", tags=["Trip Execution"])
app.include_router(matching.router, prefix="/v1/matching", tags=["Matching"])
app.include_router(ai.router, prefix="/v1/ai", tags=["AI"])
app.include_router(search.router, prefix="/v1/search", tags=["Search"])
app.include_router(destinations.router, prefix="/v1/destinations", tags=["Destinations"])
app.include_router(invites.router, prefix="/v1/trip-invites", tags=["Trip Invites"])
app.include_router(packing.router, prefix="/v1/trips/{trip_id}/packing", tags=["Packing"])
app.include_router(budget.router, prefix="/v1/trips/{trip_id}/budget", tags=["Budget"])
app.include_router(reservations.router, prefix="/v1/trips/{trip_id}/reservations", tags=["Reservations"])
app.include_router(prep.router, prefix="/v1/trips/{trip_id}/prep", tags=["Prep"])
