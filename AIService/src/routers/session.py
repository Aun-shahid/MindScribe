"""
Session Router - WebSocket-based real-time transcription and session management.

EMOTION PIPELINE ORDER (matches the tested Streamlit pipeline):
  Stage 1 — After audio sliced per segment → Wav2Vec2 audio emotion → logged
  Stage 2 — After translation done → distilroberta text emotion → logged
  Stage 3 — Both results → GPT-4o-mini fusion → logged
Both audio_emotion and text_emotion stored separately on SegmentEmotionResult.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Dict, Optional
import asyncio
import json
import logging
import uuid
from datetime import datetime
import base64
import os

from ..auth import (
    get_current_session, get_websocket_session, validate_session_access,
    AuthenticatedSession, generate_websocket_token
)
from ..schemas import (
    SessionStartRequest, SessionStartResponse, SessionStopRequest, SessionStopResponse,
    SessionStatusResponse, SessionStatus, FullTranscript, TranscriptionSegment,
    TranscriptionUpdate, AudioChunkMessage, CombinedEmotionResult,
    AudioEmotionResult, TextEmotionResult, EmotionLabel, SegmentEmotionResult
)
from ..config import settings
from ..database import (
    get_db_context, Transcription,
    TranscriptionSegment as DBTranscriptionSegment, EmotionAnalysis
)
from ..services.emotion import normalize_emotion_label
logger = logging.getLogger(__name__)
router = APIRouter()
active_sessions: Dict[str, Dict] = {}


# ============================================================================
# Session Manager
# ============================================================================

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
        self.connections: Dict[str, WebSocket] = {}

    def create_session(self, session_id: str, config: SessionStartRequest) -> Dict:
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
        return self.sessions.get(session_id)

    def update_session(self, session_id: str, **kwargs):
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
            self.sessions[session_id]["last_activity"] = datetime.utcnow()

    def stop_session(self, session_id: str) -> Optional[FullTranscript]:
        session = self.sessions.get(session_id)
        if not session:
            return None
        session["status"] = SessionStatus.COMPLETED
        segments = [TranscriptionSegment(**s) for s in session["segments"]]
        total_duration = max((s.end_time for s in segments), default=0.0)
        speakers = {s.speaker for s in segments}
        return FullTranscript(
            session_id=session_id, segments=segments,
            total_duration=total_duration, speaker_count=len(speakers),
            created_at=session["started_at"], updated_at=datetime.utcnow()
        )

    def remove_session(self, session_id: str):
        self.sessions.pop(session_id, None)
        self.connections.pop(session_id, None)


session_manager = SessionManager()


# ============================================================================
# REST Endpoints
# ============================================================================

@router.post("/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    session_id = request.session_id
    if session_id:
        if session.session_id:
            validate_session_access(session, session_id)
        existing = session_manager.get_session(session_id)
        if existing and existing["status"] == SessionStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Transcription session is already active")
        logger.info(f"Starting scheduled session: {session_id}")
    else:
        session_id = str(uuid.uuid4())
        if not request.patient_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="patient_name is required for instant sessions")
        logger.info(f"Starting instant session: {session_id} for {request.patient_name}")

    session_manager.create_session(session_id, request)
    websocket_token = generate_websocket_token(
        session_id=session_id, therapist_id=session.therapist_id, expires_hours=24
    )
    return SessionStartResponse(
        session_id=session_id, status=SessionStatus.ACTIVE,
        websocket_token=websocket_token,
        message="Session started. Connect to WebSocket to stream audio."
    )


@router.post("/{session_id}/stop", response_model=SessionStopResponse)
async def stop_session(
    session_id: str, request: SessionStopRequest,
    session: AuthenticatedSession = Depends(get_current_session)
):
    if session.session_id and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session_manager.update_session(session_id, status=SessionStatus.COMPLETED)
    audio_buffer = session_data.get("audio_buffer", b"")
    django_session_id = session_data.get("config", {}).get("session_id", session_id)
    language = session_data.get("config", {}).get("language", "ur")

    logger.info(f"Session stopped. Audio buffer: {len(audio_buffer)} bytes")

    if audio_buffer:
        asyncio.create_task(_run_full_pipeline(
            session_id=session_id, django_session_id=django_session_id,
            audio_buffer=audio_buffer, language=language,
            save_to_db=request.save_transcript
        ))
        message = "Session stopped. Pipeline started in background."
    else:
        message = "Session stopped. No audio recorded."

    transcript = session_manager.stop_session(session_id)
    return SessionStopResponse(
        session_id=session_id, status=SessionStatus.COMPLETED,
        transcript=transcript, message=message
    )


@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    if session.session_id and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    segments = session_data.get("segments", [])
    duration = max((s.get("end_time", 0) for s in segments), default=0.0)
    return SessionStatusResponse(
        session_id=session_id, status=session_data["status"],
        segments_count=len(segments), duration_seconds=duration,
        last_activity=session_data.get("last_activity")
    )


@router.get("/{session_id}/transcript", response_model=FullTranscript)
async def get_transcript(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    if session.session_id is not None and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    session_data = session_manager.get_session(session_id)

    # ── Not in memory (server restarted) → fall back to DB ─────────────────
    if not session_data or not session_data.get("segments"):
        try:
            logger.info(f"[TRANSCRIPT] Session {session_id} not in memory, loading from DB...")
            return await _load_transcript_from_db(session_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Session not found in memory or database")
        except Exception as e:
            logger.error(f"[TRANSCRIPT] DB fallback failed: {e}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Session not found")

    raw_segments = session_data.get("segments", [])

    if raw_segments:
        logger.info(f"[TRANSCRIPT] First segment emotion raw: {raw_segments[0].get('emotion')}")

    segments = []
    for s in raw_segments:
        emotion_raw = s.get("emotion")
        emotion_obj = None
        if emotion_raw and isinstance(emotion_raw, dict):
            try:
                emotion_obj = SegmentEmotionResult(**emotion_raw)
            except Exception as e:
                logger.warning(f"[TRANSCRIPT] Failed to reconstruct emotion: {e}, raw={emotion_raw}")

        seg = TranscriptionSegment(
            id=s.get("id", ""),
            speaker=s.get("speaker", "UNKNOWN"),
            start_time=float(s.get("start_time", 0.0)),
            end_time=float(s.get("end_time", 0.0)),
            duration=float(s.get("duration", 0.0)),
            text_urdu=s.get("text_urdu", ""),
            text_english=s.get("text_english", ""),
            emotion=emotion_obj
        )
        segments.append(seg)

    total_duration = max((s.end_time for s in segments), default=0.0)
    speakers = {s.speaker for s in segments}
    return FullTranscript(
        session_id=session_id, segments=segments,
        total_duration=total_duration, speaker_count=len(speakers),
        created_at=session_data["started_at"], updated_at=session_data["last_activity"]
    )


# ============================================================================
# Helpers
# ============================================================================

def _raw_pcm_to_wav(raw_path: str, sample_rate: int = 16000) -> str:
    import wave
    from pathlib import Path
    out_path = str(Path(raw_path).with_suffix('.wav'))
    with open(raw_path, 'rb') as f:
        pcm_data = f.read()
    with wave.open(out_path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    logger.info(f"PCM → WAV: {out_path} ({len(pcm_data)//2} samples @ {sample_rate}Hz)")
    return out_path


def _fmt_scores(scores: dict) -> str:
    """Compact top-3 scores for console logging."""
    if not scores:
        return "{}"
    top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
    return "{" + ", ".join(f"{k}:{v:.3f}" for k, v in top3) + "}"


# ============================================================================
# FULL PIPELINE
# ============================================================================

async def _run_full_pipeline(
    session_id: str,
    django_session_id: str,
    audio_buffer: bytes,
    language: str = "ur",
    save_to_db: bool = True
):
    """
    Pipeline stages:
      1  Save raw audio
      2  PCM → 16kHz WAV
      3  Diarization (PyAnnote)
      4  Whisper transcription per segment
      5  GPT-4o speaker correction (THERAPIST / PATIENT)
      6  Translate Urdu → English

      ── EMOTION STAGE 1 ──────────────────────────────────
      7  Wav2Vec2 audio emotion per segment
         → logged to console with all_scores

      ── EMOTION STAGE 2 ──────────────────────────────────
      8  distilroberta text emotion per segment (English)
         → logged to console with all_scores

      ── EMOTION FUSION ───────────────────────────────────
      9  GPT-4o-mini fusion of audio + text per segment
         → logged to console showing both inputs and final

      10 Save to DB
    """
    import tempfile
    from openai import OpenAI
    from ..services.diarization import diarize_audio
    from ..services.transcription import translate_to_english
    from ..services.emotion import (
         analyze_audio_emotion,
        analyze_text_emotion,
        _fuse_emotions_with_gpt,
        
    )

    logger.info(f"[PIPELINE] ═══ START session={session_id} ═══")
    tmp_raw = None
    tmp_resampled = None

    try:
        # ── Step 1 ──────────────────────────────────────────────────────────
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".raw") as f:
            f.write(audio_buffer)
            tmp_raw = f.name
        logger.info(f"[PIPELINE] Step 1 — raw audio saved ({len(audio_buffer)} bytes)")

        # ── Step 2 ──────────────────────────────────────────────────────────
        tmp_resampled = _raw_pcm_to_wav(tmp_raw, sample_rate=16000)
        logger.info(f"[PIPELINE] Step 2 — 16kHz WAV ready")

        # Load full audio once for slicing (used in steps 4 and 7)
        from pydub import AudioSegment as PydubSegment
        full_audio = PydubSegment.from_file(tmp_resampled)
        full_audio_16k = full_audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)

        # ── Step 3 ──────────────────────────────────────────────────────────
        logger.info("[PIPELINE] Step 3 — diarization...")
        raw_segments = await diarize_audio(tmp_resampled)
        logger.info(f"[PIPELINE] Step 3 — {len(raw_segments)} segments")
        if not raw_segments:
            logger.warning("[PIPELINE] No segments — aborting")
            return

        # ── Step 4: Whisper transcription ───────────────────────────────────
        logger.info("[PIPELINE] Step 4 — Whisper transcription...")
        sync_client = OpenAI(api_key=settings.openai_api_key)
        transcribed_segments = []

        for idx, seg in enumerate(raw_segments):
            try:
                start_ms = int(seg['start'] * 1000)
                end_ms = int(seg['end'] * 1000)
                if end_ms - start_ms < 500:
                    continue
                seg_audio = full_audio[start_ms:end_ms]
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_seg:
                    seg_audio.export(tmp_seg.name, format="wav")
                    seg_path = tmp_seg.name
                try:
                    with open(seg_path, "rb") as af:
                        detect_resp = sync_client.audio.transcriptions.create(
                            model="whisper-1", file=af, response_format="verbose_json"
                        )
                    detected_lang = getattr(detect_resp, 'language', 'ur')
                    force_lang = 'en' if detected_lang in ['en', 'english'] else 'ur'
                    with open(seg_path, "rb") as af:
                        trans_resp = sync_client.audio.transcriptions.create(
                            model="whisper-1", file=af,
                            language=force_lang, response_format="text"
                        )
                    text = trans_resp.strip() if isinstance(trans_resp, str) else str(trans_resp)
                finally:
                    if os.path.exists(seg_path):
                        os.unlink(seg_path)

                transcribed_segments.append({
                    **seg,
                    'text': text,
                    'language': 'English' if force_lang == 'en' else 'Urdu',
                    'id': f"seg_{idx:04d}"
                })
            except Exception as e:
                logger.warning(f"[PIPELINE] Transcription failed seg {idx}: {e}")

        logger.info(f"[PIPELINE] Step 4 — transcribed {len(transcribed_segments)} segments")

        # ── Step 5: GPT speaker correction ─────────────────────────────────
        logger.info("[PIPELINE] Step 5 — GPT-4o speaker correction...")
        corrected_segments = await _correct_speakers_gpt(transcribed_segments, sync_client)

        # ── Step 6: Translate ───────────────────────────────────────────────
        logger.info("[PIPELINE] Step 6 — translating Urdu → English...")
        for i, seg in enumerate(corrected_segments):
            text = seg.get('text', '')
            if text and seg.get('language', 'Urdu') == 'Urdu':
                english = await translate_to_english(text)
                corrected_segments[i]['text_english'] = english
                corrected_segments[i]['text_urdu'] = text
            else:
                corrected_segments[i]['text_english'] = text
                corrected_segments[i]['text_urdu'] = ''
        logger.info("[PIPELINE] Step 6 — translation done")

        # ════════════════════════════════════════════════════════════════════
        # EMOTION STAGE 1 — Wav2Vec2 audio emotion
        # Run immediately after audio is available (before GPT sees anything).
        # Results logged to console so you can verify each model independently.
        # ════════════════════════════════════════════════════════════════════
        logger.info("[PIPELINE] Step 7 ═══ EMOTION STAGE 1: Wav2Vec2 audio emotion ═══")
        audio_emotion_map: Dict[str, Optional[AudioEmotionResult]] = {}

        for seg in corrected_segments:
            seg_id = seg.get('id', '?')
            try:
                start_ms = int(float(seg.get('start', 0)) * 1000)
                end_ms = int(float(seg.get('end', 0)) * 1000)

                if end_ms - start_ms >= 500:
                    audio_slice = full_audio_16k[start_ms:end_ms]
                    audio_bytes = audio_slice.raw_data
                    audio_res = await analyze_audio_emotion(audio_bytes, sample_rate=16000)
                    audio_emotion_map[seg_id] = audio_res

                    # ── console debug — visible in server logs ──────────────
                    logger.info(
                        f"[EMOTION-AUDIO] seg={seg_id} | "
                        f"speaker={seg.get('speaker','?')} | "
                        f"time={seg.get('start',0):.1f}s-{seg.get('end',0):.1f}s | "
                        f">>> audio_emotion={audio_res.primary_emotion.value.upper()} "
                        f"confidence={audio_res.confidence:.3f} | "
                        f"all_scores={_fmt_scores(audio_res.all_scores)}"
                    )
                else:
                    audio_emotion_map[seg_id] = None
                    logger.warning(
                        f"[EMOTION-AUDIO] seg={seg_id} — slice {end_ms-start_ms}ms "
                        f"too short (min 500ms), skipping"
                    )
            except Exception as e:
                audio_emotion_map[seg_id] = None
                logger.error(f"[EMOTION-AUDIO] seg={seg_id} — Wav2Vec2 ERROR: {e}")

        logger.info("[PIPELINE] Step 7 ═══ EMOTION STAGE 1 complete ═══")

        # ════════════════════════════════════════════════════════════════════
        # EMOTION STAGE 2 — distilroberta text emotion
        # Run AFTER translation so English text is available.
        # ════════════════════════════════════════════════════════════════════
        logger.info("[PIPELINE] Step 8 ═══ EMOTION STAGE 2: distilroberta text emotion ═══")
        text_emotion_map: Dict[str, Optional[TextEmotionResult]] = {}

        for seg in corrected_segments:
            seg_id = seg.get('id', '?')
            text_en = seg.get('text_english', '').strip()

            if text_en:
                try:
                    text_res = await analyze_text_emotion(text_en)
                    text_emotion_map[seg_id] = text_res

                    # ── console debug ───────────────────────────────────────
                    logger.info(
                        f"[EMOTION-TEXT] seg={seg_id} | "
                        f"speaker={seg.get('speaker','?')} | "
                        f">>> text_emotion={text_res.primary_emotion.value.upper()} "
                        f"confidence={text_res.confidence:.3f} | "
                        f"all_scores={_fmt_scores(text_res.all_scores)} | "
                        f'snippet="{text_en[:80]}"'
                    )
                except Exception as e:
                    text_emotion_map[seg_id] = None
                    logger.error(f"[EMOTION-TEXT] seg={seg_id} — distilroberta ERROR: {e}")
            else:
                text_emotion_map[seg_id] = None
                logger.debug(f"[EMOTION-TEXT] seg={seg_id} — no English text, skipped")

        logger.info("[PIPELINE] Step 8 ═══ EMOTION STAGE 2 complete ═══")

        # ════════════════════════════════════════════════════════════════════
        # EMOTION FUSION — GPT-4o-mini
        # Receives both audio + text results and resolves the final label.
        # ════════════════════════════════════════════════════════════════════
        logger.info("[PIPELINE] Step 9 ═══ EMOTION FUSION: GPT-4o-mini ═══")
        final_segments = []

        for seg in corrected_segments:
            seg_id = seg.get('id', '?')
            audio_res = audio_emotion_map.get(seg_id)
            text_res = text_emotion_map.get(seg_id)
            text_en = seg.get('text_english', '').strip()
            emotion_result: SegmentEmotionResult

            if audio_res and text_res and text_en:
                # ── Both signals → GPT fusion ───────────────────────────────
                try:
                    fused_em, fused_conf = await _fuse_emotions_with_gpt(
                        audio_result=audio_res, text_result=text_res, text=text_en
                    )
                    agreement = (audio_res.primary_emotion == text_res.primary_emotion)
                    emotion_result = SegmentEmotionResult(
                        audio_emotion=audio_res.primary_emotion,
                        audio_confidence=audio_res.confidence,
                        text_emotion=text_res.primary_emotion,
                        text_confidence=text_res.confidence,
                        final_emotion=fused_em,
                        final_confidence=fused_conf,
                        agreement=agreement,
                        analysis_type="combined"
                    )
                    logger.info(
                        f"[EMOTION-FUSION] seg={seg_id} | "
                        f"INPUT audio={audio_res.primary_emotion.value}({audio_res.confidence:.2f}) "
                        f"text={text_res.primary_emotion.value}({text_res.confidence:.2f}) "
                        f"agree={agreement} | "
                        f">>> GPT_FINAL={fused_em.value.upper()}({fused_conf:.2f})"
                    )
                except Exception as e:
                    logger.error(f"[EMOTION-FUSION] seg={seg_id} — GPT failed: {e}, using fallback")
                    agreement = (audio_res.primary_emotion == text_res.primary_emotion)
                    if agreement:
                        final_em, final_conf = audio_res.primary_emotion, max(audio_res.confidence, text_res.confidence)
                    elif audio_res.confidence > 0.6:
                        final_em, final_conf = audio_res.primary_emotion, audio_res.confidence * 0.8
                    else:
                        final_em, final_conf = text_res.primary_emotion, text_res.confidence * 0.8
                    emotion_result = SegmentEmotionResult(
                        audio_emotion=audio_res.primary_emotion, audio_confidence=audio_res.confidence,
                        text_emotion=text_res.primary_emotion, text_confidence=text_res.confidence,
                        final_emotion=final_em, final_confidence=final_conf,
                        agreement=agreement, analysis_type="combined"
                    )
                    logger.info(f"[EMOTION-FUSION] seg={seg_id} FALLBACK >>> {final_em.value.upper()}({final_conf:.2f})")

            elif text_res:
                # ── Text only ───────────────────────────────────────────────
                emotion_result = SegmentEmotionResult.from_text_only(text_res)
                logger.info(
                    f"[EMOTION-FUSION] seg={seg_id} TEXT-ONLY >>> "
                    f"{text_res.primary_emotion.value.upper()}({text_res.confidence:.2f})"
                )
            elif audio_res:
                # ── Audio only (no translation) ─────────────────────────────
                emotion_result = SegmentEmotionResult(
                    audio_emotion=audio_res.primary_emotion, audio_confidence=audio_res.confidence,
                    text_emotion=None, text_confidence=0.0,
                    final_emotion=audio_res.primary_emotion, final_confidence=audio_res.confidence,
                    agreement=None, analysis_type="audio_only"
                )
                logger.info(
                    f"[EMOTION-FUSION] seg={seg_id} AUDIO-ONLY >>> "
                    f"{audio_res.primary_emotion.value.upper()}({audio_res.confidence:.2f})"
                )
            else:
                # ── Nothing worked ──────────────────────────────────────────
                emotion_result = SegmentEmotionResult(
                    final_emotion=EmotionLabel.NEUTRAL, analysis_type="text_only"
                )
                logger.warning(f"[EMOTION-FUSION] seg={seg_id} — no emotion data → NEUTRAL")

            ts = TranscriptionSegment(
                id=str(seg.get('id', '')),
                speaker=str(seg.get('speaker', 'UNKNOWN')),
                start_time=float(seg.get('start', 0.0)),
                end_time=float(seg.get('end', 0.0)),
                duration=float(seg.get('duration', 0.0)),
                text_urdu=str(seg.get('text_urdu', '')),
                text_english=str(seg.get('text_english', '')),
                emotion=emotion_result
            )
            final_segments.append(ts)

        logger.info("[PIPELINE] Step 9 ═══ EMOTION FUSION complete ═══")

        combined = sum(1 for s in final_segments if s.emotion and s.emotion.analysis_type == "combined")
        text_only = sum(1 for s in final_segments if s.emotion and s.emotion.analysis_type == "text_only")
        audio_only = sum(1 for s in final_segments if s.emotion and s.emotion.analysis_type == "audio_only")
        logger.info(
            f"[PIPELINE] Emotion summary: combined={combined} "
            f"text_only={text_only} audio_only={audio_only} total={len(final_segments)}"
        )

        # Save to in-memory state
        total_duration = max((s.end_time for s in final_segments), default=0.0)
        speakers = {s.speaker for s in final_segments}
        full_transcript = FullTranscript(
            session_id=session_id, segments=final_segments,
            total_duration=total_duration, speaker_count=len(speakers),
            created_at=datetime.utcnow(), updated_at=datetime.utcnow()
        )
        session_manager.update_session(
            session_id,
            segments=[s.model_dump(mode='json') for s in final_segments],
            finalized_segments=[s.model_dump() for s in final_segments],
            finalization_complete=True
        )

        # ── Step 10: Save to DB ──────────────────────────────────────────────
        if save_to_db and django_session_id:
            await save_transcript_to_db(full_transcript, django_session_id)
            logger.info(f"[PIPELINE] Step 10 — saved to DB")

        logger.info(f"[PIPELINE] ═══ COMPLETE: {len(final_segments)} segments ═══")

    except Exception as e:
        logger.error(f"[PIPELINE] FATAL ERROR session={session_id}: {e}", exc_info=True)
    finally:
        for path in [tmp_raw, tmp_resampled]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


# ============================================================================
# GPT Speaker Correction
# ============================================================================

async def _correct_speakers_gpt(segments: list, sync_client) -> list:
    if not segments:
        return segments

    import re
    all_sentences = []
    sentence_to_segment_map = []

    for seg_idx, seg in enumerate(segments):
        text = seg.get('text', '').strip()
        if not text:
            all_sentences.append('[inaudible]')
            sentence_to_segment_map.append(seg_idx)
            continue
        for s in re.split(r'(?<=[.!?])\s+', text):
            s = s.strip()
            if s:
                all_sentences.append(s)
                sentence_to_segment_map.append(seg_idx)

    if not all_sentences:
        return segments

    numbered_lines = "\n".join(f"Line {i+1}: {s}" for i, s in enumerate(all_sentences))

    prompt = f"""You are a clinical transcript analyst.
Assign THERAPIST or PATIENT to each line based purely on content.
THERAPIST: asks questions, reflects, guides, professional tone.
PATIENT: answers, shares personal experiences, emotional disclosures.

SENTENCES:
{numbered_lines}

Return ONLY valid JSON: {{"1": "THERAPIST", "2": "PATIENT", ...}}
Every line from 1 to {len(all_sentences)} must appear. No markdown, no explanation."""

    try:
        import json as json_lib
        response = sync_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a clinical transcript analyst. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0, max_tokens=4000
        )
        correction_text = response.choices[0].message.content.strip()
        if "```json" in correction_text:
            correction_text = correction_text.split("```json")[1].split("```")[0].strip()
        elif "```" in correction_text:
            correction_text = correction_text.split("```")[1].split("```")[0].strip()

        sentence_labels = json_lib.loads(correction_text)

        from collections import defaultdict, Counter
        seg_label_map: dict = defaultdict(list)
        for si, seg_idx in enumerate(sentence_to_segment_map):
            label = sentence_labels.get(str(si + 1), '').upper()
            if label in ('THERAPIST', 'PATIENT'):
                seg_label_map[seg_idx].append(label)

        corrected = []
        for seg_idx, seg in enumerate(segments):
            new_seg = dict(seg)
            labels = seg_label_map.get(seg_idx, [])
            if labels:
                new_seg['speaker'] = Counter(labels).most_common(1)[0][0]
            corrected.append(new_seg)

        logger.info(f"[SPEAKER-CORRECTION] {len(all_sentences)} sentences → {len(corrected)} segments corrected")
        return corrected

    except Exception as e:
        logger.error(f"[SPEAKER-CORRECTION] GPT failed: {e}")
        return segments


# ============================================================================
# WebSocket
# ============================================================================

@router.websocket("/ws/{session_id}")
async def websocket_transcription(websocket: WebSocket, session_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    try:
        auth_session = await get_websocket_session(websocket, token)
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        return
    if auth_session.session_id != session_id:
        await websocket.close(code=4003, reason="Session ID mismatch")
        return

    await websocket.accept()
    session_manager.connections[session_id] = websocket
    await websocket.send_json({
        "type": "connection", "status": "connected",
        "message": "Connected to transcription service",
        "session_id": session_id, "timestamp": datetime.utcnow().isoformat()
    })
    logger.info(f"WebSocket connected for session {session_id}")

    try:
        chunk_index = 0
        accumulated_audio = b""
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON",
                                           "timestamp": datetime.utcnow().isoformat()})
                continue

            msg_type = message.get("type")
            if msg_type == "audio_chunk":
                try:
                    audio_b64 = message.get("audio_data", "")
                    client_chunk_index = message.get("chunk_index", chunk_index)
                    if audio_b64:
                        accumulated_audio += base64.b64decode(audio_b64)
                    chunk_index = client_chunk_index + 1
                    session_manager.update_session(
                        session_id, chunk_count=client_chunk_index, audio_buffer=accumulated_audio
                    )
                    await websocket.send_json({
                        "type": "chunk_received", "chunk_index": client_chunk_index,
                        "buffered_bytes": len(accumulated_audio),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": f"Buffering error: {e}",
                                               "timestamp": datetime.utcnow().isoformat()})
            elif msg_type == "heartbeat":
                await websocket.send_json({"type": "heartbeat_response",
                                           "timestamp": datetime.utcnow().isoformat()})
            elif msg_type == "stop":
                break
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown type: {msg_type}",
                                           "timestamp": datetime.utcnow().isoformat()})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error {session_id}: {e}")
    finally:
        session_manager.connections.pop(session_id, None)


# ============================================================================
# Finalize endpoint (same staged approach)
# ============================================================================

@router.post("/{session_id}/finalize")
async def finalize_session(
    session_id: str,
    session: AuthenticatedSession = Depends(get_current_session)
):
    if session.session_id and session.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    try:
        from ..services.transcription import transcribe_full_audio_diarized
        from ..services.transcription_refinement import normalize_segments_for_therapy
        from ..services.emotion import analyze_audio_emotion, analyze_text_emotion, _fuse_emotions_with_gpt

        audio_path = session_data.get("config", {}).get("audio_path")
        language = session_data.get("config", {}).get("language", "ur")
        segments = []

        if audio_path:
            diarized = await transcribe_full_audio_diarized(audio_path, language=language)
            segments = diarized.get("segments", [])
            if diarized.get("error"):
                raise RuntimeError(diarized["error"])
        else:
            for s in session_data.get("segments", []):
                seg = TranscriptionSegment(**s)
                segments.append({
                    "id": seg.id, "start": seg.start_time, "end": seg.end_time,
                    "duration": seg.duration, "speaker": seg.speaker,
                    "text": seg.text_urdu or seg.text_english or ""
                })

        if not segments:
            return {"session_id": session_id, "status": "no_data", "message": "No segments"}

        normalized = await normalize_segments_for_therapy(segments)
        changes = sum(1 for i, s in enumerate(segments)
                      if i < len(normalized) and s.get('speaker') != normalized[i].get('speaker'))

        finalized = [
            TranscriptionSegment(
                id=str(s.get("id", "")), speaker=str(s.get("speaker", "PATIENT")),
                start_time=float(s.get("start", 0.0) or 0.0),
                end_time=float(s.get("end", 0.0) or 0.0),
                duration=float(s.get("duration", 0.0) or 0.0),
                text_urdu=str(s.get("text_original", "") or ""),
                text_english=str(s.get("text_english", "") or ""),
                emotion=None
            ) for s in normalized
        ]

        full_audio = None
        if audio_path and os.path.exists(audio_path):
            try:
                import pydub
                full_audio = pydub.AudioSegment.from_file(audio_path)
                full_audio = full_audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            except Exception as e:
                logger.error(f"[FINALIZE] Audio load failed: {e}")

        for i, seg in enumerate(finalized):
            text = seg.text_english or seg.text_urdu or ''
            audio_res = None
            text_res = None

            # Stage 1: audio
            if full_audio and text.strip():
                try:
                    start_ms = int(seg.start_time * 1000)
                    end_ms = max(int(seg.end_time * 1000), start_ms + 1000)
                    if end_ms - start_ms >= 500:
                        audio_slice = full_audio[start_ms:end_ms]
                        audio_res = await analyze_audio_emotion(audio_slice.raw_data, sample_rate=16000)
                        logger.info(f"[FINALIZE-AUDIO] seg={seg.id} >>> {audio_res.primary_emotion.value.upper()}({audio_res.confidence:.2f})")
                except Exception as e:
                    logger.warning(f"[FINALIZE-AUDIO] seg={seg.id} failed: {e}")

            # Stage 2: text
            if text.strip():
                try:
                    text_res = await analyze_text_emotion(text)
                    logger.info(f"[FINALIZE-TEXT] seg={seg.id} >>> {text_res.primary_emotion.value.upper()}({text_res.confidence:.2f})")
                except Exception as e:
                    logger.warning(f"[FINALIZE-TEXT] seg={seg.id} failed: {e}")

            # Fusion
            if audio_res and text_res and text.strip():
                try:
                    fused_em, fused_conf = await _fuse_emotions_with_gpt(audio_res, text_res, text)
                    finalized[i].emotion = SegmentEmotionResult(
                        audio_emotion=audio_res.primary_emotion, audio_confidence=audio_res.confidence,
                        text_emotion=text_res.primary_emotion, text_confidence=text_res.confidence,
                        final_emotion=fused_em, final_confidence=fused_conf,
                        agreement=(audio_res.primary_emotion == text_res.primary_emotion),
                        analysis_type="combined"
                    )
                    logger.info(f"[FINALIZE-FUSION] seg={seg.id} >>> GPT_FINAL={fused_em.value.upper()}({fused_conf:.2f})")
                except Exception as e:
                    finalized[i].emotion = SegmentEmotionResult.from_text_only(text_res)
            elif text_res:
                finalized[i].emotion = SegmentEmotionResult.from_text_only(text_res)
            else:
                finalized[i].emotion = SegmentEmotionResult(final_emotion=EmotionLabel.NEUTRAL, analysis_type="text_only")

        speakers = sorted({s.speaker for s in finalized})
        patient_speaker = 'PATIENT' if 'PATIENT' in speakers else (speakers[1] if len(speakers) > 1 else speakers[0] if speakers else 'UNKNOWN')
        segments_dump = [s.model_dump() for s in finalized]
        session_manager.update_session(
            session_id, segments=segments_dump, finalized_segments=segments_dump,
            patient_speaker=patient_speaker, finalization_complete=True, finalized_at=datetime.utcnow()
        )

        return {
            "session_id": session_id, "status": "finalized",
            "speaker_corrections": changes, "total_segments": len(finalized),
            "patient_speaker": patient_speaker, "message": "Finalization complete."
        }

    except Exception as e:
        logger.error(f"[FINALIZE] ERROR {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================================================
# DB Save
# ============================================================================

async def save_transcript_to_db(transcript: FullTranscript, django_session_id: str):
    import uuid as uuid_lib
    from datetime import datetime as dt

    async with get_db_context() as db:
        transcription = Transcription(
            id=uuid_lib.uuid4(), session_id=uuid_lib.UUID(django_session_id),
            status='completed', processing_completed_at=dt.utcnow()
        )
        db.add(transcription)
        await db.flush()

        for seg in transcript.segments:
            sv = str(seg.speaker or "").strip().upper()
            speaker_type = "therapist" if sv == "THERAPIST" else ("patient" if sv == "PATIENT" else "unknown")
            segment_text = seg.text_english or seg.text_urdu or ""
            lang = "en" if seg.text_english else ("ur" if seg.text_urdu else "")

            db_seg = DBTranscriptionSegment(
                transcription_id=transcription.id, speaker_type=speaker_type,
                speaker_id=seg.speaker, text=segment_text,
                start_time=seg.start_time, end_time=seg.end_time,
                confidence_score=1.0, language=lang
            )
            db.add(db_seg)
            await db.flush()

            em: Optional[SegmentEmotionResult] = seg.emotion
            if em and em.final_emotion != EmotionLabel.UNKNOWN:
                scores = {
                    "final": em.final_emotion.value,
                    "final_confidence": em.final_confidence,
                    "analysis_type": em.analysis_type
                }
                if em.audio_emotion:
                    scores["audio"] = em.audio_emotion.value
                    scores["audio_confidence"] = em.audio_confidence
                if em.text_emotion:
                    scores["text"] = em.text_emotion.value
                    scores["text_confidence"] = em.text_confidence
                if em.agreement is not None:
                    scores["agreement"] = em.agreement
                # Map emotion → valence/arousal (Russell model)
                _EMOTION_DIMENSIONAL = {
                    "joy": (0.85, 0.75),
                    "surprise": (0.10, 0.85),
                    "neutral": (0.00, 0.20),
                    "fear": (-0.65, 0.80),
                    "sadness": (-0.70, 0.25),
                    "anger": (-0.60, 0.90),
                    "disgust": (-0.75, 0.55),
                    "unknown": (0.00, 0.00),
                }

                emotion_key = em.final_emotion.value
                v, a = _EMOTION_DIMENSIONAL.get(emotion_key, (0.0, 0.0))
                db.add(EmotionAnalysis(
                    segment_id=db_seg.id, primary_emotion=em.final_emotion.value,
                    emotion_scores=scores, valence=v,arousal=a,
                    confidence=em.final_confidence
                ))

        await db.commit()
async def _load_transcript_from_db(session_id: str) -> FullTranscript:
    """Load transcript + emotion data from DB for completed sessions."""
    import uuid as uuid_lib
    from sqlalchemy import select
    
    async with get_db_context() as db:
        result = await db.execute(
            select(Transcription)
            .where(Transcription.session_id == uuid_lib.UUID(session_id))
            .order_by(Transcription.processing_completed_at.desc())
            .limit(1)
        )
        transcription_row = result.scalar_one_or_none()
        if not transcription_row:
            raise ValueError("No transcription in DB")
        
        seg_result = await db.execute(
            select(DBTranscriptionSegment, EmotionAnalysis)
            .outerjoin(EmotionAnalysis, EmotionAnalysis.segment_id == DBTranscriptionSegment.id)
            .where(DBTranscriptionSegment.transcription_id == transcription_row.id)
            .order_by(DBTranscriptionSegment.start_time)
        )
        rows = seg_result.all()
        
        segments = []
        for i, (seg, em_row) in enumerate(rows):
            emotion = None
            if em_row and em_row.emotion_scores:
                scores = em_row.emotion_scores
                try:
                    emotion = SegmentEmotionResult(
                        audio_emotion=normalize_emotion_label(scores["audio"]) if scores.get("audio") else None,
                        audio_confidence=float(scores.get("audio_confidence", 0.0)),
                        text_emotion=normalize_emotion_label(scores["text"]) if scores.get("text") else None,
                        text_confidence=float(scores.get("text_confidence", 0.0)),
                        final_emotion=normalize_emotion_label(em_row.primary_emotion),
                        final_confidence=float(em_row.confidence or 0.0),
                        agreement=scores.get("agreement"),
                        analysis_type=scores.get("analysis_type", "text_only")
                    )
                except Exception as e:
                    logger.warning(f"Could not reconstruct emotion for seg {i}: {e}")
            
            segments.append(TranscriptionSegment(
                id=str(seg.id),
                speaker=seg.speaker_type.upper() if seg.speaker_type else "UNKNOWN",
                start_time=float(seg.start_time or 0),
                end_time=float(seg.end_time or 0),
                duration=float((seg.end_time or 0) - (seg.start_time or 0)),
                text_urdu="" if seg.language == "en" else (seg.text or ""),
                text_english=seg.text if seg.language == "en" else "",
                emotion=emotion
            ))
        
        total_duration = max((s.end_time for s in segments), default=0.0)
        return FullTranscript(
            session_id=session_id,
            segments=segments,
            total_duration=total_duration,
            speaker_count=len({s.speaker for s in segments}),
            created_at=transcription_row.processing_completed_at,
            updated_at=transcription_row.processing_completed_at
        )