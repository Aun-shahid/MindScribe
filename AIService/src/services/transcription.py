"""
Transcription Service - Audio transcription using OpenAI transcription models (gpt-4o-transcribe).
Handles audio processing and transcription for therapy sessions.
"""
import asyncio
import io
import tempfile
import os
from typing import Dict, Optional, Any
import logging

from openai import AsyncOpenAI
import soundfile as sf
import numpy as np

from ..config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI async client."""
    global openai_client
    if openai_client is None:
        openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return openai_client


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
