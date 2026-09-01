from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.rate_limit import RateLimitMiddleware

app = FastAPI(title="CoreHR API", version="1.0.0", docs_url="/api-docs")

register_exception_handlers(app)

# Added before CORSMiddleware so CORS ends up outermost (Starlette runs the
# most-recently-added middleware first) — otherwise a 429 response never
# picks up CORS headers and browsers report a confusing CORS failure instead
# of the actual rate-limit error.
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.client_urls,
    allow_origin_regex=None if settings.is_production else r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "CoreHR API",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
