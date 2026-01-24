"""
Pydantic schemas for the AI Service API.
Defines request/response models for all endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class EmotionLabel(str, Enum):
    """Canonical emotion labels."""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    NEUTRAL = "neutral"
    DISGUST = "disgust"
    FEAR = "fear"
    SURPRISE = "surprise"
    UNKNOWN = "unknown"


class SessionStatus(str, Enum):
    """Session status values."""
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


# ============================================================================
# Emotion Analysis Schemas
# ============================================================================

class EmotionScore(BaseModel):
    """Individual emotion score."""
    emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)


class AudioEmotionResult(BaseModel):
    """Result from audio-based emotion analysis."""
    primary_emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    all_scores: Dict[str, float] = Field(default_factory=dict)


class TextEmotionResult(BaseModel):
    """Result from text-based emotion analysis."""
    primary_emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    all_scores: Dict[str, float] = Field(default_factory=dict)


class CombinedEmotionResult(BaseModel):
    """Combined emotion analysis from both audio and text."""
    audio_emotion: AudioEmotionResult
    text_emotion: TextEmotionResult
    final_emotion: EmotionLabel
    final_confidence: float = Field(..., ge=0.0, le=1.0)
    agreement: bool = Field(
        ..., 
        description="Whether audio and text emotions agree"
    )


# ============================================================================
# Transcription Schemas
# ============================================================================

class TranscriptionSegment(BaseModel):
    """A single transcription segment with speaker and emotion data."""
    id: str
    speaker: str
    start_time: float = Field(..., ge=0.0)
    end_time: float = Field(..., ge=0.0)
    duration: float = Field(..., ge=0.0)
    text_urdu: str = ""
    text_english: str = ""
    emotion: Optional[CombinedEmotionResult] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "seg_001",
                "speaker": "SPEAKER_00",
                "start_time": 0.0,
                "end_time": 5.5,
                "duration": 5.5,
                "text_urdu": "میں ٹھیک ہوں",
                "text_english": "I am fine",
                "emotion": None
            }
        }


class TranscriptionUpdate(BaseModel):
    """Real-time transcription update sent via WebSocket."""
    type: str = "transcription"
    segment: TranscriptionSegment
    is_final: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class FullTranscript(BaseModel):
    """Complete session transcript."""
    session_id: str
    segments: List[TranscriptionSegment] = Field(default_factory=list)
    total_duration: float = 0.0
    speaker_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Session Schemas
# ============================================================================

class SessionStartRequest(BaseModel):
    """Request to start a session analysis."""
    language: str = Field(default="ur", description="Primary language (ur=Urdu)")
    enable_diarization: bool = True
    enable_emotion_analysis: bool = True
    min_speakers: int = Field(default=2, ge=1, le=10)
    max_speakers: int = Field(default=2, ge=1, le=10)


class SessionStartResponse(BaseModel):
    """Response after starting session analysis."""
    session_id: str
    status: SessionStatus = SessionStatus.ACTIVE
    websocket_url: str
    message: str = "Session analysis started"


class SessionStatusResponse(BaseModel):
    """Current session status."""
    session_id: str
    status: SessionStatus
    segments_count: int = 0
    duration_seconds: float = 0.0
    last_activity: Optional[datetime] = None


class SessionStopRequest(BaseModel):
    """Request to stop session analysis."""
    generate_summary: bool = True
    save_transcript: bool = True


class SessionStopResponse(BaseModel):
    """Response after stopping session analysis."""
    session_id: str
    status: SessionStatus = SessionStatus.COMPLETED
    transcript: Optional[FullTranscript] = None
    message: str = "Session analysis stopped"


# ============================================================================
# WebSocket Message Schemas
# ============================================================================

class WebSocketMessage(BaseModel):
    """Base WebSocket message structure."""
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Optional[Dict[str, Any]] = None


class AudioChunkMessage(BaseModel):
    """Audio chunk sent from client."""
    type: str = "audio_chunk"
    audio_data: str = Field(..., description="Base64 encoded audio data")
    chunk_index: int
    sample_rate: int = 16000
    format: str = "wav"


class ConnectionMessage(BaseModel):
    """Connection status message."""
    type: str = "connection"
    status: str  # "connected", "disconnected", "error"
    message: str
    session_id: str


# ============================================================================
# SOAP Notes Schemas
# ============================================================================

class SOAPNoteSection(BaseModel):
    """Individual SOAP note section."""
    content: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    sources: List[str] = Field(
        default_factory=list,
        description="Transcript segment IDs this was derived from"
    )


class SOAPNote(BaseModel):
    """Complete SOAP note structure."""
    session_id: str
    subjective: SOAPNoteSection = Field(
        ..., 
        description="Patient's subjective experience and complaints"
    )
    objective: SOAPNoteSection = Field(
        ..., 
        description="Observable/measurable findings"
    )
    assessment: SOAPNoteSection = Field(
        ..., 
        description="Clinical assessment and diagnosis considerations"
    )
    plan: SOAPNoteSection = Field(
        ..., 
        description="Treatment plan and next steps"
    )
    emotional_summary: Optional[str] = Field(
        None,
        description="Summary of emotional patterns observed"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = "gpt-4o-mini"


class SOAPGenerateRequest(BaseModel):
    """Request to generate SOAP notes."""
    transcript: Optional[FullTranscript] = None
    include_emotions: bool = True
    additional_context: Optional[str] = None


class SOAPGenerateResponse(BaseModel):
    """Response with generated SOAP notes."""
    soap_note: SOAPNote
    processing_time_ms: int
    message: str = "SOAP notes generated successfully"


class SOAPUpdateRequest(BaseModel):
    """Request to update existing SOAP notes."""
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


# ============================================================================
# RAG Recommendations Schemas
# ============================================================================

class RecommendationSource(BaseModel):
    """Source information for a recommendation."""
    session_id: str
    date: datetime
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    excerpt: str


class Recommendation(BaseModel):
    """Individual recommendation."""
    id: str
    category: str = Field(..., description="e.g., 'treatment', 'technique', 'referral'")
    title: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    sources: List[RecommendationSource] = Field(default_factory=list)
    priority: int = Field(default=1, ge=1, le=5)


class RAGRecommendationsRequest(BaseModel):
    """Request for RAG-based recommendations."""
    current_session_id: Optional[str] = None
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Specific areas to focus recommendations on"
    )
    max_recommendations: int = Field(default=5, ge=1, le=20)


class RAGRecommendationsResponse(BaseModel):
    """Response with RAG-based recommendations."""
    patient_id: str
    recommendations: List[Recommendation] = Field(default_factory=list)
    total_sessions_analyzed: int = 0
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SimilarCaseResponse(BaseModel):
    """Response with similar patient cases."""
    patient_id: str
    similar_patterns: List[Dict[str, Any]] = Field(default_factory=list)
    analysis_scope: str = "last_10_sessions"


# ============================================================================
# Health Check Schemas
# ============================================================================

class HealthCheckResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, str] = Field(default_factory=dict)
