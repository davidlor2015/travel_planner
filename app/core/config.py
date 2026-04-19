from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Waypoint API"
    DATABASE_URL: str = "postgresql+psycopg2://user:password@localhost:5432/travel_planner"

    JWT_SECRET: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    TRIP_INVITE_EXPIRE_DAYS: int = 14
    APP_BASE_URL: str = "http://localhost:5173"
    EXPOSE_DEBUG_LINKS: bool = False
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Rate limit applied to the expensive AI generation endpoints.
    # Uses slowapi string syntax: "<count>/<period>" e.g. "10/minute", "100/hour".
    AI_RATE_LIMIT: str = "10/minute"

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:14b"
    OLLAMA_TIMEOUT_SECONDS: int = 60
    # Maximum tokens the model may generate per request.
    # A 14-day itinerary at 3 activities/day needs ~4 200 tokens; 8 192 gives
    # comfortable headroom while staying well within llama3.2's context window.
    OLLAMA_NUM_PREDICT: int = 8192

    OPENTRIPMAP_API_KEY: str = ""

    # Amadeus — self-service sandbox credentials.
    # Sign up at https://developers.amadeus.com and copy the Client ID / Secret
    # from your app's "Self Service" dashboard. Leave empty to disable search endpoints.
    AMADEUS_CLIENT_ID: str = ""
    AMADEUS_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings()
