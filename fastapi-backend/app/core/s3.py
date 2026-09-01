import boto3

from app.core.config import settings
from app.core.errors import AppError

_client = None

PRESIGNED_URL_TTL_SECONDS = 300


def get_s3_client():
    global _client
    if _client is None:
        # No explicit credentials: relies on boto3's default chain (the EC2
        # instance's IAM role in production, ~/.aws or env vars locally).
        # Credentials never pass through the API or reach the frontend.
        _client = boto3.client("s3", region_name=settings.aws_region)
    return _client


def _require_bucket() -> str:
    if not settings.s3_uploads_bucket:
        raise AppError("File uploads are not configured on this deployment", 501)
    return settings.s3_uploads_bucket


def generate_presigned_put_url(key: str, content_type: str) -> str:
    return get_s3_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": _require_bucket(), "Key": key, "ContentType": content_type},
        ExpiresIn=PRESIGNED_URL_TTL_SECONDS,
    )


def generate_presigned_get_url(key: str) -> str | None:
    if not settings.s3_uploads_bucket:
        return None
    return get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_uploads_bucket, "Key": key},
        ExpiresIn=PRESIGNED_URL_TTL_SECONDS,
    )
