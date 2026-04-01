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

_openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
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
    client = get_openai_client()

    transcript_text = _format_transcript_for_soap(transcript, include_emotions)
    emotion_summary = _generate_emotion_summary(transcript) if include_emotions else ""
    valence, arousal = _compute_valence_arousal(transcript)

    # ── CALL 1: Standard SOAP structure ─────────────────────────────────────
    system_prompt = """You are an expert therapy session analyst specializing in creating SOAP notes.
Generate accurate, professional SOAP notes from therapy session transcripts.

SOAP notes structure:
- Subjective (S): Patient's reported symptoms, feelings, concerns in their own words
- Objective (O): Observable behaviors, affect, speech patterns, notable themes
- Assessment (A): Clinical interpretation, progress, diagnostic considerations,
  personality/relational patterns observed, defense mechanisms noted
- Plan (P): Interventions, homework, follow-up recommendations

Guidelines:
- Use professional clinical language
- In Assessment, explicitly note any interpersonal patterns (e.g. blame-shifting,
  grandiosity, lack of empathy, emotional dysregulation, avoidance)
- Include relevant direct quotes
- Be specific, not generic"""

    user_prompt = f"""Generate SOAP notes for this therapy session.

SESSION TRANSCRIPT:
{transcript_text}

{f"EMOTION ANALYSIS SUMMARY: {emotion_summary}" if emotion_summary else ""}
{f"Average valence: {valence:+.2f} (scale -1 to +1), Average arousal: {arousal:.2f} (scale 0 to 1)" if valence is not None else ""}

{f"ADDITIONAL CONTEXT: {additional_context}" if additional_context else ""}

Format your response as:
SUBJECTIVE:
[content]

OBJECTIVE:
[content]

ASSESSMENT:
[content]

PLAN:
[content]"""

    # ── CALL 2: Clinical pattern analysis (runs in parallel with CALL 1) ────
    pattern_prompt = f"""You are a clinical psychologist analyzing a therapy session transcript.
Identify psychological patterns — both strengths and concerns — that are evident in the 
patient's speech, behavior, and emotional expression. Be balanced and clinically precise.

SESSION TRANSCRIPT:
{transcript_text}

EMOTION DATA:
{emotion_summary}

Analyze and report on the following. For each section, note what is present — 
whether positive, concerning, or mixed:

1. INTERPERSONAL PATTERNS — How does the patient relate to others they mention?
   Strengths to note: empathy, accountability, healthy boundaries, reciprocity.
   Concerns to note: blame-shifting, entitlement, idealization/devaluation, 
   controlling behavior, lack of empathy, victimhood stance.

2. COGNITIVE PATTERNS — Thinking styles present in the session.
   Strengths: realistic appraisal, self-reflection, cognitive flexibility, insight.
   Concerns: all-or-nothing thinking, grandiosity, minimization, rationalization, projection.

3. AFFECT REGULATION — How does the patient handle emotions?
   Strengths: emotional awareness, naming feelings, tolerance of distress, self-soothing.
   Concerns: suppression, intellectualization, deflection, explosive expression, dissociation.

4. RESILIENCE AND COPING — Any evidence of healthy coping, growth, or post-traumatic 
   growth? Motivation for change? Moments of insight or breakthrough in this session?

5. THERAPEUTIC ALLIANCE — Engagement quality, openness to feedback, resistance patterns,
   trust indicators. Is the patient working collaboratively or defensively?

6. DIAGNOSTIC CONSIDERATIONS — Patterns consistent with specific clinical presentations.
   Use careful, provisional language ("may suggest", "consistent with", "warrants monitoring").
   Note both what is and is not supported by the evidence in this session alone.

Rules:
- Cite specific transcript evidence for every observation.
- Do not pathologize normal distress — distinguish situational from characterological patterns.
- If a section shows no notable findings, say so briefly rather than inventing observations.
- Use professional clinical language throughout.
- Keep each point to 1-3 sentences maximum."""

    # Run both GPT calls in parallel
    soap_task = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=2000
    )
    pattern_task = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a clinical psychologist. Respond with structured clinical analysis."},
            {"role": "user", "content": pattern_prompt}
        ],
        temperature=0.2,
        max_tokens=1000
    )

    soap_response, pattern_response = await asyncio.gather(soap_task, pattern_task)

    soap_text = soap_response.choices[0].message.content
    pattern_text = pattern_response.choices[0].message.content

    sections = _parse_soap_response(soap_text)

    # Append clinical pattern analysis to Assessment
    if pattern_text:
        sections["assessment"] = (
            sections.get("assessment", "") +
            "\n\n--- CLINICAL PATTERN ANALYSIS ---\n" +
            pattern_text
        )

    segment_ids = [seg.id for seg in transcript.segments[:5]]
    valence_str = f"{valence:+.2f}" if valence is not None else "not computed"
    arousal_str = f"{arousal:.2f}" if arousal is not None else "not computed"
    full_emotion_summary = emotion_summary
    if valence is not None:
        full_emotion_summary += f"\nValence: {valence_str} | Arousal: {arousal_str}"

    return SOAPNote(
        session_id=session_id,
        subjective=SOAPNoteSection(content=sections.get("subjective", "No data available"), confidence=0.9, sources=segment_ids),
        objective=SOAPNoteSection(content=sections.get("objective", "No data available"), confidence=0.9, sources=segment_ids),
        assessment=SOAPNoteSection(content=sections.get("assessment", "No data available"), confidence=0.85, sources=segment_ids),
        plan=SOAPNoteSection(content=sections.get("plan", "No data available"), confidence=0.85, sources=segment_ids),
        emotional_summary=full_emotion_summary if include_emotions else None,
        generated_at=datetime.utcnow(),
        model_version="gpt-4o-mini"
    )

  


def _get_emotion_str(emotion) -> str:
    """
    Safely extract final emotion string from whatever type is on a segment.
    seg.emotion can be:
      - SegmentEmotionResult  → use .final_emotion.value
      - EmotionLabel enum     → use .value  
      - string                → use as-is
      - None                  → return ""
    """
    if emotion is None:
        return ""
    # SegmentEmotionResult (the actual type from the pipeline)
    if hasattr(emotion, 'final_emotion'):
        fe = emotion.final_emotion
        if hasattr(fe, 'value'):
            return str(fe.value)
        return str(fe)
    # EmotionLabel enum
    if hasattr(emotion, 'value'):
        return str(emotion.value)
    return str(emotion)

# Russell's circumplex — (valence, arousal) per emotion
# valence: -1.0 (very negative) to +1.0 (very positive)
# arousal: 0.0 (calm/low) to 1.0 (activated/high)
_EMOTION_DIMENSIONAL: dict[str, tuple[float, float]] = {
    "joy":      ( 0.85,  0.75),
    "surprise": ( 0.10,  0.85),
    "neutral":  ( 0.00,  0.20),
    "fear":     (-0.65,  0.80),
    "sadness":  (-0.70,  0.25),
    "anger":    (-0.60,  0.90),
    "disgust":  (-0.75,  0.55),
    "unknown":  ( 0.00,  0.00),
}

def _compute_valence_arousal(transcript: FullTranscript) -> tuple[float | None, float | None]:
    """
    Derive average valence and arousal from final emotion labels
    using Russell's circumplex model approximations.
    Returns (None, None) if no emotion data available.
    """
    valences, arousals = [], []
    for seg in transcript.segments:
        emotion_str = _get_emotion_str(seg.emotion).lower()
        if emotion_str and emotion_str in _EMOTION_DIMENSIONAL:
            v, a = _EMOTION_DIMENSIONAL[emotion_str]
            # Weight by confidence if available
            conf = 1.0
            if hasattr(seg.emotion, 'final_confidence') and seg.emotion.final_confidence:
                conf = seg.emotion.final_confidence
            valences.append(v * conf)
            arousals.append(a * conf)
    if not valences:
        return None, None
    return round(sum(valences) / len(valences), 3), round(sum(arousals) / len(arousals), 3)
def _format_transcript_for_soap(
    transcript: FullTranscript,
    include_emotions: bool
) -> str:
    lines = []

    for seg in transcript.segments:
        text = seg.text_english if seg.text_english else seg.text_urdu
        if not text:
            continue

        time_str = f"[{seg.start_time:.1f}s]"
        speaker = seg.speaker
        line = f"{time_str} {speaker}: {text}"

        # FIX: seg.emotion is already an EmotionLabel enum — no .final_emotion attribute
        if include_emotions and seg.emotion:
            emotion_str = _get_emotion_str(seg.emotion)
            if emotion_str:
                line += f" [Emotion: {emotion_str}]"

        lines.append(line)

    return "\n".join(lines)


def _generate_emotion_summary(transcript: FullTranscript) -> str:
    emotion_counts: dict = {}
    total_with_emotion = 0

    for seg in transcript.segments:
        if seg.emotion:
            # FIX: seg.emotion is already an EmotionLabel enum — no .final_emotion attribute
            emotion_str = _get_emotion_str(seg.emotion)
            if emotion_str:
                emotion_counts[emotion_str] = emotion_counts.get(emotion_str, 0) + 1
                total_with_emotion += 1

    if total_with_emotion == 0:
        return "No emotion data available."

    sorted_emotions = sorted(
        emotion_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )

    parts = []
    for emotion, count in sorted_emotions[:3]:
        percentage = (count / total_with_emotion) * 100
        parts.append(f"{emotion} ({percentage:.0f}%)")

    return f"Primary emotions detected: {', '.join(parts)}"


def _parse_soap_response(response: str) -> dict:
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": ""
    }

    markers = [
        ("SUBJECTIVE:", "subjective"),
        ("OBJECTIVE:", "objective"),
        ("ASSESSMENT:", "assessment"),
        ("PLAN:", "plan")
    ]

    for i, (marker, key) in enumerate(markers):
        start_idx = response.upper().find(marker.upper())
        if start_idx == -1:
            continue

        content_start = start_idx + len(marker)
        end_idx = len(response)

        for next_marker, _ in markers[i + 1:]:
            next_idx = response.upper().find(next_marker.upper())
            if next_idx != -1 and next_idx < end_idx:
                end_idx = next_idx
                break

        sections[key] = response[content_start:end_idx].strip()

    return sections