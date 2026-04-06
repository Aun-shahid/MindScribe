"""
Pydantic schemas for the AI Service API.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class EmotionLabel(str, Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    NEUTRAL = "neutral"
    DISGUST = "disgust"
    FEAR = "fear"
    SURPRISE = "surprise"
    UNKNOWN = "unknown"


class SessionStatus(str, Enum):
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class EmotionScore(BaseModel):
    emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)


class AudioEmotionResult(BaseModel):
    """Raw output from Wav2Vec2 audio model."""
    primary_emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    all_scores: Dict[str, float] = Field(default_factory=dict)


class TextEmotionResult(BaseModel):
    """Raw output from GPT-based text emotion classifier."""
    primary_emotion: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    all_scores: Dict[str, float] = Field(default_factory=dict)


class CombinedEmotionResult(BaseModel):
    """Combined result (used by analyze_combined_emotion convenience wrapper)."""
    audio_emotion: AudioEmotionResult
    text_emotion: TextEmotionResult
    final_emotion: EmotionLabel
    final_confidence: float = Field(..., ge=0.0, le=1.0)
    agreement: bool


class SegmentEmotionResult(BaseModel):
    """
    Emotion result stored on each TranscriptionSegment.

    Keeps audio and text results separate so the frontend can display
    both model outputs independently and then show the GPT-fused final.

    analysis_type:
            'combined'   — both Wav2Vec2 (audio) and GPT text stage ran
            'text_only'  — only GPT text stage ran (audio unavailable / too short)
      'audio_only' — only Wav2Vec2 ran (no English translation available)
    """
    audio_emotion: Optional[EmotionLabel] = Field(
        None, description="Emotion from Wav2Vec2 audio model"
    )
    audio_confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    text_emotion: Optional[EmotionLabel] = Field(
        None, description="Emotion from GPT-based text classifier"
    )
    text_confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    final_emotion: EmotionLabel = Field(
        default=EmotionLabel.NEUTRAL,
        description="GPT-fused final emotion (or single-model result if no fusion)"
    )
    final_confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    agreement: Optional[bool] = Field(
        None, description="Whether audio and text models agreed (None if only one ran)"
    )
    analysis_type: str = Field(
        default="text_only",
        description="'combined' | 'text_only' | 'audio_only'"
    )

    @classmethod
    def from_combined(cls, result: "CombinedEmotionResult") -> "SegmentEmotionResult":
        return cls(
            audio_emotion=result.audio_emotion.primary_emotion,
            audio_confidence=result.audio_emotion.confidence,
            text_emotion=result.text_emotion.primary_emotion,
            text_confidence=result.text_emotion.confidence,
            final_emotion=result.final_emotion,
            final_confidence=result.final_confidence,
            agreement=result.agreement,
            analysis_type="combined"
        )

    @classmethod
    def from_text_only(cls, result: "TextEmotionResult") -> "SegmentEmotionResult":
        return cls(
            audio_emotion=None,
            audio_confidence=0.0,
            text_emotion=result.primary_emotion,
            text_confidence=result.confidence,
            final_emotion=result.primary_emotion,
            final_confidence=result.confidence,
            agreement=None,
            analysis_type="text_only"
        )


class TranscriptionSegment(BaseModel):
    id: str
    speaker: str
    start_time: float = Field(..., ge=0.0)
    end_time: float = Field(..., ge=0.0)
    duration: float = Field(..., ge=0.0)
    text_urdu: str = ""
    text_english: str = ""
    emotion: Optional[SegmentEmotionResult] = Field(
        None,
        description="Full emotion breakdown: audio model, text model, GPT-fused final"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "seg_0001",
                "speaker": "PATIENT",
                "start_time": 0.0,
                "end_time": 5.5,
                "duration": 5.5,
                "text_urdu": "مجھے بہت پریشانی ہے",
                "text_english": "I am very worried",
                "emotion": {
                    "audio_emotion": "sadness",
                    "audio_confidence": 0.72,
                    "text_emotion": "sadness",
                    "text_confidence": 0.88,
                    "final_emotion": "sadness",
                    "final_confidence": 0.85,
                    "agreement": True,
                    "analysis_type": "combined"
                }
            }
        }


class TranscriptionUpdate(BaseModel):
    type: str = "transcription"
    segment: TranscriptionSegment
    is_final: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class FullTranscript(BaseModel):
    session_id: str
    segments: List[TranscriptionSegment] = Field(default_factory=list)
    total_duration: float = 0.0
    speaker_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SessionStartRequest(BaseModel):
    session_id: Optional[str] = Field(None)
    patient_name: Optional[str] = Field(None)
    language: str = Field(default="ur")
    enable_diarization: bool = True
    enable_emotion_analysis: bool = True
    min_speakers: int = Field(default=2, ge=1, le=10)
    max_speakers: int = Field(default=2, ge=1, le=10)


class SessionStartResponse(BaseModel):
    session_id: str
    status: SessionStatus = SessionStatus.ACTIVE
    websocket_token: str
    message: str = "Session analysis started"


class SessionStatusResponse(BaseModel):
    session_id: str
    status: SessionStatus
    segments_count: int = 0
    duration_seconds: float = 0.0
    last_activity: Optional[datetime] = None


class SessionStopRequest(BaseModel):
    generate_summary: bool = True
    save_transcript: bool = True


class SessionStopResponse(BaseModel):
    session_id: str
    status: SessionStatus = SessionStatus.COMPLETED
    transcript: Optional[FullTranscript] = None
    message: str = "Session analysis stopped"


class WebSocketMessage(BaseModel):
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Optional[Dict[str, Any]] = None


class AudioChunkMessage(BaseModel):
    type: str = "audio_chunk"
    audio_data: str
    chunk_index: int
    sample_rate: int = 16000
    format: str = "wav"


class ConnectionMessage(BaseModel):
    type: str = "connection"
    status: str
    message: str
    session_id: str


class SOAPNoteSection(BaseModel):
    content: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    sources: List[str] = Field(default_factory=list)


class SOAPNote(BaseModel):
    session_id: str
    subjective: SOAPNoteSection
    objective: SOAPNoteSection
    assessment: SOAPNoteSection
    plan: SOAPNoteSection
    emotional_summary: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = "provider-configured"


class SOAPGenerateRequest(BaseModel):
    transcript: Optional[FullTranscript] = None
    include_emotions: bool = True
    additional_context: Optional[str] = None


class SOAPGenerateResponse(BaseModel):
    soap_note: SOAPNote
    processing_time_ms: int
    message: str = "SOAP notes generated successfully"


class SOAPUpdateRequest(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


class RecommendationSource(BaseModel):
    session_id: str
    date: datetime
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    excerpt: str


class Recommendation(BaseModel):
    id: str
    category: str
    title: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    sources: List[RecommendationSource] = Field(default_factory=list)
    priority: int = Field(default=1, ge=1, le=5)


class RAGRecommendationsRequest(BaseModel):
    current_session_id: Optional[str] = None
    focus_areas: List[str] = Field(default_factory=list)
    max_recommendations: int = Field(default=5, ge=1, le=20)


class RAGRecommendationsResponse(BaseModel):
    patient_id: str
    recommendations: List[Recommendation] = Field(default_factory=list)
    total_sessions_analyzed: int = 0
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SimilarCaseResponse(BaseModel):
    patient_id: str
    similar_patterns: List[Dict[str, Any]] = Field(default_factory=list)
    analysis_scope: str = "last_10_sessions"


class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, str] = Field(default_factory=dict)