"""
Emotion Analysis Service - Dual emotion analysis (audio + text).

Models:
  Audio: Wav2Vec2ForSequenceClassification (path from EMOTION_MODEL_PATH env var)
         → AudacityA/wav2vec-ft-er by default
  Text:  j-hartmann/emotion-english-distilroberta-base (HuggingFace, hardcoded)
  Fusion: GPT-4o-mini (via _fuse_emotions_with_gpt — called by session.py pipeline)

The pipeline in session.py calls each function independently in order:
  1. analyze_audio_emotion()      → AudioEmotionResult
  2. analyze_text_emotion()       → TextEmotionResult
  3. _fuse_emotions_with_gpt()    → (EmotionLabel, float)
so that audio and text results can be logged separately before fusion.
"""
import asyncio
from typing import Optional, Dict, Any, Tuple
import logging
import threading
import os
import requests
import zipfile
import shutil

import numpy as np
import torch
import json

from ..config import settings
from ..schemas import (
    CombinedEmotionResult, AudioEmotionResult, TextEmotionResult, EmotionLabel
)

logger = logging.getLogger(__name__)

_emotion_model = None
_feature_extractor = None
_text_emotion_pipeline = None
_model_lock = threading.Lock()


# ============================================================================
# Google Drive downloader
# ============================================================================

def download_from_gdrive(url: str, dest_path: str):
    def get_confirm_token(response):
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                return value
        return None

    session = requests.Session()
    response = session.get(url, stream=True)
    token = get_confirm_token(response)
    if token:
        response = session.get(url, params={'confirm': token}, stream=True)
    response.raise_for_status()
    with open(dest_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=32768):
            if chunk:
                f.write(chunk)


# ============================================================================
# Emotion label normalisation
# ============================================================================

def normalize_emotion_label(label: str) -> EmotionLabel:
    """Map raw model labels to canonical EmotionLabel enum."""
    try:
        s = str(label).strip().lower()
    except Exception:
        return EmotionLabel.UNKNOWN

    if not s or s in {'nan', 'none', 'n/a', 'unknown'}:
        return EmotionLabel.UNKNOWN

    mappings = {
        'happiness': EmotionLabel.JOY,
        'happy': EmotionLabel.JOY,
        'joy': EmotionLabel.JOY,
        'sad': EmotionLabel.SADNESS,
        'sadness': EmotionLabel.SADNESS,
        'angry': EmotionLabel.ANGER,
        'anger': EmotionLabel.ANGER,
        'neutral': EmotionLabel.NEUTRAL,
        'none': EmotionLabel.NEUTRAL,
        'neutrality': EmotionLabel.NEUTRAL,
        'surprise': EmotionLabel.SURPRISE,
        'surprised': EmotionLabel.SURPRISE,
        'disgust': EmotionLabel.DISGUST,
        'fear': EmotionLabel.FEAR,
    }
    return mappings.get(s, EmotionLabel.UNKNOWN)


# ============================================================================
# Audio model loader
# ============================================================================

def load_emotion_model() -> Tuple[Any, Any]:
    """
    Load Wav2Vec2 emotion model.
    Path comes from EMOTION_MODEL_PATH env var (default: AudacityA/wav2vec-ft-er).
    Supports HuggingFace model IDs, HuggingFace URLs, Google Drive URLs, and local paths.
    """
    global _emotion_model, _feature_extractor

    if _emotion_model is not None and _feature_extractor is not None:
        return _emotion_model, _feature_extractor

    with _model_lock:
        if _emotion_model is not None and _feature_extractor is not None:
            return _emotion_model, _feature_extractor

        try:
            from transformers import Wav2Vec2ForSequenceClassification, AutoFeatureExtractor

            model_path = settings.emotion_model_path
            logger.info(f"Loading emotion model from: {model_path}")

            # HuggingFace URL → model ID
            if model_path.startswith('https://huggingface.co/'):
                parts = model_path.replace('https://huggingface.co/', '').split('/')
                if len(parts) >= 2:
                    model_path = f"{parts[0]}/{parts[1]}"
                    logger.info(f"Converted HF URL → model ID: {model_path}")

            # Remote URL (Google Drive or direct download) → cache locally
            if model_path.startswith('https://'):
                cache_dir = os.path.expanduser('~/.cache/mindscribe/models')
                os.makedirs(cache_dir, exist_ok=True)
                import hashlib
                url_hash = hashlib.md5(model_path.encode()).hexdigest()[:10]
                model_local_path = os.path.join(cache_dir, f"emotion_model_{url_hash}")

                if not os.path.exists(model_local_path):
                    logger.info(f"Downloading remote model → {model_local_path}")
                    zip_path = model_local_path + '.zip'
                    try:
                        if 'drive.google.com' in model_path:
                            download_from_gdrive(model_path, zip_path)
                        else:
                            resp = requests.get(model_path, stream=True)
                            resp.raise_for_status()
                            with open(zip_path, 'wb') as f:
                                for chunk in resp.iter_content(chunk_size=8192):
                                    f.write(chunk)
                        temp_path = model_local_path + '_temp'
                        if os.path.exists(temp_path):
                            shutil.rmtree(temp_path)
                        with zipfile.ZipFile(zip_path, 'r') as zf:
                            zf.extractall(temp_path)
                        os.rename(temp_path, model_local_path)
                        logger.info(f"Model cached at {model_local_path}")
                    finally:
                        if os.path.exists(zip_path):
                            os.remove(zip_path)

                model_path = model_local_path

            # Load (try local cache first, then network)
            try:
                _emotion_model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    model_path, local_files_only=True
                )
                _feature_extractor = AutoFeatureExtractor.from_pretrained(
                    model_path, local_files_only=True
                )
                logger.info("Emotion model loaded from local cache")
            except Exception:
                logger.info("Local cache miss — downloading model...")
                _emotion_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
                _feature_extractor = AutoFeatureExtractor.from_pretrained(model_path)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            _emotion_model = _emotion_model.to(device)
            _emotion_model.eval()
            logger.info(f"Emotion model ready on {device}")
            return _emotion_model, _feature_extractor

        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
            raise


# ============================================================================
# Text model loader
# ============================================================================

def load_text_emotion_pipeline():
    """Load j-hartmann/emotion-english-distilroberta-base pipeline."""
    global _text_emotion_pipeline

    if _text_emotion_pipeline is not None:
        return _text_emotion_pipeline

    try:
        from transformers import pipeline
        _text_emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None
        )
        logger.info("Text emotion pipeline (distilroberta) loaded")
        return _text_emotion_pipeline
    except Exception as e:
        logger.error(f"Failed to load text emotion pipeline: {e}")
        return None


# ============================================================================
# Audio emotion analysis
# ============================================================================

async def analyze_audio_emotion(
    audio_data: bytes,
    sample_rate: int = 16000
) -> AudioEmotionResult:
    """
    Analyze emotion from raw PCM audio bytes using Wav2Vec2.
    Called by session.py pipeline at Stage 1 (before text emotion).
    """
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, _analyze_audio_emotion_sync, audio_data, sample_rate
        )
    except Exception as e:
        logger.error(f"Audio emotion analysis error: {e}")
        return AudioEmotionResult(
            primary_emotion=EmotionLabel.UNKNOWN, confidence=0.0, all_scores={}
        )


def _analyze_audio_emotion_sync(
    audio_data: bytes,
    sample_rate: int = 16000
) -> AudioEmotionResult:
    """Synchronous Wav2Vec2 inference."""
    try:
        model, feature_extractor = load_emotion_model()

        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        inputs = feature_extractor(
            audio_array, sampling_rate=sample_rate, padding=True, return_tensors="pt"
        )
        if next(model.parameters()).is_cuda:
            inputs = {k: v.to('cuda') for k, v in inputs.items()}

        with torch.no_grad():
            logits = model(**inputs).logits

        probs = torch.nn.functional.softmax(logits, dim=-1)
        predicted_id = torch.argmax(logits, dim=-1).item()
        emotion_label = model.config.id2label[predicted_id]
        confidence = probs[0][predicted_id].item()
        all_scores = {
            model.config.id2label[i]: probs[0][i].item()
            for i in range(len(model.config.id2label))
        }

        return AudioEmotionResult(
            primary_emotion=normalize_emotion_label(emotion_label),
            confidence=confidence,
            all_scores=all_scores
        )

    except Exception as e:
        logger.error(f"Audio emotion sync error: {e}")
        return AudioEmotionResult(
            primary_emotion=EmotionLabel.UNKNOWN, confidence=0.0, all_scores={}
        )


# ============================================================================
# Text emotion analysis
# ============================================================================

async def analyze_text_emotion(text: str) -> TextEmotionResult:
    """
    Analyze emotion from English text using j-hartmann/distilroberta-base.
    Called by session.py pipeline at Stage 2 (after translation).
    """
    if not text or not text.strip():
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL, confidence=0.5, all_scores={}
        )
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _analyze_text_emotion_sync, text)
    except Exception as e:
        logger.error(f"Text emotion analysis error: {e}")
        return TextEmotionResult(
            primary_emotion=EmotionLabel.UNKNOWN, confidence=0.0, all_scores={}
        )


def _analyze_text_emotion_sync(text: str) -> TextEmotionResult:
    """Synchronous distilroberta inference."""
    try:
        pipe = load_text_emotion_pipeline()
        if pipe is None:
            return TextEmotionResult(
                primary_emotion=EmotionLabel.NEUTRAL, confidence=0.5, all_scores={}
            )
        results = pipe(text)
        if results and len(results) > 0:
            if isinstance(results[0], list):
                results = results[0]
            all_scores = {r['label'].lower(): r['score'] for r in results}
            top = max(results, key=lambda x: x['score'])
            return TextEmotionResult(
                primary_emotion=normalize_emotion_label(top['label']),
                confidence=top['score'],
                all_scores=all_scores
            )
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL, confidence=0.5, all_scores={}
        )
    except Exception as e:
        logger.error(f"Text emotion sync error: {e}")
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL, confidence=0.5, all_scores={}
        )


# ============================================================================
# GPT Fusion (standalone — imported by session.py)
# ============================================================================

async def _fuse_emotions_with_gpt(
    audio_result: AudioEmotionResult,
    text_result: TextEmotionResult,
    text: str
) -> Tuple[EmotionLabel, float]:
    """
    Send pre-computed audio and text emotion results to GPT-4o-mini for fusion.

    Returns (final_emotion, final_confidence).

    This is called by session.py AFTER both individual models have already run
    and their results have been logged to console independently.

    Raises on GPT failure — caller should catch and apply heuristic fallback.
    """
    from .transcription import get_openai_client

    client = get_openai_client()

    prompt = (
        "You are an expert clinical emotion analyst specialising in psychotherapy sessions.\n\n"
        f"Transcript segment: \"{text}\"\n\n"
        "Model results:\n"
        f"  - distilroberta TEXT model:  {text_result.primary_emotion.value.upper()} "
        f"(confidence: {text_result.confidence:.2f})\n"
        f"  - Wav2Vec2 AUDIO model:      {audio_result.primary_emotion.value.upper()} "
        f"(confidence: {audio_result.confidence:.2f})\n\n"
        "FUSION RULES — apply in order, stop at the first that matches:\n\n"
        "1. BOTH AGREE → Use that emotion. Final confidence = average of both confidences, "
        "   capped at 0.97.\n\n"
        "2. TEXT WINS BY DEFAULT in therapy settings. The text model is generally more "
        "   reliable here because:\n"
        "   - Patients use explicit emotional language ('I feel anxious', 'I don't know what "
        "     to do anymore').\n"
        "   - The audio model (Wav2Vec2) was trained on acted speech corpora and frequently "
        "     misclassifies soft conversational sadness, resignation, or worry as NEUTRAL.\n"
        "   Use the TEXT result when:\n"
        "   a) Text confidence >= 0.50, AND audio confidence < 0.70.\n"
        "   b) Text confidence >= 0.65 (regardless of audio confidence).\n"
        "   Final confidence = text confidence × 0.90.\n\n"
        "3. AUDIO OVERRIDES TEXT only in these specific clinical situations:\n"
        "   a) VOCAL LEAKAGE — text is NEUTRAL or the segment is short (< 6 words), but "
        "      audio is NOT NEUTRAL with confidence > 0.60. The patient said nothing "
        "      meaningful but their voice carries the emotion. Use audio emotion.\n"
        "   b) SARCASM / MASKING — text is positive (JOY) but audio is SADNESS, ANGER, or "
        "      FEAR with confidence > 0.65. Trust the voice over the words.\n"
        "   c) AUDIO DOMINANCE — audio confidence > 0.75 AND text confidence < 0.45. "
        "      The text signal is too weak to rely on.\n"
        "   Final confidence = audio confidence × 0.85.\n\n"
        "4. FALLBACK — if none of the above rules clearly apply, use the model with the "
        "   higher raw confidence. Final confidence = winner confidence × 0.80.\n\n"
        "Important clinical notes:\n"
        "- In therapy, SADNESS, FEAR, and ANXIETY often present as quiet or flat speech — "
        "  do NOT default to NEUTRAL just because the voice is calm.\n"
        "- Prefer a specific emotion over NEUTRAL when there is reasonable evidence.\n"
        "- Do NOT invent emotions not supported by either model.\n\n"
        "Respond ONLY with a JSON object:\n"
        "  {\"final_emotion\": \"<ONE OF: JOY SADNESS ANGER NEUTRAL SURPRISE DISGUST FEAR>\","
        " \"confidence\": <float 0.0-1.0>, \"rule_applied\": \"<1|2a|2b|3a|3b|3c|4>\"}"
    )

    model_name = os.getenv("TRANSCRIPTION_REFINEMENT_MODEL", "gpt-4o-mini")
    request_kwargs = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a clinical AI that fuses audio and text emotion signals "
                    "into a single JSON result. Return only valid JSON, no markdown."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    if not model_name.lower().startswith("gpt-5"):
        request_kwargs["temperature"] = 0.0
        request_kwargs["max_tokens"] = 100

    response = await client.chat.completions.create(**request_kwargs)
    raw_content = response.choices[0].message.content.strip()
    parsed = json.loads(raw_content)

    final_label_str = parsed.get("final_emotion", EmotionLabel.NEUTRAL.value)
    final_emotion = normalize_emotion_label(final_label_str)
    final_confidence = float(parsed.get("confidence", 0.5))
    rule_applied = parsed.get("rule_applied", "?")
    logger.debug(f"[GPT-FUSION] rule={rule_applied} → {final_label_str}({final_confidence:.2f})")

    return final_emotion, final_confidence


# ============================================================================
# Combined helper (kept for /finalize backward compatibility)
# ============================================================================

async def analyze_combined_emotion(
    audio_data: bytes,
    text: str,
    sample_rate: int = 16000
) -> CombinedEmotionResult:
    """
    Convenience wrapper that runs audio emotion, text emotion, and GPT fusion
    in a single call. Used by the /finalize endpoint.

    For the main pipeline (_run_full_pipeline) the three steps are called
    separately so results can be logged at each stage.
    """
    audio_task = asyncio.create_task(analyze_audio_emotion(audio_data, sample_rate))
    text_task = asyncio.create_task(analyze_text_emotion(text))
    audio_result, text_result = await asyncio.gather(audio_task, text_task)

    agreement = (audio_result.primary_emotion == text_result.primary_emotion)

    try:
        final_emotion, final_confidence = await _fuse_emotions_with_gpt(
            audio_result, text_result, text
        )
    except Exception as e:
        logger.error(f"LLM emotion fusion failed: {e}")
        if agreement:
            final_emotion = audio_result.primary_emotion
            final_confidence = max(audio_result.confidence, text_result.confidence)
        elif audio_result.confidence > 0.6:
            final_emotion = audio_result.primary_emotion
            final_confidence = audio_result.confidence * 0.8
        else:
            final_emotion = text_result.primary_emotion
            final_confidence = text_result.confidence * 0.8

    return CombinedEmotionResult(
        audio_emotion=audio_result,
        text_emotion=text_result,
        final_emotion=final_emotion,
        final_confidence=final_confidence,
        agreement=agreement
    )