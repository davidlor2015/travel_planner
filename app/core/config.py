from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_JWT_SECRET_PLACEHOLDERS = {
    "change-me",
    "changeme",
    "replace-me",
    "replace_this_in_production",
    "secret",
    "your-secret-here",
}

class Settings(BaseSettings):
    PROJECT_NAME: str = "Waypoint API"
    DATABASE_URL: str = "postgresql+psycopg2://user:password@localhost:5432/travel_planner"

    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
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

    # Rate limit for the SSE stream endpoint. Streaming holds an Ollama
    # inference open for up to OLLAMA_TIMEOUT_SECONDS, so a tighter per-IP
    # cap prevents a single client from saturating the model.
    AI_STREAM_RATE_LIMIT: str = "5/minute"

    # Rate limit for trip execution mutations (stop status, unplanned stops).
    # These fire during active trips so must tolerate normal usage patterns
    # (a user confirming 5–10 stops across a day) without tripping.
    EXECUTION_RATE_LIMIT: str = "30/minute"

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:14b"
    OLLAMA_TIMEOUT_SECONDS: int = 60
    # Maximum tokens the model may generate per request.
    # A 14-day itinerary at 3 activities/day needs ~4 200 tokens; 8 192 gives
    # comfortable headroom while staying well within llama3.2's context window.
    OLLAMA_NUM_PREDICT: int = 8192

    OPENTRIPMAP_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    # "ollama" or "gemini"
    LLM_PROVIDER: str = "ollama"

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

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        secret = value.strip()
        if len(secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        if secret.lower() in _JWT_SECRET_PLACEHOLDERS:
            raise ValueError("JWT_SECRET must not use an insecure placeholder value")
        return secret

settings = Settings()
