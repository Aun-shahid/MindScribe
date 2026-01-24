"""
SOAP Notes Router - Generate and manage SOAP notes for therapy sessions.
Uses GPT-4o-mini for intelligent SOAP note generation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
import logging
from datetime import datetime

from ..auth import get_current_session, validate_session_access, AuthenticatedSession
from ..schemas import (
    SOAPNote, SOAPNoteSection, SOAPGenerateRequest, SOAPGenerateResponse,
    SOAPUpdateRequest, FullTranscript
)
from ..services.soap_generator import generate_soap_notes

logger = logging.getLogger(__name__)

router = APIRouter()


# In-memory SOAP notes storage (for production, use database)
soap_notes_store: dict[str, SOAPNote] = {}


@router.post("/{session_id}/generate", response_model=SOAPGenerateResponse)
async def generate_soap(
    session_id: str,
    request: SOAPGenerateRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Generate SOAP notes for a therapy session.
    
    Uses the session transcript and emotion data to create
    structured SOAP notes using GPT-4o-mini.
    """
    validate_session_access(session, session_id)
    
    start_time = datetime.utcnow()
    
    try:
        # Get transcript from request or fetch from session manager
        transcript = request.transcript
        
        if not transcript:
            # Try to fetch from session manager
            from .session import session_manager
            session_data = session_manager.get_session(session_id)
            
            if session_data and session_data.get("segments"):
                from ..schemas import TranscriptionSegment
                segments = [TranscriptionSegment(**s) for s in session_data["segments"]]
                transcript = FullTranscript(
                    session_id=session_id,
                    segments=segments,
                    total_duration=max((s.end_time for s in segments), default=0.0),
                    speaker_count=len(set(s.speaker for s in segments))
                )
        
        if not transcript or not transcript.segments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No transcript available. Please provide transcript or ensure session has segments."
            )
        
        # Generate SOAP notes
        soap_note = await generate_soap_notes(
            session_id=session_id,
            transcript=transcript,
            include_emotions=request.include_emotions,
            additional_context=request.additional_context
        )
        
        # Store in memory
        soap_notes_store[session_id] = soap_note
        
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return SOAPGenerateResponse(
            soap_note=soap_note,
            processing_time_ms=processing_time,
            message="SOAP notes generated successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SOAP generation error for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate SOAP notes: {str(e)}"
        )


@router.get("/{session_id}", response_model=SOAPNote)
async def get_soap_notes(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """Retrieve existing SOAP notes for a session."""
    validate_session_access(session, session_id)
    
    soap_note = soap_notes_store.get(session_id)
    if not soap_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP notes not found for this session"
        )
    
    return soap_note


@router.put("/{session_id}", response_model=SOAPNote)
async def update_soap_notes(
    session_id: str,
    request: SOAPUpdateRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Update existing SOAP notes.
    Allows therapist to modify AI-generated notes.
    """
    validate_session_access(session, session_id)
    
    existing = soap_notes_store.get(session_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP notes not found for this session"
        )
    
    # Update only provided fields
    if request.subjective is not None:
        existing.subjective.content = request.subjective
    if request.objective is not None:
        existing.objective.content = request.objective
    if request.assessment is not None:
        existing.assessment.content = request.assessment
    if request.plan is not None:
        existing.plan.content = request.plan
    
    # Update the store
    soap_notes_store[session_id] = existing
    
    return existing


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_soap_notes(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """Delete SOAP notes for a session."""
    validate_session_access(session, session_id)
    
    if session_id not in soap_notes_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP notes not found for this session"
        )
    
    del soap_notes_store[session_id]
