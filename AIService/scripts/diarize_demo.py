#!/usr/bin/env python3
"""
Full processing demo: Diarization + GPT Refinement + Emotion Analysis + LLM Re-classification.

4-step pipeline:
  1. Transcribe with gpt-4o-transcribe-diarize (speaker diarization)
  2. GPT-based refinement: classify speakers as THERAPIST/PATIENT + translate to English
  3. Voice-based emotion analysis using Wav2Vec2 model (chunked <=10s)
  4. LLM-based emotion re-classification with full conversation context

Usage:
  python scripts/diarize_demo.py --file test.mpeg --language ur --output scripts/out.json
  python scripts/diarize_demo.py --file test.mpeg --skip-emotion   # skip emotion steps
  python scripts/diarize_demo.py --file test.mpeg --skip-refine    # skip GPT refinement

Requirements:
  - `openai` Python package
  - `pydub` for audio segment extraction
  - `transformers`, `torch` for emotion analysis (optional if --skip-emotion)
  - Set environment variable `OPENAI_API_KEY`
  - Set environment variable `EMOTION_MODEL_PATH` (optional)
"""
import os
import sys
import argparse
import json
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

try:
    from openai import OpenAI, BadRequestError
except Exception as e:
    print("Missing dependency: install the 'openai' package.", file=sys.stderr)
    raise


MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# Refinement models
REFINEMENT_MODEL = os.getenv("TRANSCRIPTION_REFINEMENT_MODEL", "gpt-5.4-nano-2026-03-17")
RECLASSIFICATION_MODEL = os.getenv("EMOTION_RECLASSIFICATION_MODEL", REFINEMENT_MODEL)

# Emotion model path
EMOTION_MODEL_PATH = os.getenv("EMOTION_MODEL_PATH", "superb/wav2vec2-large-superb-er")

# Max audio chunk duration for emotion model (seconds)
EMOTION_MAX_CHUNK_SECS = 10

EMOTION_LABEL_MAP = {
    "happiness": "joy", "happy": "joy", "joy": "joy",
    "sad": "sadness", "sadness": "sadness",
    "angry": "anger", "anger": "anger",
    "neutral": "neutral", "none": "neutral", "neutrality": "neutral",
    "surprise": "surprise", "surprised": "surprise",
    "disgust": "disgust",
    "fear": "fear",
}


# ============================================================================
# Utilities
# ============================================================================

def resolve_audio_path(raw_path: str) -> Optional[Path]:
    """Resolve input path from cwd, script dir, and basename fallback."""
    candidates = [
        Path(raw_path),
        Path.cwd() / raw_path,
        Path(__file__).parent / raw_path,
        Path(__file__).parent / Path(raw_path).name,
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate.resolve()
    return None


def get_attr(obj, name, default=None):
    """Safely read a field from dict-like or object-like responses."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def transcode_to_wav_16k_mono(input_path: Path) -> Optional[Path]:
    """Try converting audio to a known-good WAV format for the API."""
    try:
        from pydub import AudioSegment
    except Exception:
        print("Transcode skipped: `pydub` not installed.", file=sys.stderr)
        return None

    try:
        audio = AudioSegment.from_file(str(input_path))
        audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
        tmp = tempfile.NamedTemporaryFile(prefix="diarize_", suffix=".wav", delete=False)
        tmp_path = Path(tmp.name)
        tmp.close()
        audio.export(str(tmp_path), format="wav")
        return tmp_path
    except Exception as e:
        print(f"Transcode failed: {e}", file=sys.stderr)
        return None


def normalize_emotion_label(label: str) -> str:
    """Map raw emotion label strings to canonical labels."""
    s = str(label).strip().lower()
    if not s or s in {"nan", "none", "n/a", "unknown"}:
        return "unknown"
    return EMOTION_LABEL_MAP.get(s, "unknown")


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


# ============================================================================
# Step 1: Diarization
# ============================================================================

def request_diarization(client: OpenAI, audio_path: Path, language: str, known_speakers: Optional[List[str]]):
    extra_body = None
    if known_speakers:
        extra_body = {"known_speaker_names": known_speakers}

    with open(audio_path, "rb") as audio_file:
        return client.audio.transcriptions.create(
            file=audio_file,
            model="gpt-4o-transcribe-diarize",
            response_format="diarized_json",
            language=language,
            chunking_strategy="auto",
            extra_body=extra_body,
        )


def run_diarization(
    client: OpenAI,
    resolved_path: Path,
    language: str,
    known_speakers: Optional[List[str]],
) -> Dict[str, Any]:
    """Step 1: Transcribe with speaker diarization."""
    print(f"\n{'='*60}")
    print(f"STEP 1/4: Diarization (model=gpt-4o-transcribe-diarize)")
    print(f"{'='*60}")
    print(f"Uploading {resolved_path.name}...")

    transcript = None
    temp_converted_path = None
    try:
        try:
            transcript = request_diarization(client, resolved_path, language, known_speakers)
        except BadRequestError as e:
            message = str(e)
            if "unsupported" in message.lower() or "corrupted" in message.lower() or "invalid_value" in message.lower():
                print("OpenAI rejected the original file. Trying WAV (16kHz mono) conversion + retry...", file=sys.stderr)
                temp_converted_path = transcode_to_wav_16k_mono(resolved_path)
                if not temp_converted_path:
                    raise
                transcript = request_diarization(client, temp_converted_path, language, known_speakers)
            else:
                raise
    except Exception as e:
        print(f"Transcription request failed: {e}", file=sys.stderr)
        raise
    finally:
        if temp_converted_path and temp_converted_path.exists():
            try:
                temp_converted_path.unlink()
            except Exception:
                pass

    raw_segments = get_attr(transcript, "segments", []) or []
    segments = []
    for idx, seg in enumerate(raw_segments):
        start = float(get_attr(seg, "start", 0.0) or 0.0)
        end = float(get_attr(seg, "end", 0.0) or 0.0)
        text = str(get_attr(seg, "text", "") or "").strip()
        speaker = str(get_attr(seg, "speaker", "UNKNOWN") or "UNKNOWN")
        seg_id = str(get_attr(seg, "id", f"seg_{idx:04d}") or f"seg_{idx:04d}")

        segments.append({
            "id": seg_id,
            "start": start,
            "end": end,
            "duration": max(0.0, end - start),
            "speaker": speaker,
            "text": text,
        })

    result = {
        "text": str(get_attr(transcript, "text", "") or ""),
        "duration": get_attr(transcript, "duration", None),
        "segments": segments,
        "language": language,
    }

    # Collect unique speakers from diarization
    unique_speakers = sorted(list({s["speaker"] for s in segments}))
    print(f"  Diarization complete: {len(segments)} segments, speakers: {unique_speakers}")
    for seg in segments:
        print(f"  [{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['speaker']}: {seg['text'][:80]}{'...' if len(seg['text']) > 80 else ''}")

    return result


# ============================================================================
# Step 2: GPT Refinement (Role Classification + English Translation)
# ============================================================================

def _determine_speaker_role_mapping(
    client: OpenAI,
    segments: List[Dict[str, Any]],
    unique_speakers: List[str],
) -> Dict[str, str]:
    """
    Pass 1: Send the first N segments to the LLM to determine which
    diarization label (A, B, C…) maps to THERAPIST vs PATIENT.
    Returns e.g. {"A": "THERAPIST", "B": "PATIENT"}.
    """
    # Use first 15 segments (enough to establish the pattern)
    sample = segments[:15]
    speaker_list_str = ", ".join(f'"{s}"' for s in unique_speakers)

    payload = [
        {"idx": i, "speaker_label": seg.get("speaker", "UNKNOWN"), "text": seg.get("text", "")}
        for i, seg in enumerate(sample)
    ]

    prompt = (
        "You are analyzing the opening of a psychiatrist-patient therapy session.\n\n"
        f"Diarization found these speaker labels: {speaker_list_str}\n\n"
        "TASK: Determine which speaker label maps to THERAPIST and which maps to PATIENT.\n\n"
        "THERAPIST identification cues:\n"
        "- Starts/opens the session (e.g. 'Aaj ka session shuru karte hain', 'Let us begin')\n"
        "- Asks clinical questions ('Aapko kya lagta hai?', 'How do you feel?', 'Can you tell me...')\n"
        "- Makes professional reflections ('It seems like...', 'Lagta hai ki...')\n"
        "- Guides and summarizes the conversation flow\n\n"
        "PATIENT identification cues:\n"
        "- Answers questions, shares personal frustrations and feelings\n"
        "- Describes events from their own life perspective\n"
        "- Uses first-person emotional language ('I get angry', 'mujhe lagta hai...')\n\n"
        "Return ONLY a valid JSON object mapping each label to its role. Example:\n"
        '{"A": "THERAPIST", "B": "PATIENT"}\n\n'
        f"Segments:\n{json.dumps(payload, ensure_ascii=False)}"
    )

    try:
        response = client.chat.completions.create(
            model=REFINEMENT_MODEL,
            messages=[
                {"role": "system", "content": "You are a clinical NLP expert. Output strict JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        mapping = json.loads(_strip_code_fences(raw))
        if not isinstance(mapping, dict):
            raise ValueError("Not a dict")
        # Normalize values
        normalized = {}
        for label, role in mapping.items():
            r = str(role).upper()
            normalized[str(label)] = r if r in {"THERAPIST", "PATIENT"} else "PATIENT"
        print(f"  Speaker role mapping determined: {normalized}")
        return normalized
    except Exception as e:
        print(f"  WARNING: Could not determine role mapping: {e}. Defaulting all to PATIENT.", file=sys.stderr)
        return {s: "PATIENT" for s in unique_speakers}


def run_refinement(
    client: OpenAI,
    segments: List[Dict[str, Any]],
    chunk_size: int = 25,
) -> List[Dict[str, Any]]:
    """
    Step 2: Classify each segment as THERAPIST/PATIENT and translate to English.
    Two-pass approach:
      Pass 1 — determine the diarization label → role mapping from the first ~15 segments.
      Pass 2 — apply that mapping mechanically, then translate each chunk.
    """
    print(f"\n{'='*60}")
    print(f"STEP 2/4: GPT Refinement (role classification + English translation)")
    print(f"  Model: {REFINEMENT_MODEL}")
    print(f"{'='*60}")

    if not segments:
        print("  No segments to refine.")
        return []

    # Identify unique diarization speakers
    unique_speakers = sorted(list({s.get("speaker", "UNKNOWN") for s in segments}))
    speaker_list_str = ", ".join(f'"{s}"' for s in unique_speakers)

    # ── Pass 1: determine speaker→role mapping ────────────────────────
    role_map = _determine_speaker_role_mapping(client, segments, unique_speakers)

    # ── Pass 2: translate each chunk, applying the fixed role_map ────
    normalized_segments: List[Dict[str, Any]] = []

    for chunk_start in range(0, len(segments), chunk_size):
        chunk = segments[chunk_start : chunk_start + chunk_size]
        print(f"  Translating chunk {chunk_start // chunk_size + 1} ({len(chunk)} segments)...")

        payload = []
        for i, seg in enumerate(chunk):
            payload.append({
                "idx": i,
                "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                "speaker_label": seg.get("speaker", "UNKNOWN"),
                "text": seg.get("text", ""),
            })

        prompt = (
            "You are a clinical language translator. Translate the following therapy session segments to natural clinical English.\n\n"
            f"Speaker role mapping (already determined): {json.dumps(role_map)}\n"
            "- Apply the role mapping above as-is. DO NOT re-determine roles.\n"
            "- Translate each segment text to clean, natural clinical English.\n"
            "- Preserve emotional tone and clinical meaning. Do NOT add or remove content.\n\n"
            "Return ONLY a valid JSON array. Each item must be:\n"
            '{"idx": number, "id": string, "english_text": string}\n\n'
            f"Segments JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        try:
            response = client.chat.completions.create(
                model=REFINEMENT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a clinical language translator. Output strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
            )

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
                # Role comes from the pre-determined mapping — not from LLM
                diarization_label = seg.get("speaker", "UNKNOWN")
                role = role_map.get(diarization_label, "PATIENT")

                english_text = str(mapped.get("english_text", "") or "").strip()
                if not english_text:
                    english_text = str(seg.get("text", "") or "")

                normalized_segments.append({
                    "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                    "start": float(seg.get("start", 0.0) or 0.0),
                    "end": float(seg.get("end", 0.0) or 0.0),
                    "duration": float(seg.get("duration", max(0.0, (seg.get("end", 0.0) or 0.0) - (seg.get("start", 0.0) or 0.0))) or 0.0),
                    "speaker": role,
                    "original_speaker": diarization_label,
                    "text_original": str(seg.get("text", "") or ""),
                    "text_english": english_text,
                })

        except Exception as e:
            print(f"  WARNING: Translation failed for chunk starting at {chunk_start}: {e}", file=sys.stderr)
            for i, seg in enumerate(chunk):
                diarization_label = seg.get("speaker", "UNKNOWN")
                role = role_map.get(diarization_label, "PATIENT")
                normalized_segments.append({
                    "id": seg.get("id", f"seg_{chunk_start + i:04d}"),
                    "start": float(seg.get("start", 0.0) or 0.0),
                    "end": float(seg.get("end", 0.0) or 0.0),
                    "duration": float(seg.get("duration", max(0.0, (seg.get("end", 0.0) or 0.0) - (seg.get("start", 0.0) or 0.0))) or 0.0),
                    "speaker": role,
                    "original_speaker": diarization_label,
                    "text_original": str(seg.get("text", "") or ""),
                    "text_english": str(seg.get("text", "") or ""),
                })

    # Print results
    therapist_count = sum(1 for s in normalized_segments if s["speaker"] == "THERAPIST")
    patient_count = sum(1 for s in normalized_segments if s["speaker"] == "PATIENT")
    print(f"\n  Refinement complete: {therapist_count} THERAPIST, {patient_count} PATIENT segments")
    for seg in normalized_segments:
        role_tag = seg["speaker"]
        print(f"  [{seg['start']:.1f}s - {seg['end']:.1f}s] {role_tag}: {seg['text_english'][:80]}{'...' if len(seg['text_english']) > 80 else ''}")

    return normalized_segments


# ============================================================================
# Step 3: Voice-Based Emotion Analysis (chunked <=10s per model requirements)
# ============================================================================

def _load_emotion_model():
    """Load the Wav2Vec2 emotion recognition model (cached in globals)."""
    global _cached_emotion_model, _cached_feature_extractor
    if "_cached_emotion_model" in globals() and _cached_emotion_model is not None:
        return _cached_emotion_model, _cached_feature_extractor

    try:
        import torch
        from transformers import Wav2Vec2ForSequenceClassification, AutoFeatureExtractor
    except ImportError:
        print("Missing dependencies for emotion analysis: install 'transformers' and 'torch'.", file=sys.stderr)
        raise

    model_path = EMOTION_MODEL_PATH
    print(f"  Loading emotion model: {model_path}")

    if model_path.startswith("https://huggingface.co/"):
        parts = model_path.replace("https://huggingface.co/", "").split("/")
        if len(parts) >= 2:
            model_path = f"{parts[0]}/{parts[1]}"

    try:
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path, local_files_only=True)
        extractor = AutoFeatureExtractor.from_pretrained(model_path, local_files_only=True)
        print("  Loaded emotion model from local cache")
    except Exception:
        print("  Downloading emotion model...")
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
        extractor = AutoFeatureExtractor.from_pretrained(model_path)

    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    print(f"  Emotion model loaded on {device}")

    _cached_emotion_model = model
    _cached_feature_extractor = extractor
    return model, extractor


def _analyze_audio_chunk_emotion(audio_bytes: bytes, sample_rate: int = 16000) -> Dict[str, Any]:
    """Analyze emotion from a single audio chunk (must be <= 10s, 16kHz)."""
    import numpy as np
    import torch

    model, feature_extractor = _load_emotion_model()

    audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
    audio_float = audio_array.astype(np.float32) / 32768.0

    # Skip if too short (< 0.1s at 16kHz = 1600 samples)
    if len(audio_float) < 1600:
        return {
            "primary_emotion": "neutral",
            "confidence": 0.5,
            "all_scores": {},
        }

    inputs = feature_extractor(
        audio_float,
        sampling_rate=sample_rate,
        padding=True,
        return_tensors="pt",
    )

    if next(model.parameters()).is_cuda:
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits

    probs = torch.nn.functional.softmax(logits, dim=-1)
    predicted_id = torch.argmax(logits, dim=-1).item()

    emotion_label = model.config.id2label[predicted_id]
    confidence = probs[0][predicted_id].item()

    all_scores = {
        model.config.id2label[i]: round(probs[0][i].item(), 4)
        for i in range(len(model.config.id2label))
    }

    return {
        "primary_emotion": normalize_emotion_label(emotion_label),
        "confidence": round(confidence, 4),
        "all_scores": all_scores,
    }


def _analyze_segment_emotion_chunked(seg_audio, sample_rate: int = 16000) -> Dict[str, Any]:
    """
    Analyze emotion for a segment, chunking into <=10s pieces if needed.
    Aggregates results by averaging probabilities across chunks.
    """
    import numpy as np

    duration_ms = len(seg_audio)
    max_chunk_ms = EMOTION_MAX_CHUNK_SECS * 1000

    if duration_ms <= max_chunk_ms:
        # Short segment — analyze directly
        return _analyze_audio_chunk_emotion(seg_audio.raw_data, sample_rate)

    # Long segment — split into chunks and aggregate
    chunks = []
    for offset in range(0, duration_ms, max_chunk_ms):
        chunk = seg_audio[offset:offset + max_chunk_ms]
        if len(chunk) < 200:  # skip chunks shorter than 200ms
            continue
        chunks.append(chunk)

    if not chunks:
        return {"primary_emotion": "neutral", "confidence": 0.5, "all_scores": {}}

    # Analyze each chunk
    all_results = []
    for chunk in chunks:
        result = _analyze_audio_chunk_emotion(chunk.raw_data, sample_rate)
        if result["all_scores"]:
            all_results.append(result)

    if not all_results:
        return {"primary_emotion": "neutral", "confidence": 0.5, "all_scores": {}}

    # Aggregate: average the probability scores across all chunks
    score_keys = set()
    for r in all_results:
        score_keys.update(r["all_scores"].keys())

    avg_scores = {}
    for key in score_keys:
        vals = [r["all_scores"].get(key, 0.0) for r in all_results]
        avg_scores[key] = round(sum(vals) / len(vals), 4)

    # Pick the emotion with the highest average score
    best_label = max(avg_scores, key=avg_scores.get)
    best_confidence = avg_scores[best_label]

    return {
        "primary_emotion": normalize_emotion_label(best_label),
        "confidence": best_confidence,
        "all_scores": avg_scores,
    }


def run_emotion_analysis(
    audio_path: Path,
    segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Step 3: Analyze voice-based emotion for each segment.
    Segments > 10s are chunked per the model requirements.
    Audio is resampled to 16kHz mono.
    """
    print(f"\n{'='*60}")
    print(f"STEP 3/4: Voice-Based Emotion Analysis (Wav2Vec2)")
    print(f"  Model: {EMOTION_MODEL_PATH}")
    print(f"  Max chunk: {EMOTION_MAX_CHUNK_SECS}s (model requirement)")
    print(f"{'='*60}")

    if not segments:
        print("  No segments to analyze.")
        return segments

    try:
        from pydub import AudioSegment
    except ImportError:
        print("  WARNING: pydub not installed — cannot extract segment audio. Skipping emotion.", file=sys.stderr)
        for seg in segments:
            seg["emotion"] = "unknown"
            seg["emotion_confidence"] = 0.0
        return segments

    try:
        full_audio = AudioSegment.from_file(str(audio_path))
        full_audio = full_audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    except Exception as e:
        print(f"  WARNING: Could not load audio for emotion analysis: {e}", file=sys.stderr)
        for seg in segments:
            seg["emotion"] = "unknown"
            seg["emotion_confidence"] = 0.0
        return segments

    for i, seg in enumerate(segments):
        start_ms = int(seg.get("start", 0) * 1000)
        end_ms = int(seg.get("end", 0) * 1000)
        if end_ms <= start_ms:
            end_ms = start_ms + 1000

        try:
            seg_audio = full_audio[start_ms:end_ms]
            duration_s = len(seg_audio) / 1000.0
            n_chunks = max(1, int(duration_s / EMOTION_MAX_CHUNK_SECS) + (1 if duration_s % EMOTION_MAX_CHUNK_SECS > 0 else 0))

            result = _analyze_segment_emotion_chunked(seg_audio, sample_rate=16000)
            seg["emotion"] = result["primary_emotion"]
            seg["emotion_confidence"] = result["confidence"]
            seg["emotion_scores"] = result["all_scores"]

            chunks_tag = f" ({n_chunks} chunks)" if n_chunks > 1 else ""
            emotion_display = f"{result['primary_emotion'].upper()} ({result['confidence']:.0%})"
            print(f"  Segment {i+1}/{len(segments)}: {emotion_display}{chunks_tag}")

        except Exception as e:
            print(f"  WARNING: Emotion analysis failed for segment {i+1}: {e}", file=sys.stderr)
            seg["emotion"] = "unknown"
            seg["emotion_confidence"] = 0.0

    return segments


# ============================================================================
# Step 4: LLM Emotion Re-classification (full conversation context)
# ============================================================================

def run_llm_emotion_reclassification(
    client: OpenAI,
    segments: List[Dict[str, Any]],
    chunk_size: int = 30,
) -> List[Dict[str, Any]]:
    """
    Step 4: Use an LLM to review and correct emotion labels using the
    full conversation context. The LLM knows this is a patient-therapist
    session and can make more grounded predictions than per-segment audio analysis.
    """
    print(f"\n{'='*60}")
    print(f"STEP 4/4: LLM Emotion Re-classification (contextual)")
    print(f"  Model: {RECLASSIFICATION_MODEL}")
    print(f"{'='*60}")

    if not segments:
        print("  No segments to re-classify.")
        return segments

    # First, stamp emotion_audio_raw on every segment (the Wav2Vec2 result)
    for seg in segments:
        if "emotion_audio_raw" not in seg:
            seg["emotion_audio_raw"] = seg.get("emotion", "unknown")

    for chunk_start in range(0, len(segments), chunk_size):
        chunk = segments[chunk_start : chunk_start + chunk_size]
        print(f"  Processing chunk {chunk_start // chunk_size + 1} ({len(chunk)} segments)...")

        payload = []
        for i, seg in enumerate(chunk):
            payload.append({
                "idx": i,
                "id": seg.get("id"),
                "speaker": seg.get("speaker", "UNKNOWN"),
                "text": seg.get("text_english") or seg.get("text_original") or seg.get("text", ""),
                "audio_emotion": seg.get("emotion_audio_raw", "unknown"),
                "audio_confidence": seg.get("emotion_confidence", 0.0),
            })

        prompt = (
            "You are a clinical emotion specialist reviewing a psychiatrist-patient therapy session.\n\n"
            "CONTEXT:\n"
            "- This is a psychiatric consultation. Two speakers: THERAPIST and PATIENT.\n"
            "- THERAPIST: Almost always NEUTRAL. Clinical questions and reflections carry no personal emotion.\n"
            "- PATIENT: Can feel anger, sadness, disgust, joy. Frustration/irritation = anger. Guilt = sadness.\n"
            "- The audio model (Wav2Vec2) often outputs 'sadness' even for angry or neutral speech.\n"
            "- Short filler words ('Hmm', 'Exactly', 'Huh') = neutral unless context is very clear.\n\n"
            "RULES:\n"
            "1. THERAPIST segments: assign neutral unless there is strong vocal stress evidence.\n"
            "2. PATIENT describing frustration/irritation toward others = anger.\n"
            "3. PATIENT expressing sadness, loss, guilt = sadness.\n"
            "4. PATIENT expressing superiority, contempt, disgust = disgust or anger.\n"
            "5. If audio_emotion seems correct given the text, keep it.\n\n"
            "VALID EMOTIONS: joy, sadness, anger, neutral, disgust, fear, surprise\n\n"
            "Return ONLY a valid JSON array. Each item:\n"
            '{"idx": number, "final_emotion": string, "confidence": float}\n\n'
            f"Segments JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        try:
            response = client.chat.completions.create(
                model=REFINEMENT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a clinical emotion analysis specialist. You assign contextually accurate "
                            "emotion labels to therapy session segments. You understand that audio models "
                            "are noisy and often confuse anger/neutral with sadness. Output strict JSON only."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )

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

            corrections = 0
            for i, seg in enumerate(chunk):
                mapped = by_idx.get(i, {})
                final_emo = str(mapped.get("final_emotion", "") or "").strip().lower()
                final_conf = float(mapped.get("confidence", 0.5) or 0.5)

                if final_emo and final_emo in EMOTION_LABEL_MAP.values():
                    if final_emo != seg.get("emotion_audio_raw", "unknown"):
                        corrections += 1
                    seg["final_emotion"] = final_emo
                    seg["final_emotion_confidence"] = final_conf
                else:
                    # Fall back to audio emotion if LLM returns invalid label
                    seg["final_emotion"] = seg.get("emotion_audio_raw", "unknown")
                    seg["final_emotion_confidence"] = seg.get("emotion_confidence", 0.0)

            print(f"    {corrections} emotion labels corrected in this chunk")

        except Exception as e:
            print(f"  WARNING: LLM emotion reclassification failed for chunk {chunk_start // chunk_size + 1}: {e}", file=sys.stderr)
            # Fall back: final_emotion = audio emotion
            for seg in chunk:
                if "final_emotion" not in seg:
                    seg["final_emotion"] = seg.get("emotion_audio_raw", seg.get("emotion", "unknown"))
                    seg["final_emotion_confidence"] = seg.get("emotion_confidence", 0.0)

    # Print final emotion summary
    emotion_counts = {}
    for seg in segments:
        e = seg.get("final_emotion", "unknown")
        emotion_counts[e] = emotion_counts.get(e, 0) + 1
    print(f"\n  Final emotion distribution (text-based LLM): {json.dumps(emotion_counts, indent=2)}")

    return segments


# ============================================================================
# Main Pipeline
# ============================================================================

def transcribe(
    file_path: str,
    language: str = "ur",
    known_speakers=None,
    output_path: str = None,
    dry_run: bool = False,
    skip_refine: bool = False,
    skip_emotion: bool = False,
):
    resolved_path = resolve_audio_path(file_path)
    if not resolved_path:
        print(f"Audio file not found: {file_path}", file=sys.stderr)
        print(f"Current directory: {Path.cwd()}", file=sys.stderr)
        print(f"Script directory: {Path(__file__).parent}", file=sys.stderr)
        sys.exit(2)

    file_size = resolved_path.stat().st_size
    if file_size > MAX_UPLOAD_BYTES:
        print(
            f"WARNING: File is {file_size / (1024 * 1024):.2f} MB (> 25 MB API limit). "
            "Use a compressed format or split the file.",
            file=sys.stderr,
        )

    if dry_run:
        print(f"DRY RUN: Would upload: {resolved_path}")
        print(f"DRY RUN: Step 1 — Diarization (model=gpt-4o-transcribe-diarize, language={language})")
        if known_speakers:
            print(f"DRY RUN:   known_speaker_names={known_speakers}")
        if not skip_refine:
            print(f"DRY RUN: Step 2 — GPT Refinement (model={REFINEMENT_MODEL})")
        else:
            print(f"DRY RUN: Step 2 — SKIPPED (--skip-refine)")
        if not skip_emotion:
            print(f"DRY RUN: Step 3 — Emotion Analysis (model={EMOTION_MODEL_PATH}, chunk<={EMOTION_MAX_CHUNK_SECS}s)")
            print(f"DRY RUN: Step 4 — LLM Emotion Re-classification (model={REFINEMENT_MODEL})")
        else:
            print(f"DRY RUN: Step 3 — SKIPPED (--skip-emotion)")
            print(f"DRY RUN: Step 4 — SKIPPED (--skip-emotion)")
        print("DRY RUN: Skipping all network calls.")
        return

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    # ── Step 1: Diarization ──────────────────────────────────────────
    diarized = run_diarization(client, resolved_path, language, known_speakers)
    segments = diarized.get("segments", [])

    if not segments:
        print("\nNo speech detected in the audio file.")
        return

    # ── Step 2: GPT Refinement ───────────────────────────────────────
    if not skip_refine:
        segments = run_refinement(client, segments)
    else:
        print(f"\n{'='*60}")
        print("STEP 2/4: GPT Refinement — SKIPPED (--skip-refine)")
        print(f"{'='*60}")

    # ── Step 3: Voice Emotion Analysis (chunked) ─────────────────────
    if not skip_emotion:
        segments = run_emotion_analysis(resolved_path, segments)
    else:
        print(f"\n{'='*60}")
        print("STEP 3/4: Emotion Analysis — SKIPPED (--skip-emotion)")
        print(f"{'='*60}")

    # ── Step 4: LLM Emotion Re-classification ────────────────────────
    if not skip_emotion:
        segments = run_llm_emotion_reclassification(client, segments)
    else:
        print(f"\n{'='*60}")
        print("STEP 4/4: LLM Emotion Re-classification — SKIPPED (--skip-emotion)")
        print(f"{'='*60}")

    # ── Final Summary ────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("FINAL RESULTS")
    print(f"{'='*60}\n")

    for seg in segments:
        role = seg.get("speaker", seg.get("original_speaker", "?"))
        start = seg.get("start", 0.0)
        end = seg.get("end", 0.0)

        if not skip_refine:
            original = seg.get("text_original", "")
            english = seg.get("text_english", "")
            text_display = english or original
            lang_tag = " [EN]" if english else ""
        else:
            text_display = seg.get("text", "")
            lang_tag = ""

        if not skip_emotion:
            emotion = seg.get("final_emotion", seg.get("emotion", "unknown"))
            emotion_conf = seg.get("final_emotion_confidence", seg.get("emotion_confidence", 0.0))
            emotion_tag = f"  | {emotion.upper()} ({emotion_conf:.0%})"
        else:
            emotion_tag = ""

        print(f"[{start:.1f}s - {end:.1f}s] {role}{lang_tag}: {text_display}{emotion_tag}")

    # ── Save Output ──────────────────────────────────────────────────
    if output_path:
        final_segments = []
        for seg in segments:
            final_seg = {
                "id": seg.get("id"),
                "start": seg.get("start"),
                "end": seg.get("end"),
                "speaker": seg.get("speaker"),
                "text": seg.get("text_original") or seg.get("text"),
                "translated": seg.get("text_english", ""),
                "emotion": seg.get("final_emotion", seg.get("emotion", "unknown")),
            }
            if not skip_emotion:
                # emotion_audio_raw: raw Wav2Vec2 result
                final_seg["emotion_audio_raw"] = seg.get("emotion_audio_raw", seg.get("emotion", "unknown"))
                # final_emotion: LLM text-based corrected emotion
                final_seg["final_emotion"] = seg.get("final_emotion", seg.get("emotion", "unknown"))
                final_seg["final_emotion_confidence"] = seg.get("final_emotion_confidence", seg.get("emotion_confidence", 0.0))
                if "emotion_scores" in seg:
                    final_seg["emotion_scores"] = seg.get("emotion_scores")

            final_segments.append(final_seg)

        out_obj = {
            "text": diarized.get("text", ""),
            "duration": diarized.get("duration"),
            "language": language,
            "pipeline": {
                "diarization": True,
                "refinement": not skip_refine,
                "emotion_analysis": not skip_emotion,
                "llm_emotion_reclassification": not skip_emotion,
                "refinement_model": REFINEMENT_MODEL if not skip_refine else None,
                "reclassification_model": RECLASSIFICATION_MODEL if not skip_emotion else None,
                "emotion_model": EMOTION_MODEL_PATH if not skip_emotion else None,
            },
            "segments": final_segments,
        }

        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(out_obj, f, ensure_ascii=False, indent=2)
            print(f"\nSaved full results JSON to {output_path}")
        except Exception as e:
            print(f"\nFailed to save JSON output: {e}", file=sys.stderr)


def parse_args():
    p = argparse.ArgumentParser(
        description="Full pipeline: Diarization + GPT Refinement + Emotion Analysis + LLM Re-classification"
    )
    p.add_argument("--file", "-f", required=True, help="Path to audio file (wav, mp3, m4a, etc.)")
    p.add_argument("--language", "-l", default="ur", help="Language ISO code (e.g. 'ur' for Urdu, 'en' for English)")
    p.add_argument("--output", "-o", default=None, help="Optional output JSON file to save full results")
    p.add_argument("--known-speakers", "-k", default=None, help="Comma-separated known speaker names (optional)")
    p.add_argument("--skip-refine", action="store_true", help="Skip Step 2: GPT role classification + translation")
    p.add_argument("--skip-emotion", action="store_true", help="Skip Steps 3+4: Voice emotion + LLM re-classification")
    p.add_argument("--dry-run", action="store_true", help="Validate inputs and show pipeline without calling APIs")
    return p.parse_args()


def main():
    args = parse_args()

    known = None
    if args.known_speakers:
        known = [s.strip() for s in args.known_speakers.split(",") if s.strip()]

    transcribe(
        args.file,
        language=args.language,
        known_speakers=known,
        output_path=args.output,
        dry_run=args.dry_run,
        skip_refine=args.skip_refine,
        skip_emotion=args.skip_emotion,
    )


if __name__ == "__main__":
    _cached_emotion_model = None
    _cached_feature_extractor = None
    main()
