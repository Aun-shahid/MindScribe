"""
SOAP Notes Generator Service - Generate structured SOAP notes using Groq/OpenAI providers.
"""
import asyncio
import json
from typing import Optional, List, Dict
import logging
from datetime import datetime

from openai import AsyncOpenAI

from ..config import settings
from ..schemas import (
    SOAPNote, SOAPNoteSection, FullTranscript, TranscriptionSegment,
    EmotionLabel
)
from .anonymization import anonymize_text_for_privacy

logger = logging.getLogger(__name__)

_openai_client: Optional[AsyncOpenAI] = None
_groq_client: Optional[AsyncOpenAI] = None


SOAP_SYSTEM_PROMPT_GROQ = """You are a clinical psychotherapist assistant trained to generate SOAP notes from psychotherapy session transcripts.

Core rules:
- Use ONLY information present in the provided transcript and optional context payload. Do not infer, hallucinate, or add unstated facts.
- Use psychotherapy and psychology terminology throughout.
- Be clinically precise, objective, and evidence-grounded.
- Do not prescribe, recommend, or introduce medications unless explicitly discussed in the transcript.
- Do not include content unrelated to therapy session data.

Output contract (STRICT):
- Return STRICT JSON with exactly these keys: subjective, objective, assessment, plan.
- Each value must be a detailed clinical markdown string.
- Do not wrap output in markdown code fences.

Clinical writing quality:
- Subjective: include patient-reported symptoms, thoughts, concerns, and goals, using quoted evidence where relevant.
- Objective: include therapist-observable behavior, affect, speech, engagement, and in-session presentation only.
- Assessment: synthesize themes, progress, barriers, and clinically relevant patterns based on transcript evidence only.
- Plan: provide clear, actionable psychotherapy-focused next steps for subsequent sessions.

Few-shot style reference:
TRANSCRIPT EXCERPT:
Therapist: While I'm looking at these, tell me how you've been feeling this week.
Patient: I feel a little bit better. I could get up more easily and concentrate better.
Therapist: Any idea why?
Patient: Maybe what we're doing here is helping.
Patient: Evenings are really hard. I end up alone with my thoughts.
Patient: My apartment is a mess and feels too big to handle.

SOAP STYLE EXCERPT:
Subjective should capture patient-reported improvement and direct quotes about evening isolation/overwhelm.
Objective should capture observed engagement and communication style without inventing physical exam details.
Assessment should describe progress plus continuing cognitive-emotional difficulties.
Plan should include structured, therapy-appropriate next steps (behavioral activation, task breakdown, review next session).
"""


def build_soap_user_prompt(
    transcript_text: str,
    emotion_summary: str,
    valence: Optional[float],
    arousal: Optional[float],
    additional_context: Optional[str],
) -> str:
    return f"""Now generate a SOAP note for the following therapy session.

SESSION TRANSCRIPT:
{transcript_text}

{f"EMOTION ANALYSIS SUMMARY: {emotion_summary}" if emotion_summary else ""}
{f"Average valence: {valence:+.2f} (scale -1 to +1), Average arousal: {arousal:.2f} (scale 0 to 1)" if valence is not None else ""}
{f"ADDITIONAL CONTEXT: {additional_context}" if additional_context else ""}

Return only the strict JSON object with keys: subjective, objective, assessment, plan.
"""


def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


def get_groq_client() -> AsyncOpenAI:
    global _groq_client
    if _groq_client is None:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _groq_client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url=settings.groq_base_url,
        )
    return _groq_client


async def generate_soap_notes(
    session_id: str,
    transcript: FullTranscript,
    include_emotions: bool = True,
    additional_context: Optional[str] = None
) -> SOAPNote:
    openai_client = get_openai_client()
    groq_client = get_groq_client()

    transcript_text = anonymize_text_for_privacy(_format_transcript_for_soap(transcript, include_emotions))
    emotion_summary = anonymize_text_for_privacy(_generate_emotion_summary(transcript)) if include_emotions else ""
    valence, arousal = _compute_valence_arousal(transcript)

    # ── CALL 1: Standard SOAP structure ─────────────────────────────────────
    system_prompt = SOAP_SYSTEM_PROMPT_GROQ
    user_prompt = build_soap_user_prompt(
        transcript_text=transcript_text,
        emotion_summary=emotion_summary,
        valence=valence,
        arousal=arousal,
        additional_context=additional_context,
    )

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

    # ── CALL 1: SOAP generation via Groq (replaces previous GPT call) ───────
    # Previous OpenAI SOAP call intentionally kept here for prompt migration reference.
    # soap_task = openai_client.chat.completions.create(
    #     model="gpt-4o-mini",
    #     messages=[
    #         {"role": "system", "content": system_prompt},
    #         {"role": "user", "content": user_prompt}
    #     ],
    #     response_format={"type": "json_object"},
    #     temperature=0.3,
    #     max_tokens=2000
    # )
    soap_task = groq_client.chat.completions.create(
        model=settings.soap_groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=2000,
    )

    # ── CALL 2: Clinical pattern analysis via OpenAI (kept as requested) ────
    pattern_task = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a clinical psychologist. Respond in concise markdown with clear headings and bullet points."},
            {"role": "user", "content": pattern_prompt}
        ],
        temperature=0.2,
        max_tokens=1000
    )

    soap_response, pattern_response = await asyncio.gather(soap_task, pattern_task)

    soap_text = (soap_response.choices[0].message.content or "").strip()
    pattern_text = (pattern_response.choices[0].message.content or "").strip()

    sections = _parse_soap_json_response(soap_text)
    if not any(sections.values()):
        sections = _parse_soap_response(soap_text)

    # Append clinical pattern analysis to Assessment
    if pattern_text:
        sections["assessment"] = (
            sections.get("assessment", "") +
            "\n\n### Clinical Pattern Analysis\n" +
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
        model_version=settings.soap_groq_model
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


def _parse_soap_json_response(response: str) -> Dict[str, str]:
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": "",
    }

    text = (response or "").strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            candidate = parts[1]
            if candidate.lower().startswith("json"):
                candidate = candidate[4:].strip()
            text = candidate.strip()

    try:
        payload = json.loads(text)
        if not isinstance(payload, dict):
            return sections

        for key in sections:
            value = payload.get(key)
            if isinstance(value, str):
                sections[key] = value.strip()
        return sections
    except Exception:
        return sections


def _parse_soap_response(response: str) -> dict:
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": ""
    }

    markers = [
        ("SUBJECTIVE:", "subjective"),
        ("S: SUBJECTIVE", "subjective"),
        ("OBJECTIVE:", "objective"),
        ("O: OBJECTIVE", "objective"),
        ("ASSESSMENT:", "assessment"),
        ("A: ASSESSMENT", "assessment"),
        ("PLAN:", "plan"),
        ("P: PLAN", "plan"),
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