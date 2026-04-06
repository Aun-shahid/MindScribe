"""
Transcription Refinement Service.

Post-processing utilities that operate on transcript segments:
- Classify each segment as THERAPIST or PATIENT.
- Normalize mixed-language segment text to English.
"""

from typing import Dict, Any, List
import json
import logging
import os

from .transcription import get_openai_client
from .anonymization import anonymize_text_for_privacy

logger = logging.getLogger(__name__)

# Use a larger model for better role classification + semantic normalization.
# If you later enable another model, set TRANSCRIPTION_REFINEMENT_MODEL in env.
REFINEMENT_MODEL = os.getenv("TRANSCRIPTION_REFINEMENT_MODEL", "gpt-4o")


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences if model returns fenced JSON."""
    if not text:
        return text
    cleaned = text.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 3:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    return cleaned.strip()


async def normalize_segments_for_therapy(
    segments: List[Dict[str, Any]],
    chunk_size: int = 25,
) -> List[Dict[str, Any]]:
    """
    Normalize diarized segments by:
    1) Classifying each segment as THERAPIST or PATIENT.
    2) Translating each segment text into English.
    """
    if not segments:
        return []

    client = get_openai_client()
    normalized_segments: List[Dict[str, Any]] = []

    for chunk_start in range(0, len(segments), chunk_size):
        chunk = segments[chunk_start : chunk_start + chunk_size]

        payload = []
        for i, seg in enumerate(chunk):
            safe_text = anonymize_text_for_privacy(str(seg.get("text", "") or ""))
            payload.append(
                {
                    "idx": i,
                    "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                    "speaker_hint": seg.get("speaker", "UNKNOWN"),
                    "text": safe_text,
                }
            )

        prompt = (
            "You are given psychiatrist-patient therapy transcript segments in mixed languages. "
            "The transcript may contain Urdu, Hindi, Roman Urdu/Hinglish, and English. "
            "ASR may include misspellings, broken words, repeated words, or partial phrases. "
            "For each segment, do both tasks:\n"
            "1) Classify speaker_role as exactly THERAPIST or PATIENT.\n"
            "2) Translate text to natural clinical English in english_text.\n\n"
            "Critical domain constraints:\n"
            "- Context is psychiatric consultation (psychiatrist/therapist and patient).\n"
            "- Keep psychiatric/clinical meaning accurate and coherent.\n"
            "- Preserve symptom content, emotional tone, and intent.\n"
            "- Fix obvious ASR artifacts only when strongly implied by context.\n"
            "- Do NOT hallucinate details that are not present in the segment.\n"
            "- Keep speaker role consistent with question/answer and counseling flow.\n\n"
            "Return ONLY valid JSON array. Each item must be:\n"
            "{\"idx\": number, \"id\": string, \"speaker_role\": \"THERAPIST\"|\"PATIENT\", \"english_text\": string}.\n"
            "No markdown, no extra keys, no explanation.\n\n"
            f"Input segments JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        try:
            request_kwargs = {
                "model": REFINEMENT_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a senior clinical language specialist for psychiatrist-patient sessions. "
                            "Infer speaker role carefully from therapeutic conversation structure and produce "
                            "clean, semantically faithful English. Output strict JSON only."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            }

            # GPT-5 chat-completions compatibility: do not send temperature/max_tokens.
            model_name = (REFINEMENT_MODEL or "").lower()
            if not model_name.startswith("gpt-5"):
                request_kwargs["temperature"] = 0.0
                request_kwargs["max_tokens"] = 4000

            response = await client.chat.completions.create(**request_kwargs)

            raw_content = (response.choices[0].message.content or "").strip()
            parsed = json.loads(_strip_code_fences(raw_content))
            if not isinstance(parsed, list):
                raise ValueError("Model response is not a list")

            by_idx = {}
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                idx = item.get("idx")
                if isinstance(idx, int):
                    by_idx[idx] = item

            for i, seg in enumerate(chunk):
                mapped = by_idx.get(i, {})
                role = str(mapped.get("speaker_role", "PATIENT")).upper()
                if role not in {"THERAPIST", "PATIENT"}:
                    role = "PATIENT"

                english_text = str(mapped.get("english_text", "") or "").strip()
                if not english_text:
                    # Fallback to original text if model skipped translation.
                    english_text = str(seg.get("text", "") or "")

                normalized_segments.append(
                    {
                        "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                        "start": float(seg.get("start", 0.0) or 0.0),
                        "end": float(seg.get("end", 0.0) or 0.0),
                        "duration": float(
                            seg.get(
                                "duration",
                                max(
                                    0.0,
                                    (seg.get("end", 0.0) or 0.0)
                                    - (seg.get("start", 0.0) or 0.0),
                                ),
                            )
                            or 0.0
                        ),
                        "speaker": role,
                        "original_speaker": seg.get("speaker", "UNKNOWN"),
                        "text_original": str(seg.get("text", "") or ""),
                        "text_english": english_text,
                    }
                )

        except Exception as e:
            logger.error(
                f"Segment normalization failed for chunk starting at {chunk_start}: {e}"
            )
            # Safe fallback: keep text and default to PATIENT classification.
            for i, seg in enumerate(chunk):
                normalized_segments.append(
                    {
                        "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                        "start": float(seg.get("start", 0.0) or 0.0),
                        "end": float(seg.get("end", 0.0) or 0.0),
                        "duration": float(
                            seg.get(
                                "duration",
                                max(
                                    0.0,
                                    (seg.get("end", 0.0) or 0.0)
                                    - (seg.get("start", 0.0) or 0.0),
                                ),
                            )
                            or 0.0
                        ),
                        "speaker": "PATIENT",
                        "original_speaker": seg.get("speaker", "UNKNOWN"),
                        "text_original": str(seg.get("text", "") or ""),
                        "text_english": str(seg.get("text", "") or ""),
                    }
                )

    return normalized_segments
