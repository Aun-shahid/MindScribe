"""
Database configuration for the AI Service.
Uses SQLAlchemy async for PostgreSQL connection.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import uuid

from .config import settings


# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Base class for ORM models (if needed for local models)
Base = declarative_base()


class Transcription(Base):
    __tablename__ = 'transcriptions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)  # Django session id
    status = Column(String(20), default='pending')
    language_detected = Column(String(10))
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    error_message = Column(Text)
    
    segments = relationship("TranscriptionSegment", back_populates="transcription")


class TranscriptionSegment(Base):
    __tablename__ = 'transcription_segments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transcription_id = Column(UUID(as_uuid=True), ForeignKey('transcriptions.id'), nullable=False)
    speaker_type = Column(String(20))
    speaker_id = Column(String(50))
    text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    confidence_score = Column(Float)
    language = Column(String(10))
    
    transcription = relationship("Transcription", back_populates="segments")
    emotion_analysis = relationship("EmotionAnalysis", back_populates="segment", uselist=False)


class EmotionAnalysis(Base):
    __tablename__ = 'emotion_analysis'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    segment_id = Column(Integer, ForeignKey('transcription_segments.id'), nullable=False)
    primary_emotion = Column(String(50), nullable=False)
    emotion_scores = Column(JSON, default=dict)
    valence = Column(Float, nullable=False)
    arousal = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    
    segment = relationship("TranscriptionSegment", back_populates="emotion_analysis")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI endpoints to get database session.
    
    Usage:
        @app.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions outside of FastAPI dependencies.
    
    Usage:
        async with get_db_context() as db:
            ...
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database connection and create tables if needed."""
    async with engine.begin() as conn:
        # Create tables for any local models
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connection pool."""
    await engine.dispose()
