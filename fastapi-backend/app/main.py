from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.rate_limit import limiter

app = FastAPI(title="CoreHR API", version="1.0.0", docs_url="/api-docs")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
register_exception_handlers(app)

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
