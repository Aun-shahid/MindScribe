"""
Emotion Analysis Service - Dual emotion analysis (audio + text).
Uses Wav2Vec2 for audio and text classification for text-based analysis.
"""
import asyncio
from typing import Optional, Dict, Any, Tuple
from functools import lru_cache
import logging
import io
import tempfile
import os
import requests
import zipfile
import threading
import shutil

import numpy as np
import torch
import json
import os

from ..config import settings
from ..schemas import (
    CombinedEmotionResult, AudioEmotionResult, TextEmotionResult,
    EmotionLabel
)

logger = logging.getLogger(__name__)

# Model cache and locks
_emotion_model = None
_feature_extractor = None
_text_emotion_pipeline = None
_model_lock = threading.Lock()


def download_from_gdrive(url: str, dest_path: str):
    """
    Robust Google Drive downloader that handles large file confirmation.
    """
    def get_confirm_token(response):
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                return value
        return None

    session = requests.Session()
    response = session.get(url, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {'confirm': token}
        response = session.get(url, params=params, stream=True)

    response.raise_for_status()
    
    with open(dest_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=32768):
            if chunk:
                f.write(chunk)


def normalize_emotion_label(label: str) -> EmotionLabel:
    """
    Map raw emotion labels to canonical EmotionLabel enum.
    
    Args:
        label: Raw emotion label from model
        
    Returns:
        Normalized EmotionLabel
    """
    try:
        s = str(label).strip().lower()
    except Exception:
        return EmotionLabel.UNKNOWN
    
    if not s or s in {'nan', 'none', 'n/a', 'unknown'}:
        return EmotionLabel.UNKNOWN
    
    # Map common variations
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


def load_emotion_model() -> Tuple[Any, Any]:
    """
    Load the Wav2Vec2 emotion recognition model.
    Uses the path from environment variable. Supports Google Drive URLs.
    
    Returns:
        Tuple of (model, feature_extractor)
    """
    global _emotion_model, _feature_extractor
    
    if _emotion_model is not None and _feature_extractor is not None:
        return _emotion_model, _feature_extractor
        
    with _model_lock:
        # Check again inside lock to avoid double loading
        if _emotion_model is not None and _feature_extractor is not None:
            return _emotion_model, _feature_extractor
            
        try:
            from transformers import (
                Wav2Vec2ForSequenceClassification,
                AutoFeatureExtractor
            )
            
            model_path = settings.emotion_model_path
            logger.info(f"Loading emotion model from: {model_path}")
            
            # Handle Hugging Face URLs by converting to model ID
            if model_path.startswith('https://huggingface.co/'):
                # Extract model ID: huggingface.co/username/model-name -> username/model-name
                parts = model_path.replace('https://huggingface.co/', '').split('/')
                if len(parts) >= 2:
                    model_path = f"{parts[0]}/{parts[1]}"
                    logger.info(f"Converted Hugging Face URL to model ID: {model_path}")
                else:
                    logger.warning(f"Invalid Hugging Face URL format: {model_path}")
            
            # If model_path is a URL, download and extract to cache
            if model_path.startswith('https://'):
                cache_dir = os.path.expanduser('~/.cache/mindscribe/models')
                os.makedirs(cache_dir, exist_ok=True)
                
                # Create a unique name based on URL to allow multiple remote models
                import hashlib
                url_hash = hashlib.md5(model_path.encode()).hexdigest()[:10]
                model_local_path = os.path.join(cache_dir, f"emotion_model_{url_hash}")
                
                if not os.path.exists(model_local_path):
                    logger.info(f"Downloading remote model to {model_local_path}")
                    zip_path = model_local_path + '.zip'
                    
                    try:
                        if 'drive.google.com' in model_path:
                            download_from_gdrive(model_path, zip_path)
                        else:
                            response = requests.get(model_path, stream=True)
                            response.raise_for_status()
                            with open(zip_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                        
                        # Atomic extraction: Extract to temp then move
                        temp_extract_path = model_local_path + '_temp'
                        if os.path.exists(temp_extract_path):
                            shutil.rmtree(temp_extract_path)
                            
                        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                            zip_ref.extractall(temp_extract_path)
                        
                        os.rename(temp_extract_path, model_local_path)
                        logger.info(f"Model successfully cached at {model_local_path}")
                        
                    finally:
                        if os.path.exists(zip_path):
                            os.remove(zip_path)
                
                model_path = model_local_path
            
            _emotion_model = None
            _feature_extractor = None
            
            # Try loading from local files first to avoid network checks during dev reloads
            try:
                _emotion_model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    model_path, local_files_only=True
                )
                _feature_extractor = AutoFeatureExtractor.from_pretrained(
                    model_path, local_files_only=True
                )
                logger.info("Loaded emotion model from local cache (offline mode)")
            except Exception:
                # If local load fails, attempt normal load (may involve downloading)
                logger.info("Model not found in local cache, performing network check...")
                _emotion_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
                _feature_extractor = AutoFeatureExtractor.from_pretrained(model_path)
            
            # Move to GPU if available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            _emotion_model = _emotion_model.to(device)
            logger.info(f"Emotion model loaded successfully on {device}")
            
            _emotion_model.eval()
            return _emotion_model, _feature_extractor
            
        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
            raise


def load_text_emotion_pipeline():
    """
    Load text-based emotion classification pipeline.
    
    Returns:
        Transformers pipeline for text classification
    """
    global _text_emotion_pipeline
    
    if _text_emotion_pipeline is not None:
        return _text_emotion_pipeline
    
    try:
        from transformers import pipeline
        
        # Use a lightweight model for text emotion
        _text_emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None  # Return all scores
        )
        
        logger.info("Text emotion pipeline loaded")
        return _text_emotion_pipeline
        
    except Exception as e:
        logger.error(f"Failed to load text emotion pipeline: {e}")
        return None


async def analyze_audio_emotion(
    audio_data: bytes,
    sample_rate: int = 16000
) -> AudioEmotionResult:
    """
    Analyze emotion from audio using Wav2Vec2 model.
    
    Args:
        audio_data: Raw audio bytes (PCM format)
        sample_rate: Audio sample rate
        
    Returns:
        AudioEmotionResult with detected emotion and confidence
    """
    try:
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _analyze_audio_emotion_sync,
            audio_data,
            sample_rate
        )
        return result
        
    except Exception as e:
        logger.error(f"Audio emotion analysis error: {e}")
        return AudioEmotionResult(
            primary_emotion=EmotionLabel.UNKNOWN,
            confidence=0.0,
            all_scores={}
        )


def _analyze_audio_emotion_sync(
    audio_data: bytes,
    sample_rate: int = 16000
) -> AudioEmotionResult:
    """Synchronous audio emotion analysis."""
    try:
        model, feature_extractor = load_emotion_model()
        
        # Convert bytes to numpy array
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        audio_float = audio_array.astype(np.float32) / 32768.0
        
        # Prepare input
        inputs = feature_extractor(
            audio_float,
            sampling_rate=sample_rate,
            padding=True,
            return_tensors="pt"
        )
        
        # Move to GPU if model is on GPU
        if next(model.parameters()).is_cuda:
            inputs = {k: v.to('cuda') for k, v in inputs.items()}
        
        # Get predictions
        with torch.no_grad():
            logits = model(**inputs).logits
        
        # Get probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)
        predicted_id = torch.argmax(logits, dim=-1).item()
        
        # Get label and confidence
        emotion_label = model.config.id2label[predicted_id]
        confidence = probs[0][predicted_id].item()
        
        # Get all emotion scores
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
            primary_emotion=EmotionLabel.UNKNOWN,
            confidence=0.0,
            all_scores={}
        )


async def analyze_text_emotion(text: str) -> TextEmotionResult:
    """
    Analyze emotion from text using transformer model.
    
    Args:
        text: Text to analyze
        
    Returns:
        TextEmotionResult with detected emotion and confidence
    """
    if not text or not text.strip():
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL,
            confidence=0.5,
            all_scores={}
        )
    
    try:
        # Run in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _analyze_text_emotion_sync,
            text
        )
        return result
        
    except Exception as e:
        logger.error(f"Text emotion analysis error: {e}")
        return TextEmotionResult(
            primary_emotion=EmotionLabel.UNKNOWN,
            confidence=0.0,
            all_scores={}
        )


def _analyze_text_emotion_sync(text: str) -> TextEmotionResult:
    """Synchronous text emotion analysis."""
    try:
        pipeline = load_text_emotion_pipeline()
        
        if pipeline is None:
            return TextEmotionResult(
                primary_emotion=EmotionLabel.NEUTRAL,
                confidence=0.5,
                all_scores={}
            )
        
        # Get predictions
        results = pipeline(text)
        
        # Results is a list of dicts with 'label' and 'score'
        if results and len(results) > 0:
            # Find highest scoring emotion
            if isinstance(results[0], list):
                results = results[0]
            
            all_scores = {r['label'].lower(): r['score'] for r in results}
            top_result = max(results, key=lambda x: x['score'])
            
            return TextEmotionResult(
                primary_emotion=normalize_emotion_label(top_result['label']),
                confidence=top_result['score'],
                all_scores=all_scores
            )
        
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL,
            confidence=0.5,
            all_scores={}
        )
    except Exception as e:
        logger.error(f"Text emotion sync error: {e}")
        return TextEmotionResult(
            primary_emotion=EmotionLabel.NEUTRAL,
            confidence=0.5,
            all_scores={}
        )

async def analyze_combined_emotion(
    audio_data: bytes,
    text: str,
    sample_rate: int = 16000
) -> CombinedEmotionResult:
    """
    Combines audio and text-based emotion analysis to give a grounded classification.
    Uses an LLM to smartly fuse the two results into a final emotional context.
    """
    # 1. Run both models concurrently
    audio_task = asyncio.create_task(analyze_audio_emotion(audio_data, sample_rate))
    text_task = asyncio.create_task(analyze_text_emotion(text))
    
    audio_result, text_result = await asyncio.gather(audio_task, text_task)
    
    # Check if they agree right away
    agreement = (audio_result.primary_emotion == text_result.primary_emotion)
    
    # 2. Use an LLM to fuse them smartly
    # We use a fast model for rapid per-segment fusion
    try:
        from .transcription import get_openai_client
        import json
        import os
        client = get_openai_client()
        
        prompt = (
            "You are an expert clinical emotion analyst.\n"
            f"You are analyzing a transcript segment: \"{text}\"\n"
            f"- A speech-processing model detected the vocal emotion as: {audio_result.primary_emotion.value.upper()} (confidence: {audio_result.confidence:.2f})\n"
            f"- A text-sentiment model detected the textual emotion as: {text_result.primary_emotion.value.upper()} (confidence: {text_result.confidence:.2f})\n\n"
            "Combine these signals to determine the single most accurate underlying emotion. "
            "Consider sarcasm (e.g., positive words but angry/sad voice means angry/sad). "
            "Consider vocal leakage (if text is neutral but voice is sad, the result is sad).\n"
            "Respond ONLY with a JSON object with two keys:\n"
            "1. 'final_emotion': one of [JOY, SADNESS, ANGER, NEUTRAL, SURPRISE, DISGUST, FEAR]\n"
            "2. 'confidence': a float between 0.0 and 1.0 representing your confidence in this fusion."
        )

        model_name = os.getenv("TRANSCRIPTION_REFINEMENT_MODEL", "gpt-4o-mini")
        request_kwargs = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": "You are a clinical AI that accurately resolves conflicting or synergistic emotion signals into a single JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        # GPT-5 compatibility
        if not model_name.lower().startswith("gpt-5"):
            request_kwargs["temperature"] = 0.0
            request_kwargs["max_tokens"] = 100

        response = await client.chat.completions.create(**request_kwargs)
        raw_content = response.choices[0].message.content.strip()
        parsed = json.loads(raw_content)
        
        final_label_str = parsed.get("final_emotion", EmotionLabel.NEUTRAL.value)
        final_emotion = normalize_emotion_label(final_label_str)
        final_confidence = float(parsed.get("confidence", 0.5))

    except Exception as e:
        logger.error(f"LLM emotion fusion failed: {e}")
        # Fallback heuristic if LLM fails
        if agreement:
            final_emotion = audio_result.primary_emotion
            final_confidence = max(audio_result.confidence, text_result.confidence)
        else:
            # Weighted fallback: slightly favor audio if high confidence
            if audio_result.confidence > 0.6:
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
