from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mis"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/mis"
    openai_api_key: str = ""
    openai_base_url: str = "https://models.github.ai/inference"
    openai_model: str = "openai/gpt-4o"
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = "quotes@magnetmfg.com"
    webhook_url: str = ""
    labor_rate_per_hour: float = 45.0
    default_margin_target: float = 0.35

    model_config = {"env_prefix": "MIS_"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
