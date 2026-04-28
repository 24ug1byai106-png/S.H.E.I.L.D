"""
Building Damage Detection API
Entry point for the FastAPI application.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.models.database import init_db, close_db
from app.routes.analysis import router as analysis_router
from app.routes.analytics import router as analytics_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, clean up on shutdown."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Building Damage Detection API",
    description="AI-powered building damage detection using YOLOv8",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router, prefix="/api/v1", tags=["Analysis"])
app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics"])

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
