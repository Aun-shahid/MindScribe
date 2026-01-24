"""
SOAP Notes Generator Service - Generate structured SOAP notes using GPT-4o-mini.
"""
import asyncio
from typing import Optional, List
import logging
from datetime import datetime

from openai import AsyncOpenAI

from ..config import settings
from ..schemas import (
    SOAPNote, SOAPNoteSection, FullTranscript, TranscriptionSegment,
    EmotionLabel
)

logger = logging.getLogger(__name__)

# OpenAI client
_openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI async client."""
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def generate_soap_notes(
    session_id: str,
    transcript: FullTranscript,
    include_emotions: bool = True,
    additional_context: Optional[str] = None
) -> SOAPNote:
    """
    Generate SOAP notes from session transcript using GPT-4o-mini.
    
    Args:
        session_id: Session identifier
        transcript: Full transcript with segments
        include_emotions: Whether to include emotion analysis
        additional_context: Optional extra context from therapist
        
    Returns:
        Structured SOAPNote
    """
    client = get_openai_client()
    
    # Prepare transcript text with emotions
    transcript_text = _format_transcript_for_soap(transcript, include_emotions)
    
    # Prepare emotion summary if available
    emotion_summary = ""
    if include_emotions:
        emotion_summary = _generate_emotion_summary(transcript)
    
    # Build SOAP generation prompt
    system_prompt = """You are an expert therapy session analyst specializing in creating SOAP notes.
Your task is to generate accurate, professional SOAP notes from therapy session transcripts.

SOAP notes structure:
- Subjective (S): Patient's reported symptoms, feelings, concerns, and history in their own words
- Objective (O): Observable findings, behaviors, and measurable data from the session
- Assessment (A): Clinical interpretation, progress evaluation, and diagnostic considerations
- Plan (P): Treatment plan, interventions, homework, and follow-up recommendations

Guidelines:
- Be concise but comprehensive
- Use professional clinical language
- Maintain therapeutic confidentiality standards
- Note significant emotional patterns
- Include relevant quotes where appropriate
- Suggest areas for follow-up"""

    user_prompt = f"""Generate SOAP notes for this therapy session.

SESSION TRANSCRIPT:
{transcript_text}

{f"EMOTION ANALYSIS: {emotion_summary}" if emotion_summary else ""}

{f"ADDITIONAL CONTEXT: {additional_context}" if additional_context else ""}

Please provide structured SOAP notes with clear sections for Subjective, Objective, Assessment, and Plan.
Format your response as:
SUBJECTIVE:
[content]

OBJECTIVE:
[content]

ASSESSMENT:
[content]

PLAN:
[content]"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        soap_text = response.choices[0].message.content
        
        # Parse the response into sections
        sections = _parse_soap_response(soap_text)
        
        # Create segment references
        segment_ids = [seg.id for seg in transcript.segments[:5]]  # First 5 segments
        
        return SOAPNote(
            session_id=session_id,
            subjective=SOAPNoteSection(
                content=sections.get("subjective", "No data available"),
                confidence=0.9,
                sources=segment_ids
            ),
            objective=SOAPNoteSection(
                content=sections.get("objective", "No data available"),
                confidence=0.9,
                sources=segment_ids
            ),
            assessment=SOAPNoteSection(
                content=sections.get("assessment", "No data available"),
                confidence=0.85,
                sources=segment_ids
            ),
            plan=SOAPNoteSection(
                content=sections.get("plan", "No data available"),
                confidence=0.85,
                sources=segment_ids
            ),
            emotional_summary=emotion_summary if include_emotions else None,
            generated_at=datetime.utcnow(),
            model_version="gpt-4o-mini"
        )
        
    except Exception as e:
        logger.error(f"SOAP generation error: {e}")
        raise


def _format_transcript_for_soap(
    transcript: FullTranscript,
    include_emotions: bool
) -> str:
    """Format transcript for SOAP generation prompt."""
    lines = []
    
    for seg in transcript.segments:
        # Use English text if available, otherwise Urdu
        text = seg.text_english if seg.text_english else seg.text_urdu
        
        if not text:
            continue
        
        # Format with speaker and time
        time_str = f"[{seg.start_time:.1f}s]"
        speaker = seg.speaker
        
        line = f"{time_str} {speaker}: {text}"
        
        # Add emotion if available and requested
        if include_emotions and seg.emotion:
            emotion = seg.emotion.final_emotion.value
            confidence = seg.emotion.final_confidence
            line += f" [Emotion: {emotion}, {confidence:.0%}]"
        
        lines.append(line)
    
    return "\n".join(lines)


def _generate_emotion_summary(transcript: FullTranscript) -> str:
    """Generate summary of emotional patterns in session."""
    emotion_counts = {}
    total_with_emotion = 0
    
    for seg in transcript.segments:
        if seg.emotion:
            emotion = seg.emotion.final_emotion.value
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_with_emotion += 1
    
    if total_with_emotion == 0:
        return "No emotion data available."
    
    # Sort by frequency
    sorted_emotions = sorted(
        emotion_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    # Build summary
    parts = []
    for emotion, count in sorted_emotions[:3]:  # Top 3
        percentage = (count / total_with_emotion) * 100
        parts.append(f"{emotion} ({percentage:.0f}%)")
    
    return f"Primary emotions detected: {', '.join(parts)}"


def _parse_soap_response(response: str) -> dict:
    """Parse SOAP sections from GPT response."""
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": ""
    }
    
    # Define section markers
    markers = [
        ("SUBJECTIVE:", "subjective"),
        ("OBJECTIVE:", "objective"),
        ("ASSESSMENT:", "assessment"),
        ("PLAN:", "plan")
    ]
    
    # Find each section
    for i, (marker, key) in enumerate(markers):
        start_idx = response.upper().find(marker.upper())
        if start_idx == -1:
            continue
        
        # Find the next section or end
        content_start = start_idx + len(marker)
        
        end_idx = len(response)
        for next_marker, _ in markers[i+1:]:
            next_idx = response.upper().find(next_marker.upper())
            if next_idx != -1 and next_idx < end_idx:
                end_idx = next_idx
                break
        
        content = response[content_start:end_idx].strip()
        sections[key] = content
    
    return sections
