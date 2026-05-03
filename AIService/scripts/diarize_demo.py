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
import requests
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import torch
import torch.nn as nn
from transformers import Wav2Vec2Processor
from transformers.models.wav2vec2.modeling_wav2vec2 import Wav2Vec2Model, Wav2Vec2PreTrainedModel
import librosa
import numpy as np

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

try:
    from openai import OpenAI
except Exception as e:
    print("Missing dependency: install the 'openai' package.", file=sys.stderr)
    raise


MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# Refinement models
REFINEMENT_MODEL = os.getenv("TRANSCRIPTION_REFINEMENT_MODEL", "gpt-5.4-nano-2026-03-17")
RECLASSIFICATION_MODEL = os.getenv("EMOTION_RECLASSIFICATION_MODEL", REFINEMENT_MODEL)

# Text emotion model (Local)
TEXT_EMOTION_MODEL_PATH = os.getenv("TEXT_EMOTION_MODEL_PATH", "j-hartmann/emotion-english-distilroberta-base")

# ── New model path ──
EMOTION_MODEL_PATH = os.getenv(
    "EMOTION_MODEL_PATH",
    "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim"
)

# Max audio chunk duration for emotion model (seconds)
EMOTION_MAX_CHUNK_SECS = 5   # was 10
EMOTION_HOP_SECS = 2.5       # 50% overlap

# Fusion weights: text (LLM) is the primary signal, audio (Wav2Vec2) is weak.
# For Urdu, where no audio model has seen the language, audio should never override text.
AUDIO_WEIGHT = float(os.getenv("EMOTION_AUDIO_WEIGHT", "0.05"))
TEXT_WEIGHT  = float(os.getenv("EMOTION_TEXT_WEIGHT",  "0.95"))

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
# Step 1: Diarization (ElevenLabs)
# ============================================================================

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_MODEL_ID = "scribe_v2"
DEFAULT_KEYTERMS = ["therapy", "session", "patient", "therapist", "mindscribe"]
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

def _bool_to_api(value: bool) -> str:
    return "true" if value else "false"

def _request_elevenlabs_transcription_sync(
    audio_path: str,
    language: str,
    num_speakers: Optional[int],
) -> Dict[str, Any]:
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY environment variable is missing")

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
        "temperature": 0.0,
        "seed": 42,
        "use_multi_channel": False,
        "entity_detection": "all",
        "no_verbatim": False,
        "entity_redaction": "pii",
        "entity_redaction_mode": "enumerated_entity_type",
        "keyterms": DEFAULT_KEYTERMS,
    }

    data_items = []
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

    headers = {"xi-api-key": ELEVENLABS_API_KEY}
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

    parsed_payload = None
    try:
        raw_payload = response.json()
        parsed_payload = raw_payload if isinstance(raw_payload, dict) else None
    except Exception:
        pass

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


def _build_sentence_segments(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    segments = []
    current = None
    SENTENCE_END_CHARS = {".", "!", "?", "۔", "؟"}

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
            if current["text"].strip():
                segments.append(current)
            current = None

        if current is None:
            if token_type == "spacing":
                continue
            current = {"start": start, "end": end, "speaker": speaker, "text": token}
        else:
            current["end"] = end
            current["text"] += token

        if token_type != "spacing" and token.rstrip() and token.rstrip()[-1] in SENTENCE_END_CHARS:
            if current["text"].strip():
                segments.append(current)
            current = None

    if current is not None and current["text"].strip():
        segments.append(current)

    return segments


def run_diarization(
    client: OpenAI,
    resolved_path: Path,
    language: str,
    known_speakers: Optional[List[str]],
) -> Dict[str, Any]:
    """Step 1: Transcribe with speaker diarization (ElevenLabs)."""
    print(f"\n{'='*60}")
    print(f"STEP 1/4: Diarization (model=ElevenLabs Scribe)")
    print(f"{'='*60}")
    print(f"Uploading {resolved_path.name}...")

    try:
        num_speakers = len([s for s in known_speakers if s.strip()]) if known_speakers else None
        transcript = _request_elevenlabs_transcription_sync(
            str(resolved_path), language, num_speakers
        )
    except Exception as e:
        print(f"Transcription request failed: {e}", file=sys.stderr)
        raise

    words = transcript.get("words", []) if isinstance(transcript.get("words"), list) else []
    sentence_segments = _build_sentence_segments(words)

    segments = []
    for idx, seg in enumerate(sentence_segments):
        start = float(seg.get("start", 0.0) or 0.0)
        end = float(seg.get("end", 0.0) or 0.0)
        text = str(seg.get("text", "") or "").strip()
        speaker = str(seg.get("speaker", "unknown") or "unknown")
        seg_id = f"seg_{idx:04d}"

        if not text:
            continue

        segments.append({
            "id": seg_id,
            "start": start,
            "end": end,
            "duration": max(0.0, end - start),
            "speaker": speaker,
            "text": text,
        })

    duration = max((s["end"] for s in segments), default=0.0)

    result = {
        "text": str(transcript.get("text", "") or ""),
        "duration": duration,
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

class RegressionHead(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config.hidden_size, config.hidden_size)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(config.hidden_size, config.num_labels)

    def forward(self, features, **kwargs):
        x = self.dropout(features)
        x = self.dense(x)
        x = torch.tanh(x)
        x = self.dropout(x)
        x = self.out_proj(x)
        return x

class EmotionModel(Wav2Vec2PreTrainedModel):
    def __init__(self, config):
        super().__init__(config)
        self.wav2vec2 = Wav2Vec2Model(config)
        self.classifier = RegressionHead(config)
        self.init_weights()

    def forward(self, input_values):
        outputs = self.wav2vec2(input_values)
        hidden = torch.mean(outputs[0], dim=1)
        logits = self.classifier(hidden)
        return hidden, logits


def _load_emotion_model():
    """Load the Wav2Vec2 emotion recognition model (cached in globals)."""
    global _cached_emotion_model, _cached_feature_extractor
    if "_cached_emotion_model" in globals() and _cached_emotion_model is not None:
        return _cached_emotion_model, _cached_feature_extractor

    model_path = EMOTION_MODEL_PATH
    print(f"  Loading emotion model: {model_path}")

    try:
        processor = Wav2Vec2Processor.from_pretrained(model_path, local_files_only=True)
        model = EmotionModel.from_pretrained(model_path, local_files_only=True)
    except Exception:
        print("  Downloading emotion model...")
        processor = Wav2Vec2Processor.from_pretrained(model_path)
        model = EmotionModel.from_pretrained(model_path)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device).eval()
    print(f"  Emotion model loaded on {device}")

    _cached_emotion_model = model
    _cached_feature_extractor = processor
    return model, processor


def _vad_to_category(arousal: float, valence: float, dominance: float) -> str:
    """Map VAD to categorical label for backward compatibility."""
    if valence > 0.55 and arousal > 0.55:
        return "joy"
    if valence < 0.45 and arousal > 0.60:
        return "anger"
    if valence < 0.45 and arousal < 0.40:
        return "sadness"
    if valence < 0.40 and 0.35 <= arousal <= 0.60 and dominance < 0.45:
        return "fear"
    if valence < 0.45 and dominance > 0.60:
        return "disgust"
    if arousal > 0.65 and valence > 0.45:
        return "surprise"
    return "neutral"


def _analyze_audio_chunk_emotion(audio_bytes: bytes, sample_rate: int = 16000) -> Dict[str, Any]:
    """Analyze emotion from a single audio chunk (must be <= 5s, 16kHz)."""
    import numpy as np
    model, processor = _load_emotion_model()

    audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
    audio_float = audio_array.astype(np.float32) / 32768.0

    if len(audio_float) < 1600:
        return {
            "primary_emotion": "neutral",
            "confidence": 0.5,
            "all_scores": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5, "mapped_category": "neutral"},
            "vad": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5},
        }

    inputs = processor(audio_float, sampling_rate=sample_rate, return_tensors="pt")
    if next(model.parameters()).is_cuda:
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

    with torch.no_grad():
        _, logits = model(inputs["input_values"])

    # Sigmoid → 0..1 range. Order: [arousal, dominance, valence]
    vad = torch.sigmoid(logits)[0]
    arousal, dominance, valence = vad[0].item(), vad[1].item(), vad[2].item()

    category = _vad_to_category(arousal, valence, dominance)
    # Confidence proxy: distance from neutral center
    dist = ((arousal - 0.5) ** 2 + (valence - 0.5) ** 2 + (dominance - 0.5) ** 2) ** 0.5
    confidence = min(0.95, 0.5 + dist)

    return {
        "primary_emotion": category,
        "confidence": round(confidence, 4),
        "all_scores": {
            "arousal": round(arousal, 4),
            "dominance": round(dominance, 4),
            "valence": round(valence, 4),
            "mapped_category": category,
        },
        "vad": {"arousal": round(arousal, 4), "dominance": round(dominance, 4), "valence": round(valence, 4)},
    }


def extract_prosody(audio_float: np.ndarray, sr: int = 16000) -> Dict[str, float]:
    """Language-agnostic vocal biomarkers."""
    # Pitch
    f0, _, _ = librosa.pyin(audio_float, fmin=librosa.note_to_hz('C2'),
                             fmax=librosa.note_to_hz('C7'))
    f0 = f0[~np.isnan(f0)]

    # Energy & rate
    rms = librosa.feature.rms(y=audio_float)[0]
    zcr = librosa.feature.zero_crossing_rate(audio_float)[0]

    return {
        "pitch_mean_hz": float(np.mean(f0)) if len(f0) else 0.0,
        "pitch_std_hz":  float(np.std(f0))  if len(f0) else 0.0,
        "energy_mean":   float(np.mean(rms)),
        "energy_std":    float(np.std(rms)),
        "zcr_mean":      float(np.mean(zcr)),
    }


def _audio_segment_to_numpy(seg_audio) -> np.ndarray:
    """Convert pydub AudioSegment to normalized float32 numpy array."""
    samples = np.array(seg_audio.get_array_of_samples(), dtype=np.float32)
    if seg_audio.channels == 2:
        samples = samples.reshape((-1, 2)).mean(axis=1)
    # Normalize by bit depth
    max_val = float(1 << (seg_audio.sample_width * 8 - 1))
    samples /= max_val
    if seg_audio.frame_rate != 16000:
        samples = librosa.resample(samples, orig_sr=seg_audio.frame_rate, target_sr=16000)
    return samples


def _analyze_segment_emotion_chunked(seg_audio, sample_rate: int = 16000) -> Dict[str, Any]:
    """
    Analyze emotion for a segment, chunking into <=5s pieces with 50% overlap.
    Aggregates results by averaging VAD scores and prosody across chunks.
    """
    import numpy as np

    duration_ms = len(seg_audio)
    window_ms = int(EMOTION_MAX_CHUNK_SECS * 1000)
    hop_ms = int(EMOTION_HOP_SECS * 1000)

    if duration_ms <= window_ms:
        result = _analyze_audio_chunk_emotion(seg_audio.raw_data, sample_rate)
        audio_float = _audio_segment_to_numpy(seg_audio)
        result["prosody"] = extract_prosody(audio_float, sample_rate)
        return result

    chunks = []
    for offset in range(0, duration_ms - window_ms + 1, hop_ms):
        chunk = seg_audio[offset:offset + window_ms]
        if len(chunk) >= 200:
            chunks.append(chunk)

    # Tail window
    last_offset = duration_ms - window_ms
    if last_offset > 0 and (last_offset % hop_ms != 0 or not chunks):
        chunk = seg_audio[last_offset:]
        if len(chunk) >= 200:
            chunks.append(chunk)

    if not chunks:
        return {
            "primary_emotion": "neutral",
            "confidence": 0.5,
            "all_scores": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5, "mapped_category": "neutral"},
            "vad": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5},
            "prosody": {"pitch_mean_hz": 0.0, "pitch_std_hz": 0.0, "energy_mean": 0.0, "energy_std": 0.0, "zcr_mean": 0.0}
        }

    # Analyze each chunk
    all_results = []
    all_prosody = []
    for chunk in chunks:
        result = _analyze_audio_chunk_emotion(chunk.raw_data, sample_rate)
        audio_float = _audio_segment_to_numpy(chunk)
        result["prosody"] = extract_prosody(audio_float, sample_rate)
        
        if result["all_scores"]:
            all_results.append(result)
            all_prosody.append(result["prosody"])

    if not all_results:
        return {
            "primary_emotion": "neutral",
            "confidence": 0.5,
            "all_scores": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5, "mapped_category": "neutral"},
            "vad": {"arousal": 0.5, "dominance": 0.5, "valence": 0.5},
            "prosody": {"pitch_mean_hz": 0.0, "pitch_std_hz": 0.0, "energy_mean": 0.0, "energy_std": 0.0, "zcr_mean": 0.0}
        }

    # Aggregate: average the probability scores across all chunks
    score_keys = set()
    for r in all_results:
        score_keys.update(r["all_scores"].keys())

    avg_scores = {}
    for key in score_keys:
        vals = [r["all_scores"].get(key, 0.0) for r in all_results if isinstance(r["all_scores"].get(key), (int, float))]
        if vals:
            avg_scores[key] = round(sum(vals) / len(vals), 4)

    # Average prosody
    avg_prosody = {}
    if all_prosody:
        for key in all_prosody[0].keys():
            vals = [p[key] for p in all_prosody]
            avg_prosody[key] = round(sum(vals) / len(vals), 4)

    # Pick the emotion with the highest average score (mapped_category)
    # Actually, for VAD, we use the averaged VAD to determine category
    arousal, dominance, valence = avg_scores["arousal"], avg_scores["dominance"], avg_scores["valence"]
    best_label = _vad_to_category(arousal, valence, dominance)
    
    # Confidence proxy
    dist = ((arousal - 0.5) ** 2 + (valence - 0.5) ** 2 + (dominance - 0.5) ** 2) ** 0.5
    best_confidence = min(0.95, 0.5 + dist)

    return {
        "primary_emotion": best_label,
        "confidence": round(best_confidence, 4),
        "all_scores": avg_scores,
        "vad": {"arousal": arousal, "dominance": dominance, "valence": valence},
        "prosody": avg_prosody,
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
        # ── THERAPIST OVERRIDE ──
        if seg.get("speaker") == "THERAPIST":
            seg["emotion"] = "neutral"
            seg["emotion_confidence"] = 1.0
            seg["emotion_scores"] = {
                "arousal": 0.5, "dominance": 0.5, "valence": 0.5,
                "mapped_category": "neutral",
            }
            seg["vad"] = {"arousal": 0.5, "dominance": 0.5, "valence": 0.5}
            seg["prosody"] = {
                "pitch_mean_hz": 0.0, "pitch_std_hz": 0.0,
                "energy_mean": 0.0, "energy_std": 0.0, "zcr_mean": 0.0,
            }
            print(f"  Segment {i+1}/{len(segments)}: THERAPIST → NEUTRAL (skipped)")
            continue

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
            seg["vad"] = result.get("vad", {"arousal": 0.5, "dominance": 0.5, "valence": 0.5})
            seg["prosody"] = result.get("prosody", {
                "pitch_mean_hz": 0.0, "pitch_std_hz": 0.0,
                "energy_mean": 0.0, "energy_std": 0.0, "zcr_mean": 0.0,
            })

            chunks_tag = f" ({n_chunks} chunks)" if n_chunks > 1 else ""
            emotion_display = f"{result['primary_emotion'].upper()} ({result['confidence']:.0%})"
            print(f"  Segment {i+1}/{len(segments)}: {emotion_display}{chunks_tag}")

        except Exception as e:
            print(f"  WARNING: Emotion analysis failed for segment {i+1}: {e}", file=sys.stderr)
            seg["emotion"] = "neutral"
            seg["emotion_confidence"] = 0.5
            seg["vad"] = {"arousal": 0.5, "dominance": 0.5, "valence": 0.5}
            seg["prosody"] = {
                "pitch_mean_hz": 0.0, "pitch_std_hz": 0.0,
                "energy_mean": 0.0, "energy_std": 0.0, "zcr_mean": 0.0,
            }

    return segments


# ============================================================================
# Step 4: Hybrid Emotion Fusion (Local RoBERTa + GPT Clinical Judgment)
# ============================================================================

def _load_text_emotion_model():
    """Load the DistilRoBERTa text emotion model (cached)."""
    global _cached_text_classifier
    if "_cached_text_classifier" in globals() and _cached_text_classifier is not None:
        return _cached_text_classifier

    from transformers import pipeline
    print(f"  Loading text emotion model: {TEXT_EMOTION_MODEL_PATH}")
    
    try:
        classifier = pipeline(
            "text-classification", 
            model=TEXT_EMOTION_MODEL_PATH, 
            top_k=None,
            device=0 if torch.cuda.is_available() else -1
        )
        _cached_text_classifier = classifier
        return classifier
    except Exception as e:
        print(f"  WARNING: Failed to load text emotion model: {e}")
        return None


def _analyze_text_emotion(text: str) -> Dict[str, float]:
    """Get categorical emotion scores from text using RoBERTa."""
    if not text or len(text.strip()) < 2:
        return {}
    
    classifier = _load_text_emotion_model()
    if not classifier:
        return {}
        
    try:
        results = classifier(text)[0]
        # Format: [{"label": "anger", "score": 0.9}, ...]
        return {r['label']: round(r['score'], 4) for r in results}
    except Exception:
        return {}


def _weighted_fuse(audio_emotion, audio_confidence, llm_emotion, llm_confidence):
    a_conf = max(0.0, min(1.0, audio_confidence))
    t_conf = max(0.0, min(1.0, llm_confidence))

    # Urdu rule: text is the only reliable signal.
    if llm_emotion and llm_emotion != "unknown":
        final_emotion = llm_emotion
        # Small confidence boost if acoustics agree
        boost = 1.08 if (audio_emotion == llm_emotion and a_conf > 0.5) else 1.0
        final_conf = min(0.99, t_conf * boost)
    else:
        final_emotion = audio_emotion
        final_conf = a_conf

    return final_emotion, round(final_conf, 2)


def run_llm_emotion_reclassification(
    client: OpenAI,
    segments: List[Dict[str, Any]],
    chunk_size: int = 30,
) -> List[Dict[str, Any]]:
    """
    Step 4: Use an LLM to produce text-based emotion labels, then fuse
    them with the audio (Wav2Vec2) labels using configurable weights.

    Weights:
        TEXT_WEIGHT  (default 0.85) — LLM / text-based emotion
        AUDIO_WEIGHT (default 0.15) — Wav2Vec2 audio emotion
    """
    print(f"\n{'='*60}")
    print(f"STEP 4/4: LLM Emotion Re-classification + Weighted Fusion")
    print(f"  Model: {RECLASSIFICATION_MODEL}")
    print(f"  Weights: text={TEXT_WEIGHT}, audio={AUDIO_WEIGHT}")
    print(f"{'='*60}")

    if not segments:
        print("  No segments to re-classify.")
        return segments

    # Stamp emotion_audio_raw on every segment (the Wav2Vec2 result)
    for seg in segments:
        if "emotion_audio_raw" not in seg:
            seg["emotion_audio_raw"] = seg.get("emotion", "unknown")

    for chunk_start in range(0, len(segments), chunk_size):
        chunk = segments[chunk_start : chunk_start + chunk_size]
        print(f"  Processing hybrid fusion chunk {chunk_start // chunk_size + 1} ({len(chunk)} segments)...")

        payload = []
        for i, seg in enumerate(chunk):
            speaker = seg.get("speaker", "UNKNOWN")
            text = seg.get("text_english") or seg.get("text_original") or seg.get("text", "")
            
            # ── Hybrid Skip: No analysis for therapists ──
            if speaker == "THERAPIST":
                roberta_scores = {"neutral": 1.0}
            else:
                roberta_scores = _analyze_text_emotion(text)
                
            seg["roberta_scores"] = roberta_scores
            
            payload.append({
                "idx": i,
                "id": seg.get("id"),
                "speaker": speaker,
                "text": text,
                "audio_vad": seg.get("vad", {"arousal": 0.5, "valence": 0.5, "dominance": 0.5}),
                "audio_prosody": seg.get("prosody", {}),
                "text_sentiment_roberta": roberta_scores,
            })

        prompt = (
            "You are a clinical emotion specialist reviewing a therapy session.\n\n"
            "INPUTS:\n"
            "1. TEXT: The English translation of the speaker's words.\n"
            "2. AUDIO_VAD: Acoustic biomarkers (valence, arousal, dominance).\n"
            "3. AUDIO_PROSODY: Voice features (pitch variation, energy).\n"
            "4. TEXT_SENTIMENT_ROBERTA: Local NLP model's prediction of text emotion.\n\n"
            "YOUR TASK: Act as the final 'Fusion Layer'. Use the RoBERTa sentiment and Audio VAD "
            "as hints, but apply CLINICAL JUDGMENT to provide the final label.\n\n"
            "CLINICAL RULES:\n"
            "- THERAPIST: Always NEUTRAL. They use emotional words for mirroring, not personal feeling.\n"
            "- PATIENT: If RoBERTa says 'anger' and Audio Arousal is > 0.6 → high confidence ANGER.\n"
            "- PATIENT: If RoBERTa says 'sadness' but Pitch Std < 15Hz → strong marker for DEPRESSIVE SADNESS.\n"
            "- If Audio and Text models disagree, prioritize the TEXT_SENTIMENT unless Audio is extreme.\n\n"
            "VALID EMOTIONS: joy, sadness, anger, neutral, disgust, fear, surprise\n\n"
            "Return ONLY a JSON array of items: "
            '{"idx": number, "emotion": string, "confidence": float}\n\n'
            f"Segments JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        try:
            response = client.chat.completions.create(
                model=RECLASSIFICATION_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a clinical emotion analysis specialist. You classify emotions "
                            "from therapy session text. Audio model predictions are unreliable and "
                            "should be treated as weak hints only. Base your classification on the "
                            "semantic content of the text and the speaker's role. Output strict JSON only."
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
                # LLM text-based emotion (check both keys for robustness)
                llm_emo = str(
                    mapped.get("emotion") or mapped.get("final_emotion", "") or ""
                ).strip().lower()
                llm_conf = float(mapped.get("confidence", 0.5) or 0.5)

                audio_emo = seg.get("emotion_audio_raw", "unknown")
                audio_conf = seg.get("emotion_confidence", 0.0)

                if llm_emo and llm_emo in EMOTION_LABEL_MAP.values():
                    # Store the raw LLM result before fusion
                    seg["emotion"] = llm_emo

                    # Weighted fusion
                    final_emo, final_conf = _weighted_fuse(
                        audio_emo, audio_conf, llm_emo, llm_conf
                    )
                    seg["final_emotion"] = final_emo
                    seg["final_emotion_confidence"] = final_conf

                    if final_emo != audio_emo:
                        corrections += 1
                else:
                    # LLM returned invalid label — fall back to audio
                    seg["final_emotion"] = audio_emo
                    seg["final_emotion_confidence"] = audio_conf

            print(f"    {corrections} emotion labels corrected in this chunk")

        except Exception as e:
            print(f"  WARNING: LLM emotion reclassification failed for chunk {chunk_start // chunk_size + 1}: {e}", file=sys.stderr)
            for seg in chunk:
                if "final_emotion" not in seg:
                    seg["final_emotion"] = seg.get("emotion_audio_raw", seg.get("emotion", "unknown"))
                    seg["final_emotion_confidence"] = seg.get("emotion_confidence", 0.0)

    # Print final emotion summary
    emotion_counts = {}
    for seg in segments:
        e = seg.get("final_emotion", "unknown")
        emotion_counts[e] = emotion_counts.get(e, 0) + 1
    print(f"\n  Final emotion distribution (weighted fusion): {json.dumps(emotion_counts, indent=2)}")
    print(f"  Weights used: text={TEXT_WEIGHT}, audio={AUDIO_WEIGHT}")

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
                if "vad" in seg:
                    final_seg["vad"] = seg.get("vad")
                if "prosody" in seg:
                    final_seg["prosody"] = seg.get("prosody")
                if "roberta_scores" in seg:
                    final_seg["roberta_scores"] = seg.get("roberta_scores")

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
    _cached_text_classifier = None
    main()
