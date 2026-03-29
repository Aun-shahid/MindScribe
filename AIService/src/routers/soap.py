"""
SOAP Notes Router - Generate and manage SOAP notes for therapy sessions.
Uses GPT-4o-mini for intelligent SOAP note generation.
"""
from ..database import async_session_maker, SOAPNoteDB
import json
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
import logging
import asyncio
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

    If the background pipeline is still running (segments not ready yet),
    this endpoint will poll for up to 90 seconds before giving up.
    """
    # NEW — only block if it's a session-scoped token AND it's the wrong session
# Therapist-level tokens have session.session_id = None → always allowed
    if session.session_id is not None and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    start_time = datetime.utcnow()

    try:
        transcript = request.transcript

        if not transcript or not transcript.segments:
            from .session import session_manager

            # ------------------------------------------------------------------ #
            # Poll for pipeline completion — background task may still be running
            # ------------------------------------------------------------------ #
            MAX_WAIT_SECONDS = 90
            POLL_INTERVAL_SECONDS = 3
            elapsed = 0

            session_data = session_manager.get_session(session_id)

            while elapsed < MAX_WAIT_SECONDS:
                session_data = session_manager.get_session(session_id)

                if session_data:
                    # Check if pipeline explicitly marked itself done
                    if session_data.get("finalization_complete"):
                        logger.info(f"Pipeline complete (finalization_complete flag) after {elapsed}s")
                        break

                    # Also accept if segments are present (pipeline saved them)
                    segments = session_data.get("finalized_segments") or session_data.get("segments", [])
                    if segments:
                        logger.info(f"Segments available ({len(segments)}) after {elapsed}s — proceeding")
                        break

                logger.info(f"Waiting for pipeline to finish for session {session_id} ({elapsed}s elapsed)...")
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                elapsed += POLL_INTERVAL_SECONDS

            # ------------------------------------------------------------------ #
            # After polling — try to build transcript from session manager
            # ------------------------------------------------------------------ #
            session_data = session_manager.get_session(session_id)

            if session_data:
                # Prefer finalized_segments (post-pipeline) over raw segments
                raw_segments = session_data.get("finalized_segments") or session_data.get("segments", [])

                if raw_segments:
                    from ..schemas import TranscriptionSegment
                    segments = [TranscriptionSegment(**s) for s in raw_segments]
                    transcript = FullTranscript(
                        session_id=session_id,
                        segments=segments,
                        total_duration=max((s.end_time for s in segments), default=0.0),
                        speaker_count=len(set(s.speaker for s in segments))
                    )
                    logger.info(f"Built transcript from session manager: {len(segments)} segments")

            # ------------------------------------------------------------------ #
            # Last resort — try fetching from database
            # ------------------------------------------------------------------ #
            # ------------------------------------------------------------------ #
            # Last resort — try fetching from database (with full emotion join)
            # ------------------------------------------------------------------ #
            if not transcript or not transcript.segments:
                logger.info(f"Session manager has no segments for {session_id}, trying database...")
                try:
                    from .session import _load_transcript_from_db
                    transcript = await _load_transcript_from_db(session_id)
                    logger.info(f"Loaded {len(transcript.segments)} segments from DB for {session_id}")
                except Exception as db_err:
                    logger.error(f"Failed to load transcript from database: {db_err}")

        if not transcript or not transcript.segments:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Transcript not ready yet. The audio pipeline may still be processing. "
                    "Please wait a moment and try again."
                )
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
        async with async_session_maker() as db:
            db_note = SOAPNoteDB(
                session_id=session_id,
                subjective=soap_note.subjective.content,
                objective=soap_note.objective.content,
                assessment=soap_note.assessment.content,
                plan=soap_note.plan.content,
                raw_json=json.loads(soap_note.json()),
            )

            db.add(db_note)
            await db.commit()
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


@router.get("/{session_id}/status")
async def get_soap_status(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """
    Check whether the background pipeline is done and SOAP can be generated.
    Frontend should poll this before calling /generate.
    """
    if session.session_id and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    from .session import session_manager
    session_data = session_manager.get_session(session_id)

    pipeline_done = False
    segment_count = 0

    if session_data:
        pipeline_done = bool(session_data.get("finalization_complete"))
        segments = session_data.get("finalized_segments") or session_data.get("segments", [])
        segment_count = len(segments)
        if segment_count > 0:
            pipeline_done = True

    soap_ready = session_id in soap_notes_store

    return {
        "session_id": session_id,
        "pipeline_complete": pipeline_done,
        "segment_count": segment_count,
        "soap_already_generated": soap_ready,
        "ready_to_generate": pipeline_done and not soap_ready,
    }


@router.get("/{session_id}", response_model=SOAPNote)
async def get_soap_notes(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    """Retrieve existing SOAP notes for a session."""
    if session.session_id and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    soap_note = soap_notes_store.get(session_id)
    if not soap_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP notes not found for this session. Please generate them first."
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