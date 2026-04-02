"""
Transcription Service - Audio transcription using OpenAI and ElevenLabs models.
Handles audio processing and transcription for therapy sessions.
"""
import asyncio
import io
import tempfile
import os
import json
from pathlib import Path
from typing import Dict, Optional, Any, List
import logging

from openai import AsyncOpenAI
import requests
import soundfile as sf
import numpy as np

from ..config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client: Optional[AsyncOpenAI] = None

MAX_DIARIZATION_UPLOAD_BYTES = 3 * 1024 * 1024 * 1024
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_MODEL_ID = "scribe_v2"
SENTENCE_END_CHARS = {".", "!", "?", "۔", "؟"}
DEFAULT_KEYTERMS = ["therapy", "session", "patient", "therapist", "mindscribe"]


def _get_value(obj: Any, key: str, default: Any = None) -> Any:
    """Safely read a field from dict-like or object-like responses."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI async client."""
    global openai_client
    if openai_client is None:
        openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return openai_client


def _bool_to_api(value: bool) -> str:
    return "true" if value else "false"


def _token_ends_sentence(token_text: str) -> bool:
    token = token_text.rstrip()
    return bool(token) and token[-1] in SENTENCE_END_CHARS


def _flush_segment(segments: List[Dict[str, Any]], current: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if current is None:
        return None

    text = str(current.get("text", "")).strip()
    if not text:
        return None

    segments.append(
        {
            "start": float(current["start"]),
            "end": float(current["end"]),
            "speaker": str(current["speaker"]),
            "text": text,
        }
    )
    return None


def _build_sentence_segments_from_words(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for word in words:
        if not isinstance(word, dict):
            continue

        token = str(word.get("text", ""))
        if not token:
            continue

        token_type = str(word.get("type") or "word")
        speaker = str(word.get("speaker_id") or "unknown")
        start = float(word.get("start") or 0.0)
        end = float(word.get("end") or start)

        if current is not None and current["speaker"] != speaker:
            current = _flush_segment(segments, current)

        if current is None:
            if token_type == "spacing":
                continue
            current = {
                "start": start,
                "end": end,
                "speaker": speaker,
                "text": token,
            }
        else:
            current["end"] = end
            current["text"] += token

        if token_type != "spacing" and _token_ends_sentence(token):
            current = _flush_segment(segments, current)

    _flush_segment(segments, current)
    return segments


def _request_elevenlabs_transcription_sync(
    api_key: str,
    audio_path: str,
    language: str,
    num_speakers: Optional[int],
) -> Dict[str, Any]:
    if num_speakers is not None:
        num_speakers = max(1, min(32, num_speakers))

    payload: Dict[str, Any] = {
        "model_id": ELEVENLABS_MODEL_ID,
        "language_code": language,
        "tag_audio_events": True,
        "num_speakers": num_speakers,
        "timestamps_granularity": "word",
        "diarize": True,
        "diarization_threshold": 0.22 if num_speakers is None else None,
        "additional_formats": [],
        "file_format": "other",
        "webhook": False,
        "webhook_id": None,
        "temperature": 0.0,
        "seed": 42,
        "use_multi_channel": False,
        "webhook_metadata": {"source": "ai_service", "pipeline": "session"},
        "entity_detection": "all",
        "no_verbatim": False,
        "entity_redaction": "pii",
        "entity_redaction_mode": "enumerated_entity_type",
        "keyterms": DEFAULT_KEYTERMS,
    }

    data_items: List[tuple[str, str]] = []
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, bool):
            data_items.append((key, _bool_to_api(value)))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, (dict, list)):
                    data_items.append((key, json.dumps(item, ensure_ascii=False)))
                else:
                    data_items.append((key, str(item)))
        elif isinstance(value, dict):
            data_items.append((key, json.dumps(value, ensure_ascii=False)))
        else:
            data_items.append((key, str(value)))

    headers = {"xi-api-key": api_key}
    params = {"enable_logging": _bool_to_api(True)}

    with open(audio_path, "rb") as audio_file:
        files = {"file": (Path(audio_path).name, audio_file, "application/octet-stream")}
        response = requests.post(
            ELEVENLABS_STT_URL,
            headers=headers,
            params=params,
            data=data_items,
            files=files,
            timeout=900,
        )

    parsed_payload: Optional[Dict[str, Any]]
    try:
        raw_payload = response.json()
        parsed_payload = raw_payload if isinstance(raw_payload, dict) else None
    except Exception:
        parsed_payload = None

    if response.status_code >= 400:
        if parsed_payload is not None:
            raise RuntimeError(
                f"ElevenLabs transcription failed ({response.status_code}): "
                f"{json.dumps(parsed_payload, ensure_ascii=False)}"
            )
        raise RuntimeError(f"ElevenLabs transcription failed ({response.status_code}): {response.text}")

    if parsed_payload is None:
        raise RuntimeError("ElevenLabs transcription returned an unexpected response format.")

    return parsed_payload


async def transcribe_audio_chunk(
    audio_data: bytes,
    language: str = "ur",
    response_format: str = "json"
) -> Dict[str, Any]:
    """
    Transcribe an audio chunk using OpenAI Whisper API.
    
    Args:
        audio_data: Raw audio bytes (WAV format preferred)
        language: Language code (default: "ur" for Urdu)
        response_format: Response format from API
        
    Returns:
        Dict with transcription text and metadata
    """
    try:
        client = get_openai_client()
        
        # Save audio to temporary file (Whisper API requires file)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            # If audio_data is raw PCM, convert to WAV
            if len(audio_data) > 0:
                # Assume 16kHz, 16-bit, mono PCM
                audio_array = np.frombuffer(audio_data, dtype=np.int16)
                audio_float = audio_array.astype(np.float32) / 32768.0
                
                sf.write(tmp_file.name, audio_float, settings.target_sample_rate, subtype='PCM_16')
            else:
                return {"text": "", "text_en": "", "error": "Empty audio data"}
            
            tmp_path = tmp_file.name
        
        try:
            # Transcribe using OpenAI "gpt-4o-transcribe"
            with open(tmp_path, "rb") as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="gpt-4o-transcribe",
                    file=audio_file,
                    language=language,
                    response_format="text"
                )
            
            # Get text (response is just the string when format is "text")
            text = transcript.strip() if isinstance(transcript, str) else str(transcript)
            
            # Also get English translation if Urdu
            text_en = ""
            if language == "ur" and text:
                text_en = await translate_to_english(text)
            
            return {
                "text": text,
                "text_en": text_en,
                "language": language,
                "speaker": "SPEAKER_00"  # Placeholder - would come from diarization
            }
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"text": "", "text_en": "", "error": str(e)}


async def translate_to_english(
    urdu_text: str,
    emotional_context: Optional[str] = None
) -> str:
    """
    Translate Urdu text to English with emotional context preservation.
    
    Args:
        urdu_text: Text in Urdu
        emotional_context: Optional emotion label for context
        
    Returns:
        English translation
    """
    try:
        client = get_openai_client()
        
        context = ""
        if emotional_context:
            context = f"The speaker is expressing {emotional_context} emotion. "
        
        prompt = f"""Translate the following Urdu text to English.
{context}Preserve the emotional tone and therapeutic context in your translation.

Urdu text: {urdu_text}

Provide only the English translation."""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert translator specializing in Urdu to English translation for therapeutic contexts. Preserve emotional nuance and cultural context."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return ""


async def transcribe_full_audio(
    audio_path: str,
    language: str = "ur"
) -> Dict[str, Any]:
    """
    Transcribe a complete audio file.
    
    Args:
        audio_path: Path to audio file
        language: Language code
        
    Returns:
        Full transcription with metadata
    """
    try:
        client = get_openai_client()
        
        with open(audio_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=audio_file,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
        
        # Parse segments
        segments = []
        if hasattr(transcript, 'segments'):
            for seg in transcript.segments:
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "")
                })
        
        return {
            "text": transcript.text if hasattr(transcript, 'text') else str(transcript),
            "segments": segments,
            "language": language,
            "duration": transcript.duration if hasattr(transcript, 'duration') else 0
        }
        
    except Exception as e:
        logger.error(f"Full transcription error: {e}")
        return {"text": "", "segments": [], "error": str(e)}


async def transcribe_full_audio_diarized(
    audio_path: str,
    language: str = "ur",
    known_speakers: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Transcribe complete audio with speaker diarization using ElevenLabs Scribe.

    Returns:
        Dict containing transcript text and diarized segments.
    """
    try:
        if not settings.elevenlabs_api_key:
            return {"text": "", "segments": [], "error": "ELEVENLABS_API_KEY is not configured"}

        source_path = Path(audio_path)
        if not source_path.exists() or not source_path.is_file():
            return {"text": "", "segments": [], "error": f"Audio file not found: {audio_path}"}

        file_size = source_path.stat().st_size
        if file_size > MAX_DIARIZATION_UPLOAD_BYTES:
            logger.warning(
                "Diarized transcription input is %.2f MB (> 3 GB API limit)",
                file_size / (1024 * 1024),
            )

        num_speakers: Optional[int] = None
        if known_speakers:
            num_speakers = len([s for s in known_speakers if str(s).strip()])

        transcript = await asyncio.to_thread(
            _request_elevenlabs_transcription_sync,
            settings.elevenlabs_api_key,
            str(source_path),
            language,
            num_speakers,
        )

        words = transcript.get("words", []) if isinstance(transcript.get("words"), list) else []
        sentence_segments = _build_sentence_segments_from_words(words)

        segments: List[Dict[str, Any]] = []
        for idx, seg in enumerate(sentence_segments):
            start = float(seg.get("start", 0.0) or 0.0)
            end = float(seg.get("end", 0.0) or 0.0)
            text = str(seg.get("text", "") or "").strip()
            speaker = str(seg.get("speaker", "unknown") or "unknown")
            seg_id = f"seg_{idx:04d}"

            if not text:
                continue

            segments.append(
                {
                    "id": seg_id,
                    "start": start,
                    "end": end,
                    "duration": max(0.0, end - start),
                    "speaker": speaker,
                    "text": text,
                }
            )

        duration = max((s["end"] for s in segments), default=0.0)

        return {
            "text": str(transcript.get("text", "") or ""),
            "duration": duration,
            "segments": segments,
            "language": str(transcript.get("language_code", language) or language),
        }

    except Exception as e:
        logger.error(f"Diarized full transcription error: {e}")
        return {"text": "", "segments": [], "error": str(e)}


async def quick_transcribe_segment(
    audio_path: str,
    start: float,
    end: float,
    language: str = "auto"
) -> tuple:
    """
    Quickly transcribe a specific time segment from audio file.
    Auto-detects language but constrains to English or Urdu only.
    
    Args:
        audio_path: Path to audio file
        start: Start time in seconds
        end: End time in seconds
        language: Language code ("ur", "en", or "auto" for detection)
        
    Returns:
        Tuple of (text, language_name)
    """
    try:
        import asyncio
        from pydub import AudioSegment
        
        # Run in executor to avoid blocking on file I/O
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _quick_transcribe_segment_sync,
            audio_path,
            start,
            end,
            language
        )
        return result
        
    except Exception as e:
        logger.error(f"Quick transcribe error: {e}")
        return "", "English"


def _quick_transcribe_segment_sync(
    audio_path: str,
    start: float,
    end: float,
    language: str = "auto"
) -> tuple:
    """Synchronous segment transcription helper."""
    try:
        from pydub import AudioSegment
        from openai import OpenAI
        
        # Extract segment from audio
        audio = AudioSegment.from_file(audio_path)
        start_ms = int(start * 1000)
        end_ms = int(end * 1000)
        segment = audio[start_ms:end_ms]
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            segment.export(tmp.name, format="wav")
            segment_path = tmp.name
        
        try:
            # Initialize sync client
            client = OpenAI(api_key=settings.openai_api_key)
            
            # Auto-detect language if not specified
            if language == "auto":
                with open(segment_path, "rb") as audio_file:
                    detect_response = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json"
                    )
                
                detected_lang = detect_response.language if hasattr(detect_response, 'language') else 'en'
                
                # Constrain to English or Urdu
                if detected_lang in ['en', 'english']:
                    force_lang = 'en'
                    lang_name = 'English'
                else:
                    # Anything else → force to Urdu
                    force_lang = 'ur'
                    lang_name = 'Urdu'
            else:
                force_lang = language
                lang_name = 'Urdu' if language == 'ur' else 'English'
            
            # Transcribe with forced language
            with open(segment_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=force_lang,
                    response_format="text"
                )
            
            text = response.strip() if isinstance(response, str) else response
            
            logger.debug(f"Transcribed segment {start:.1f}s-{end:.1f}s as {lang_name}")
            return text, lang_name
            
        finally:
            # Clean up temp file
            if os.path.exists(segment_path):
                os.unlink(segment_path)
                
    except Exception as e:
        logger.error(f"Segment transcription sync error: {e}")
        return "", "English"


async def translate_all_segments(
    audio_path: str,
    segments: list,
    emotion_context: bool = True
) -> list:
    """
    Translate all segments from Urdu to English.
    
    Args:
        audio_path: Path to audio file (for extracting segment audio if needed)
        segments: List of segments with emotion and diarization data
        emotion_context: Whether to use emotion context in translation
        
    Returns:
        Segments with 'english' and 'urdu' fields added
    """
    try:
        translated_segments = []
        client = get_openai_client()
        
        logger.info(f"Beginning translation of {len(segments)} segments...")
        
        for idx, segment in enumerate(segments):
            try:
                # Get existing urdu text if available
                urdu_text = segment.get('urdu', '')
                
                # If no urdu text, try to transcribe the segment
                if not urdu_text:
                    urdu_text, lang = await quick_transcribe_segment(
                        audio_path,
                        segment['start'],
                        segment['end'],
                        language='ur'
                    )
                    # Store the transcription
                    segment = dict(segment)
                    segment['urdu'] = urdu_text
                    segment['language'] = lang
                
                # Translate to English with emotional context
                emotion = segment.get('primary_emotion') or segment.get('emotion', '')
                
                # Convert EmotionLabel enum to string if needed
                if hasattr(emotion, 'value'):
                    emotion = emotion.value
                
                english_text = await translate_to_english(
                    urdu_text,
                    emotional_context=emotion if emotion_context else None
                )
                
                # Add translation to segment
                translated_segment = dict(segment)
                translated_segment['english'] = english_text
                translated_segments.append(translated_segment)
                
                logger.debug(f"Translated segment {idx+1}/{len(segments)}")
                
            except Exception as e:
                logger.warning(f"Error translating segment {idx+1}: {e}")
                # Keep original segment without translation
                translated_segment = dict(segment)
                translated_segment['english'] = ''
                translated_segments.append(translated_segment)
        
        logger.info(f"Translation complete for {len(translated_segments)} segments")
        return translated_segments
        
    except Exception as e:
        logger.error(f"Batch translation error: {e}")
        # Return segments as-is if translation fails
        return segments
