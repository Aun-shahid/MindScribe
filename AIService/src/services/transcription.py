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
