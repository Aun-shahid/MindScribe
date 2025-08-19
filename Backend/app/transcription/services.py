"""Transcription & AI Analysis Orchestration Layer.

Central point for:
 - Creating realtime transcription sessions via OpenAI Realtime API
 - Receiving streamed partial transcripts + tone/emotion events (webhook style)
 - Persisting segments & emotion analysis
 - Generating SOAP notes + session insights on session end

NOTE: This is a scaffold. Network calls to OpenAI are represented; integrate
with your async stack / channels layer as needed.
"""
from __future__ import annotations

import os
import logging
import uuid
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from .models import (
    Transcription, TranscriptionSegment, EmotionAnalysis,
    RealtimeTranscriptionSession, MoodSnapshot
)
from therapy_sessions.models import Session, SessionInsight

try:
    import requests  # Used for simple sync calls; replace with httpx/async if desired
except ImportError:  # pragma: no cover
    requests = None  # type: ignore

logger = logging.getLogger(__name__)

OPENAI_REALTIME_BASE = os.getenv("OPENAI_REALTIME_BASE", "https://api.openai.com/v1/realtime")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL_REALTIME = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview")
MODEL_SOAP = os.getenv("OPENAI_SOAP_MODEL", "gpt-4o-mini")


@dataclass
class RealtimeSessionInitResult:
    realtime: RealtimeTranscriptionSession
    client_websocket_url: Optional[str]
    connection_id: Optional[str]


class TranscriptionService:
    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Realtime lifecycle
    # ------------------------------------------------------------------
    def start_realtime_for_session(self, session: Session) -> RealtimeSessionInitResult:
        """Create a RealtimeTranscriptionSession and request an ephemeral
        connection / URL from OpenAI (scaffold)."""
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not configured")

        with transaction.atomic():
            rt = RealtimeTranscriptionSession.objects.create(session=session)
            # Create the base transcription record
            transcription = Transcription.objects.create(session=session, status='processing', processing_started_at=timezone.now())
            rt.transcription = transcription
            rt.save(update_fields=["transcription"])

        # Simulate ephemeral key / URL acquisition (placeholder)
        client_ws_url = None
        connection_id = None
        if requests:
            try:
                # This endpoint is hypothetical; adapt to actual ephemeral token creation flow
                resp = requests.post(
                    f"{OPENAI_REALTIME_BASE}/sessions",
                    headers=self._auth_headers(),
                    json={"model": MODEL_REALTIME, "session_id": str(rt.id)},
                    timeout=10,
                )
                if resp.status_code < 300:
                    data = resp.json()
                    client_ws_url = data.get("client_ws_url")
                    connection_id = data.get("id")
                    rt.websocket_url = client_ws_url
                    rt.openai_connection_id = connection_id
                    rt.mark_active()
                else:
                    logger.error("Failed to init realtime session: %s %s", resp.status_code, resp.text)
                    rt.mark_error(f"Realtime init failed: {resp.status_code}")
            except Exception as e:  # pragma: no cover - network failure
                logger.exception("Realtime init network error")
                rt.mark_error(str(e))
        else:
            logger.warning("requests library not installed; realtime init skipped for %s", rt.id)

        return RealtimeSessionInitResult(rt, client_ws_url, connection_id)

    def close_realtime(self, session: Session):
        try:
            rt = session.realtime_transcription
        except RealtimeTranscriptionSession.DoesNotExist:
            return
        rt.mark_closed()

    # ------------------------------------------------------------------
    # Incoming event handling (webhook style)
    # ------------------------------------------------------------------
    def ingest_partial_transcript(self, session: Session, payload: Dict[str, Any]):
        """Persist a partial transcript segment + optional emotion data."""
        try:
            rt = session.realtime_transcription
            transcription = rt.transcription
        except Exception:
            logger.warning("No realtime transcription linked to session %s", session.id)
            return

        seg_id = uuid.uuid4()
        text = payload.get("text") or ""
        speaker = payload.get("speaker_type", "unknown")
        start = float(payload.get("start_time", 0))
        end = float(payload.get("end_time", start))
        confidence = payload.get("confidence")
        language = payload.get("language")
        emotion = payload.get("emotion")  # {'primary': 'sad', 'scores': {...}, ...}

        segment = TranscriptionSegment.objects.create(
            id=seg_id,  # type: ignore[arg-type]
            transcription=transcription,
            speaker_type=speaker,
            text=text,
            start_time=start,
            end_time=end,
            confidence_score=confidence,
            language=language,
        )
        if emotion:
            EmotionAnalysis.objects.create(
                segment=segment,
                primary_emotion=emotion.get("primary_emotion", "unknown"),
                emotion_scores=emotion.get("scores", {}),
                valence=emotion.get("valence", 0.0),
                arousal=emotion.get("arousal", 0.0),
                confidence=emotion.get("confidence", 0.0),
            )
        transcription.last_event_at = timezone.now()  # type: ignore[attr-defined]
        transcription.save(update_fields=[])  # no explicit field; kept for side effects

    def ingest_mood_snapshot(self, session: Session, payload: Dict[str, Any]):
        """Store a realtime mood snapshot (separate from per-segment emotion)."""
        try:
            start = session.actual_start_time
            now = timezone.now()
            rel = (now - start).total_seconds() if start else None
            MoodSnapshot.objects.create(
                session=session,
                relative_seconds=rel,
                mood_label=payload.get('mood_label', 'unknown'),
                mood_score=payload.get('mood_score'),
                valence=payload.get('valence'),
                arousal=payload.get('arousal'),
                confidence=payload.get('confidence'),
                raw=payload,
            )
        except Exception:  # pragma: no cover
            logger.exception('Failed to persist mood snapshot for session %s', session.id)

    # ------------------------------------------------------------------
    # Post-session insight generation (SOAP removed to dedicated app)
    # ------------------------------------------------------------------
    def generate_session_insights(self, session: Session):
        try:
            transcription = session.transcription
        except Transcription.DoesNotExist:
            logger.info("No transcription for session %s; skipping insight generation", session.id)
            return
        segments = transcription.segments.order_by('start_time')
        joined_text = "\n".join(s.text for s in segments)
        if not joined_text.strip():
            return
        if requests and OPENAI_API_KEY:
            try:
                prompt = (
                    "Extract concise key themes (list), overall mood (one word), and 1-2 recommendations from the transcript.\n" + joined_text[:6000]
                )
                resp = requests.post(
                    f"https://api.openai.com/v1/chat/completions",
                    headers=self._auth_headers(),
                    json={
                        "model": MODEL_SOAP,
                        "messages": [
                            {"role": "system", "content": "Return JSON with keys key_themes (list), overall_mood, recommendations."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                    },
                    timeout=25,
                )
                if resp.status_code < 300:
                    data = resp.json()
                    content = data['choices'][0]['message']['content']
                    import json as _json
                    try:
                        parsed = _json.loads(content)
                    except Exception:
                        parsed = {}
                    insight, _ = SessionInsight.objects.get_or_create(session=session)
                    insight.overall_mood = parsed.get('overall_mood')
                    insight.key_themes = parsed.get('key_themes', [])
                    insight.recommendations = parsed.get('recommendations')
                    insight.save()
            except Exception:  # pragma: no cover
                logger.exception("Insight generation failed for session %s", session.id)


transcription_service = TranscriptionService()
