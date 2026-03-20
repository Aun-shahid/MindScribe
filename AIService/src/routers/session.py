"""
Session Router - WebSocket-based real-time transcription and session management.
Handles live audio streaming, transcription, and emotion analysis.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Dict, Optional
import asyncio
import json
import logging
import uuid
from datetime import datetime
import base64

from ..auth import get_current_session, get_websocket_session, validate_session_access, AuthenticatedSession, generate_websocket_token
from ..schemas import (
    SessionStartRequest, SessionStartResponse, SessionStopRequest, SessionStopResponse,
    SessionStatusResponse, SessionStatus, FullTranscript, TranscriptionSegment,
    TranscriptionUpdate, AudioChunkMessage, CombinedEmotionResult,
    AudioEmotionResult, TextEmotionResult, EmotionLabel
)
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# In-memory session state (for production, use Redis)
active_sessions: Dict[str, Dict] = {}


class SessionManager:
    """Manages active transcription sessions."""
    
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
        self.connections: Dict[str, WebSocket] = {}
    
    def create_session(self, session_id: str, config: SessionStartRequest) -> Dict:
        """Initialize a new transcription session."""
        session_data = {
            "session_id": session_id,
            "status": SessionStatus.ACTIVE,
            "config": config.model_dump(),
            "segments": [],
            "started_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "audio_buffer": b"",
            "chunk_count": 0
        }
        self.sessions[session_id] = session_data
        return session_data
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data by ID."""
        return self.sessions.get(session_id)
    
    def update_session(self, session_id: str, **kwargs):
        """Update session data."""
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
            self.sessions[session_id]["last_activity"] = datetime.utcnow()
    
    def add_segment(self, session_id: str, segment: TranscriptionSegment):
        """Add a transcription segment to the session."""
        if session_id in self.sessions:
            self.sessions[session_id]["segments"].append(segment.model_dump())
    
    def stop_session(self, session_id: str) -> Optional[FullTranscript]:
        """Stop a session and return the full transcript."""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        session["status"] = SessionStatus.COMPLETED
        
        segments = [TranscriptionSegment(**s) for s in session["segments"]]
        
        total_duration = 0.0
        speakers = set()
        for seg in segments:
            total_duration = max(total_duration, seg.end_time)
            speakers.add(seg.speaker)
        
        return FullTranscript(
            session_id=session_id,
            segments=segments,
            total_duration=total_duration,
            speaker_count=len(speakers),
            created_at=session["started_at"],
            updated_at=datetime.utcnow()
        )
    
    def remove_session(self, session_id: str):
        """Remove a session from memory."""
        self.sessions.pop(session_id, None)
        self.connections.pop(session_id, None)


# Global session manager
session_manager = SessionManager()


@router.post("/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Start a new transcription session.
    
    Supports two modes:
    1. **Scheduled Session**: Provide session_id from Django backend
       - Validates session exists and user has access
       - Fetches patient details automatically
    
    2. **Instant Session**: Don't provide session_id
       - Creates a new instant session
       - Requires patient_name in request
    
    Returns WebSocket URL for streaming audio.
    """
    session_id = request.session_id
    
    # Mode 1: Scheduled session with existing session_id
    if session_id:
        # Note: We skip validate_session_access for access tokens since they don't have session_id
        # Only validate if the token has a session_id (i.e., it's a session token)
        if session.session_id:
            validate_session_access(session, session_id)
        
        # Check if session already has active transcription
        existing = session_manager.get_session(session_id)
        if existing and existing["status"] == SessionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Transcription session is already active for this session"
            )
        
        # TODO: Optionally fetch session details from Django backend
        # This would validate the session exists and get patient info
        # For now, we trust the session_id is valid
        
        logger.info(f"Starting scheduled session: {session_id} for therapist: {session.therapist_id}")
    
    # Mode 2: Instant session without session_id
    else:
        # Generate a new session ID for instant session
        session_id = str(uuid.uuid4())
        
        if not request.patient_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="patient_name is required for instant sessions"
            )
        
        logger.info(f"Starting instant session: {session_id} for patient: {request.patient_name}")
    
    # Create transcription session
    session_manager.create_session(session_id, request)
    
    # Generate WebSocket authentication token
    websocket_token = generate_websocket_token(
        session_id=session_id,
        therapist_id=session.therapist_id,
        expires_hours=24
    )
    
    return SessionStartResponse(
        session_id=session_id,
        status=SessionStatus.ACTIVE,
        websocket_token=websocket_token,
        message=f"Session started successfully. Connect to WebSocket to stream audio."
    )


@router.post("/{session_id}/stop", response_model=SessionStopResponse)
async def stop_session(
    session_id: str,
    request: SessionStopRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Stop an active transcription session.
    Returns the complete transcript.
    """
    validate_session_access(session, session_id)
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    transcript = session_manager.stop_session(session_id)
    
    # TODO: Save transcript to database if request.save_transcript
    
    return SessionStopResponse(
        session_id=session_id,
        status=SessionStatus.COMPLETED,
        transcript=transcript,
        message="Session stopped successfully"
    )


@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """Get current session status."""
    validate_session_access(session, session_id)
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    segments = session_data.get("segments", [])
    duration = 0.0
    if segments:
        duration = max(s.get("end_time", 0) for s in segments)
    
    return SessionStatusResponse(
        session_id=session_id,
        status=session_data["status"],
        segments_count=len(segments),
        duration_seconds=duration,
        last_activity=session_data.get("last_activity")
    )


@router.get("/{session_id}/transcript", response_model=FullTranscript)
async def get_transcript(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """Get the full transcript for a session."""
    validate_session_access(session, session_id)
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    segments = [TranscriptionSegment(**s) for s in session_data.get("segments", [])]
    
    total_duration = 0.0
    speakers = set()
    for seg in segments:
        total_duration = max(total_duration, seg.end_time)
        speakers.add(seg.speaker)
    
    return FullTranscript(
        session_id=session_id,
        segments=segments,
        total_duration=total_duration,
        speaker_count=len(speakers),
        created_at=session_data["started_at"],
        updated_at=session_data["last_activity"]
    )


@router.websocket("/ws/{session_id}")
async def websocket_transcription(
    websocket: WebSocket,
    session_id: str
):
    """
    WebSocket endpoint for real-time audio transcription.
    
    Protocol:
    1. Client connects with token in query param or header
    2. Client sends audio chunks as base64 JSON messages
    3. Server responds with transcription segments
    
    Message format (client -> server):
    {
        "type": "audio_chunk",
        "audio_data": "<base64 encoded audio>",
        "chunk_index": 0,
        "sample_rate": 16000,
        "format": "wav"
    }
    
    Message format (server -> client):
    {
        "type": "transcription",
        "segment": {...},
        "is_final": false,
        "timestamp": "2024-01-20T..."
    }
    """
    # Get token from query params
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # Authenticate
    try:
        auth_session = await get_websocket_session(websocket, token)
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        return
    
    # Validate session access
    if auth_session.session_id != session_id:
        await websocket.close(code=4003, reason="Session ID mismatch")
        return
    
    # Accept connection
    await websocket.accept()
    
    # Store connection
    session_manager.connections[session_id] = websocket
    
    # Send connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "message": "Connected to transcription service",
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    logger.info(f"WebSocket connected for session {session_id}")
    
    try:
        # Import services lazily to avoid circular imports
        from ..services.transcription import transcribe_audio_chunk
        
        chunk_index = 0
        accumulated_audio = b""
        
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format",
                    "timestamp": datetime.utcnow().isoformat()
                })
                continue
            
            msg_type = message.get("type")
            
            if msg_type == "audio_chunk":
                # Process audio chunk
                try:
                    audio_b64 = message.get("audio_data", "")
                    audio_bytes = base64.b64decode(audio_b64)
                    accumulated_audio += audio_bytes
                    
                    # Process when we have enough audio (e.g., every 2 seconds)
                    # Assuming 16kHz, 16-bit audio = 32000 bytes per second
                    if len(accumulated_audio) >= 64000:  # ~2 seconds
                        # Transcribe
                        transcription_result = await transcribe_audio_chunk(
                            accumulated_audio,
                            language=session_manager.get_session(session_id).get("config", {}).get("language", "ur")
                        )
                        
                        if transcription_result and transcription_result.get("text"):
                            # Emotion analysis has been deferred to post-session processing
                            
                            # Create segment
                            segment = TranscriptionSegment(
                                id=f"seg_{chunk_index:04d}",
                                speaker=transcription_result.get("speaker", "SPEAKER_00"),
                                start_time=chunk_index * 2.0,  # Approximate timing
                                end_time=(chunk_index + 1) * 2.0,
                                duration=2.0,
                                text_urdu=transcription_result.get("text", ""),
                                text_english=transcription_result.get("text_en", ""),
                                emotion=None
                            )
                            
                            # Save segment
                            session_manager.add_segment(session_id, segment)
                            
                            # Send transcription update
                            update = TranscriptionUpdate(
                                type="transcription",
                                segment=segment,
                                is_final=False,
                                timestamp=datetime.utcnow()
                            )
                            
                            await websocket.send_json(update.model_dump(mode="json"))
                            chunk_index += 1
                        
                        # Clear buffer
                        accumulated_audio = b""
                    
                    # Update session activity
                    session_manager.update_session(session_id, chunk_count=chunk_index)
                    
                except Exception as e:
                    logger.error(f"Audio processing error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Audio processing error: {str(e)}",
                        "timestamp": datetime.utcnow().isoformat()
                    })
            
            elif msg_type == "heartbeat":
                await websocket.send_json({
                    "type": "heartbeat_response",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif msg_type == "stop":
                # Client requested stop
                break
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        # Clean up connection
        session_manager.connections.pop(session_id, None)
        logger.info(f"WebSocket cleaned up for session {session_id}")


# ============================================================================
# POST-PROCESSING ENDPOINT (Session Finalization)
# ============================================================================

@router.post("/{session_id}/finalize")
async def finalize_session(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Finalize a completed session with post-processing:
    - Correct speaker labels using GPT-4o
    - Translate all segments to English
    
    The processed segments can then be used to generate SOAP notes
    via the /soap/{session_id}/generate endpoint.
    
    Returns:
        Status and processing details
    """
    validate_session_access(session, session_id)
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    try:
        # Import services
        from ..services.speaker_correction import correct_speakers_with_gpt_async
        from ..services.transcription import translate_all_segments
        
        # Get segments
        segments = [
            TranscriptionSegment(**s).model_dump()
            for s in session_data.get("segments", [])
        ]
        
        if not segments:
            return {
                "session_id": session_id,
                "status": "no_data",
                "message": "No segments to process"
            }
        
        logger.info(f"Starting finalization for session {session_id} with {len(segments)} segments")
        
        # Step 1: Correct speakers with GPT-4o
        logger.info("Step 1/2: Correcting speaker labels with GPT-4o...")
        from openai import AsyncOpenAI
        openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        
        corrected_segments = await correct_speakers_with_gpt_async(
            segments,
            openai_client
        )
        
        changes = sum(
            1 for i, seg in enumerate(segments)
            if seg.get('speaker') != corrected_segments[i].get('speaker')
        )
        logger.info(f"Speaker correction complete: {changes} labels corrected")
        
        # Step 2: Translate all segments
        logger.info("Step 2/2: Translating segments to English...")
        
        # For translation, we need audio path - use session config if available
        audio_path = session_data.get("config", {}).get("audio_path")
        if audio_path:
            translated_segments = await translate_all_segments(
                audio_path,
                corrected_segments,
                emotion_context=True
            )
        else:
            # If no audio path, just use existing text
            translated_segments = corrected_segments
            logger.warning("No audio path available for segment extraction during translation")
        
        logger.info("Translation complete")
        
        # Identify patient speaker
        speakers = sorted(list({s.get('speaker') for s in translated_segments}))
        patient_speaker = 'PATIENT' if 'PATIENT' in speakers else (speakers[1] if len(speakers) > 1 else speakers[0] if speakers else 'UNKNOWN')
        
        logger.info(f"Identified patient speaker: {patient_speaker}")
        
        # Store finalized data
        session_manager.update_session(
            session_id,
            finalized_segments=translated_segments,
            patient_speaker=patient_speaker,
            finalization_complete=True,
            finalized_at=datetime.utcnow()
        )
        
        logger.info(f"Finalization complete for session {session_id}")
        
        return {
            "session_id": session_id,
            "status": "finalized",
            "speaker_corrections": changes,
            "total_segments": len(translated_segments),
            "patient_speaker": patient_speaker,
            "message": "Session finalization complete. Use /soap endpoint to generate SOAP notes."
        }
        
    except Exception as e:
        logger.error(f"Finalization error for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Finalization error: {str(e)}"
        )
