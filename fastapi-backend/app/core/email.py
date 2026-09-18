import logging

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger("corehr.email")

_client = None


def get_ses_client():
    global _client
    if _client is None:
        _client = boto3.client("ses", region_name=settings.aws_region)
    return _client


def send_email(*, to: str, subject: str, body_text: str) -> None:
    """Best-effort email delivery: never raises, so a bounce or SES outage
    never surfaces as a failed request (matches the fail-open convention
    used for Redis in dashboard_service.py and rate_limit.py). No-ops when
    email isn't configured, so local/dev without AWS creds stays unaffected."""
    if not settings.email_enabled or not settings.ses_from_email:
        return
    try:
        get_ses_client().send_email(
            Source=settings.ses_from_email,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body_text}},
            },
        )
    except ClientError:
        logger.warning("SES send_email failed for %s", to, exc_info=True)
