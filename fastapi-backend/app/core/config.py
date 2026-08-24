from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    port: int = 8000

    database_url: str = "postgresql://postgres:postgres@localhost:5433/corehr"

    jwt_access_secret: str = "corehr-access-secret-change-me"
    jwt_refresh_secret: str = "corehr-refresh-secret-change-me"
    jwt_access_ttl: str = "15m"
    jwt_refresh_ttl: str = "7d"

    client_url: str = "http://localhost:5173,http://localhost:4173"

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
