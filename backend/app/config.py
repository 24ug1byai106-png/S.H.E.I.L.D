"""
Application configuration and environment settings.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Building Damage Detection API"
    DEBUG: bool = False

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "damage_detection"

    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp", "image/tiff"]
    UPLOAD_DIR: str = "./uploads"

    # Model
    MODEL_CONFIDENCE_THRESHOLD: float = 0.45
    MODEL_PATH: str = "yolov8n.pt"  # Placeholder model path

    # RAG Service
    RAG_SERVICE_URL: str = "http://localhost:8001"

    # Logging
    LOG_LEVEL: str = "INFO"
    ALERT_LOG_FILE: str = "./logs/alerts.log"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
