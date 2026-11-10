from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://sprint:sprint@db:5432/sprint"
    frontend_origin: str = "http://localhost:3000"
    auto_migrate: bool = False

    title: str = "Sprint API"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
