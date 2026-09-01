from redis.asyncio import Redis

from app.core.config import settings

_client: Redis | None = None


def get_redis() -> Redis:
    """Lazily-created, process-wide async Redis client.

    Callers must treat every call as fallible (network hiccup, Redis
    restarting) and degrade to the database instead of raising — see
    dashboard_service's use of this.
    """
    global _client
    if _client is None:
        _client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _client
