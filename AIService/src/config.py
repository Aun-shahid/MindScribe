"""
Configuration settings for the AI Service.
Uses Pydantic Settings for environment variable management.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # OpenAI Configuration
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    
    # HuggingFace Configuration
    hf_token: str = Field(default="", alias="HF_TOKEN")
    
    # JWT Authentication (shared with Django)
    ai_service_secret_key: str = Field(..., alias="AI_SERVICE_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/mindscribe",
        alias="DATABASE_URL"
    )
    
    # Model Paths
    emotion_model_path: str = Field(
        default="superb/wav2vec2-large-superb-er",
        alias="EMOTION_MODEL_PATH"
    )
    diarization_model: str = Field(
        default="pyannote/speaker-diarization-3.1",
        alias="DIARIZATION_MODEL"
    )
    
    # Audio Processing
    target_sample_rate: int = Field(default=16000, alias="TARGET_SAMPLE_RATE")
    
    # Service Configuration
    ai_service_port: int = Field(default=8080, alias="PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    
    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        alias="CORS_ORIGINS"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
