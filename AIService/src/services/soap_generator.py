"""
SOAP Notes Generator Service - Generate structured SOAP notes using HF Space + OpenAI providers.
"""
import asyncio
import json
from typing import Optional, List, Dict
import logging
from datetime import datetime
import re
import os
import time
import urllib.request
import urllib.error

from openai import AsyncOpenAI

from ..config import settings
from ..schemas import (
    SOAPNote, SOAPNoteSection, FullTranscript, TranscriptionSegment,
    EmotionLabel
)
from .anonymization import anonymize_text_for_privacy

logger = logging.getLogger(__name__)

_openai_client: Optional[AsyncOpenAI] = None


SOAP_SYSTEM_PROMPT = """You are a clinical psychotherapist assistant trained to generate SOAP notes from psychotherapy session transcripts.

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


async def generate_soap_notes(
    session_id: str,
    transcript: FullTranscript,
    include_emotions: bool = True,
    additional_context: Optional[str] = None
) -> SOAPNote:
    openai_client = get_openai_client()

    transcript_text = anonymize_text_for_privacy(_format_transcript_for_soap(transcript, include_emotions))
    emotion_summary = anonymize_text_for_privacy(_generate_emotion_summary(transcript)) if include_emotions else ""
    valence, arousal = _compute_valence_arousal(transcript)

    # ── CALL 1: Standard SOAP structure ─────────────────────────────────────
    system_prompt = SOAP_SYSTEM_PROMPT
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

    # ── CALL 1: SOAP generation (HF Space if configured, else OpenAI) ───────
    if settings.hf_space_url:
        soap_task = _generate_soap_via_hf_space(
            transcript_text=transcript_text,
            emotion_summary=emotion_summary,
            additional_context=additional_context,
        )
        soap_model_version = "hf-space"
    else:
        soap_task = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        soap_model_version = "gpt-4o-mini"

    # ── CALL 2: Clinical pattern analysis via OpenAI (kept as requested) ────
    pattern_task = asyncio.create_task(openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a clinical psychologist. Respond in concise markdown with clear headings and bullet points."},
            {"role": "user", "content": pattern_prompt}
        ],
        temperature=0.2,
        max_tokens=1000
    ))

    if settings.hf_space_url:
        try:
            soap_response = await asyncio.wait_for(soap_task, timeout=240)
            soap_text = (soap_response or "").strip()
            logger.info("SOAP generated via HF Space")

            refine_enabled = os.getenv("SOAP_HF_REFINE_WITH_OPENAI", "true").lower() == "true"
            if refine_enabled and soap_text:
                try:
                    soap_text = await _refine_hf_soap_with_openai(
                        openai_client=openai_client,
                        transcript_text=transcript_text,
                        hf_draft=soap_text,
                        emotion_summary=emotion_summary,
                        additional_context=additional_context,
                    )
                    soap_model_version = "hf-space+openai-refine"
                    logger.info("SOAP refined via OpenAI after HF draft")
                except Exception as refine_exc:
                    logger.warning("HF SOAP refinement failed; using HF draft. Error: %s", refine_exc)
        except Exception as hf_exc:
            logger.warning(
                "HF Space SOAP failed or timed out; falling back to OpenAI GPT. Error: %s",
                hf_exc,
            )
            fallback_response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            soap_text = (fallback_response.choices[0].message.content or "").strip()
            soap_model_version = "gpt-4o-mini"
    else:
        soap_response = await soap_task
        soap_text = (soap_response.choices[0].message.content or "").strip()

    pattern_response = await pattern_task
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
        model_version=soap_model_version
    )


def _format_transcript_for_hf_space(diarized_transcript: str) -> str:
    """
    Normalize diarized labels for the SOAP model that expects Therapist/Patient roles.
    """
    formatted = diarized_transcript or ""
    replacements = {
        r"\bSPEAKER_00\s*:": "Therapist:",
        r"\bSPEAKER_01\s*:": "Patient:",
        r"\bSpeaker\s*0\s*:": "Therapist:",
        r"\bSpeaker\s*1\s*:": "Patient:",
    }
    for pattern, replacement in replacements.items():
        formatted = re.sub(pattern, replacement, formatted, flags=re.IGNORECASE)
    return formatted


def _build_hf_space_prompt_payload(
    transcript_text: str,
    emotion_summary: str,
    additional_context: Optional[str],
) -> str:
    clean_transcript = _format_transcript_for_hf_space(transcript_text)

    parts = [
        "You are a clinical psychotherapist assistant generating a detailed SOAP note for a psychotherapy session.",
        "Use ONLY information present in the transcript and optional context.",
        "Do not hallucinate, do not invent facts, and do not add diagnoses not supported by evidence.",
        "Do not prescribe or recommend medications unless they are explicitly discussed in the session.",
        "Use professional psychotherapy language and keep statements evidence-grounded.",
        "",
        "Output requirements:",
        "- Return all 4 SOAP sections.",
        "- Include substantial, clinically useful detail in each section (not one-liners).",
        "- Use concise markdown bullets under each section where useful.",
        "- Include direct transcript evidence or quoted patient phrasing when relevant.",
        "- Avoid generic advice; tailor to this session only.",
        "",
        "Section guidance:",
        "- Subjective: patient-reported symptoms, emotions, concerns, goals, stressors, and self-reported changes.",
        "- Objective: therapist-observed behavior, affect, speech patterns, engagement, and in-session presentation only.",
        "- Assessment: clinical synthesis of themes, progress, barriers, risk flags (if any), and working formulation from session evidence.",
        "- Plan: concrete psychotherapy-focused next steps for upcoming sessions, including interventions/home practice/follow-up focus.",
        "",
        "Format response with these exact section headers on separate lines:",
        "Subjective:",
        "Objective:",
        "Assessment:",
        "Plan:",
        "Do not omit any section.",
        "",
        "Session Dialogue:",
        clean_transcript,
    ]

    if emotion_summary:
        parts.extend(["", f"Emotion Summary: {emotion_summary}"])
    if additional_context:
        parts.extend(["", f"Additional Context: {additional_context}"])

    return "\n".join(parts).strip()


async def _generate_soap_via_hf_space(
    transcript_text: str,
    emotion_summary: str,
    additional_context: Optional[str],
) -> str:
    base_url = settings.hf_space_url.rstrip("/")
    if not base_url:
        raise RuntimeError("HF_SPACE_URL is not set")

    timeout_seconds = int(os.getenv("HF_SPACE_TIMEOUT_SECONDS", "120"))
    debug_preview = os.getenv("SOAP_DEBUG_PREVIEW", "false").lower() == "true"

    logger.info(
        "Calling HF Space SOAP endpoint: %s/generate-soap (timeout=%ss)",
        base_url,
        timeout_seconds,
    )

    payload = {
        "transcript": _build_hf_space_prompt_payload(
            transcript_text=transcript_text,
            emotion_summary=emotion_summary,
            additional_context=additional_context,
        )
    }

    transcript_chars = len(payload.get("transcript", ""))
    logger.info("HF SOAP payload prepared (transcript_chars=%s)", transcript_chars)
    if debug_preview:
        preview = payload["transcript"][:400].replace("\n", " ")
        logger.info("HF SOAP transcript preview: %s", preview)

    headers = {"Content-Type": "application/json"}
    token = (settings.hf_space_token or settings.hf_token or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    def _post_request() -> str:
        request = urllib.request.Request(
            url=f"{base_url}/generate-soap",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return response.read().decode("utf-8")

    start = time.perf_counter()
    try:
        response_text = await asyncio.to_thread(_post_request)
        elapsed = round(time.perf_counter() - start, 2)
        logger.info("HF Space response received in %ss", elapsed)
    except urllib.error.HTTPError as exc:
        elapsed = round(time.perf_counter() - start, 2)
        error_body = ""
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = str(exc)
        raise RuntimeError(
            f"HF Space SOAP request failed in {elapsed}s with status {exc.code}: {error_body}"
        ) from exc
    except Exception as exc:
        elapsed = round(time.perf_counter() - start, 2)
        raise RuntimeError(f"HF Space SOAP request failed in {elapsed}s: {exc}") from exc

    try:
        data = json.loads(response_text)
    except Exception as exc:
        raise RuntimeError(
            f"HF Space SOAP response is not valid JSON: {response_text}"
        ) from exc

    logger.info("Received HF Space SOAP response JSON")

    soap_note = str(data.get("soap_note", "")).strip()
    if not soap_note:
        raise RuntimeError("HF Space response missing 'soap_note'")
    logger.info("HF SOAP note extracted (chars=%s)", len(soap_note))
    return soap_note

  


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

    text = (response or "").strip()
    if not text:
        return sections

    # Matches optional markdown header markers and optional colon.
    # Examples matched:
    #   Subjective:
    #   ## Objective
    #   assessment
    #   PLAN :
    heading_pattern = re.compile(
        r"(?im)^\s{0,3}(?:#{1,6}\s*)?(subjective|objective|assessment|plan)\s*:?\s*$"
    )

    matches = list(heading_pattern.finditer(text))
    if matches:
        for idx, match in enumerate(matches):
            key = match.group(1).lower().strip()
            start = match.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
            chunk = text[start:end].strip()
            if key in sections and chunk:
                sections[key] = chunk
        return sections

    # Legacy marker fallback
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
        start_idx = text.upper().find(marker.upper())
        if start_idx == -1:
            continue

        content_start = start_idx + len(marker)
        end_idx = len(text)

        for next_marker, _ in markers[i + 1:]:
            next_idx = text.upper().find(next_marker.upper())
            if next_idx != -1 and next_idx < end_idx:
                end_idx = next_idx
                break

        sections[key] = text[content_start:end_idx].strip()

    return sections


async def _refine_hf_soap_with_openai(
    openai_client: AsyncOpenAI,
    transcript_text: str,
    hf_draft: str,
    emotion_summary: str,
    additional_context: Optional[str],
) -> str:
    model_name = os.getenv("SOAP_REFINER_MODEL", "gpt-4o-mini")

    system_prompt = (
        "You are a clinical psychotherapist assistant refining a SOAP note draft. "
        "Use only evidence from the provided transcript and context. "
        "Do not hallucinate facts, do not add unsupported diagnoses, and do not recommend medications unless explicitly discussed. "
        "Return plain text using exactly these section headers on separate lines: "
        "Subjective:, Objective:, Assessment:, Plan:."
    )

    user_parts = [
        "Refine the HF draft into a complete, clinically useful SOAP note.",
        "Priorities:",
        "1) Preserve factual fidelity to transcript.",
        "2) Improve specificity, completeness, and clinical utility.",
        "3) Ensure all 4 sections are populated.",
        "",
        "Transcript:",
        transcript_text,
        "",
        "HF Draft SOAP:",
        hf_draft,
    ]

    if emotion_summary:
        user_parts.extend(["", f"Emotion Summary: {emotion_summary}"])
    if additional_context:
        user_parts.extend(["", f"Additional Context: {additional_context}"])

    response = await openai_client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "\n".join(user_parts)},
        ],
        temperature=0.2,
        max_tokens=2200,
    )

    refined = (response.choices[0].message.content or "").strip()
    if not refined:
        raise RuntimeError("OpenAI refinement returned empty content")
    return refined