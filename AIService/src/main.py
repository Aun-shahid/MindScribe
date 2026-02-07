"""
AI Service - FastAPI Backend
Main application entry point with router registration and middleware setup.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .config import settings
from .database import init_db, close_db

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Model cache for expensive models
model_cache = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting AI Service...")
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database connection established")
    except Exception as e:
        logger.warning(f"Database connection failed (non-critical): {e}")
    
    # Preload models (can be disabled in development to speed up reloads)
    if settings.preload_models:
        try:
            from .services.emotion import load_emotion_model
            load_emotion_model()
            logger.info("Emotion model loaded and ready")
        except Exception as e:
            logger.warning(f"Failed to preload emotion model: {e}")
    else:
        logger.info("Model preloading skipped (PRELOAD_MODELS=False)")
    
    logger.info(f"AI Service ready on port {settings.ai_service_port}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    await close_db()
    model_cache.clear()
    logger.info("AI Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="MindScribe AI Service",
    description="AI-powered features for therapy sessions including transcription, emotion analysis, SOAP notes, and recommendations",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and register routers
from .routers import session, soap, rag

app.include_router(
    session.router,
    prefix="/api/v1/session",
    tags=["Session & Transcription"]
)

app.include_router(
    soap.router,
    prefix="/api/v1/soap",
    tags=["SOAP Notes"]
)

app.include_router(
    rag.router,
    prefix="/api/v1/rag",
    tags=["RAG Recommendations"]
)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "ai-service"
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "service": "MindScribe AI Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }