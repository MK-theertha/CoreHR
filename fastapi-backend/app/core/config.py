from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_JWT_ACCESS_SECRET = "corehr-access-secret-change-me"
_INSECURE_JWT_REFRESH_SECRET = "corehr-refresh-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    port: int = 8000

    database_url: str = "postgresql://postgres:postgres@localhost:5433/corehr"
    redis_url: str = "redis://localhost:6380/0"

    jwt_access_secret: str = _INSECURE_JWT_ACCESS_SECRET
    jwt_refresh_secret: str = _INSECURE_JWT_REFRESH_SECRET
    jwt_access_ttl: str = "15m"
    jwt_refresh_ttl: str = "7d"

    client_url: str = "http://localhost:5173,http://localhost:4173"

    aws_region: str = "ap-south-1"
    s3_uploads_bucket: str = ""

    @model_validator(mode="after")
    def _reject_insecure_defaults_in_production(self) -> "Settings":
        if not self.is_production:
            return self
        insecure = {
            "JWT_ACCESS_SECRET": self.jwt_access_secret == _INSECURE_JWT_ACCESS_SECRET,
            "JWT_REFRESH_SECRET": self.jwt_refresh_secret == _INSECURE_JWT_REFRESH_SECRET,
        }
        offenders = [name for name, is_insecure in insecure.items() if is_insecure]
        if offenders:
            raise ValueError(
                f"Refusing to start in production with insecure default value(s) for: {', '.join(offenders)}. "
                "Set them via environment variables."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def client_urls(self) -> list[str]:
        return [origin.strip() for origin in self.client_url.split(",") if origin.strip()]

    @property
    def asyncpg_database_url(self) -> str:
        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url
        if self.database_url.startswith("postgresql://"):
            return "postgresql+asyncpg://" + self.database_url[len("postgresql://") :]
        return self.database_url


settings = Settings()
