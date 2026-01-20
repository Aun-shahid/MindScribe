"""
Speaker Diarization Service - Identify different speakers in audio.
Adapted from er_pipeline.py using PyAnnote.
"""
import asyncio
from typing import List, Dict, Optional
from functools import lru_cache
import logging
import tempfile
import os

import numpy as np
import torch
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

from ..config import settings

logger = logging.getLogger(__name__)

# Model cache
_diarization_pipeline = None


def load_diarization_pipeline():
    """
    Load the PyAnnote speaker diarization pipeline.
    
    Returns:
        DiarizationPipeline instance
    """
    global _diarization_pipeline
    
    if _diarization_pipeline is not None:
        return _diarization_pipeline
    
    try:
        from pyannote.audio import Pipeline as DiarizationPipeline
        from huggingface_hub import login as hf_login
        
        # Login to HuggingFace if token provided
        if settings.hf_token:
            try:
                hf_login(settings.hf_token)
                logger.info("Logged in to HuggingFace Hub")
            except Exception as e:
                logger.warning(f"HuggingFace login failed: {e}")
        
        # Load diarization pipeline
        _diarization_pipeline = DiarizationPipeline.from_pretrained(
            settings.diarization_model
        )
        
        # Move to GPU if available
        if torch.cuda.is_available():
            _diarization_pipeline.to(torch.device("cuda"))
            logger.info("Diarization pipeline moved to GPU")
        
        logger.info("Diarization pipeline loaded successfully")
        return _diarization_pipeline
        
    except Exception as e:
        logger.error(f"Failed to load diarization pipeline: {e}")
        raise


async def perform_diarization(
    audio_path: str,
    min_speakers: int = 2,
    max_speakers: int = 2
) -> List[Dict]:
    """
    Perform speaker diarization on audio file.
    
    Args:
        audio_path: Path to audio file
        min_speakers: Minimum expected speakers
        max_speakers: Maximum expected speakers
        
    Returns:
        List of segments with speaker labels and timestamps
    """
    try:
        # Run in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _perform_diarization_sync,
            audio_path,
            min_speakers,
            max_speakers
        )
        return result
        
    except Exception as e:
        logger.error(f"Diarization error: {e}")
        # Fall back to silence-based segmentation
        return await fallback_silence_diarization(audio_path)


def _perform_diarization_sync(
    audio_path: str,
    min_speakers: int,
    max_speakers: int
) -> List[Dict]:
    """Synchronous diarization."""
    try:
        pipeline = load_diarization_pipeline()
        
        # Run diarization with speaker hints
        kwargs = {}
        if min_speakers > 0:
            kwargs['min_speakers'] = min_speakers
        if max_speakers > 0:
            kwargs['max_speakers'] = max_speakers
        
        if kwargs:
            diarization = pipeline(audio_path, **kwargs)
        else:
            diarization = pipeline(audio_path)
        
        # Extract segments
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                'speaker': speaker,
                'start': float(turn.start),
                'end': float(turn.end),
                'duration': float(turn.end - turn.start)
            })
        
        logger.info(f"Diarization found {len(set(s['speaker'] for s in segments))} speakers, {len(segments)} segments")
        return segments
        
    except TypeError:
        # Some pipeline versions don't accept min/max kwargs
        logger.info("Running diarization without speaker hints")
        diarization = pipeline(audio_path)
        
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                'speaker': speaker,
                'start': float(turn.start),
                'end': float(turn.end),
                'duration': float(turn.end - turn.start)
            })
        return segments
        
    except Exception as e:
        logger.error(f"Diarization sync error: {e}")
        raise


async def fallback_silence_diarization(
    audio_path: str,
    min_silence_len: int = 700,
    silence_thresh: int = -40,
    keep_silence: int = 200
) -> List[Dict]:
    """
    Fall back to silence-based segmentation when PyAnnote fails.
    
    Args:
        audio_path: Path to audio file
        min_silence_len: Minimum silence length in ms
        silence_thresh: Silence threshold in dBFS
        keep_silence: Silence to keep at edges in ms
        
    Returns:
        List of segments (all marked as unknown speakers)
    """
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _fallback_silence_diarization_sync,
            audio_path,
            min_silence_len,
            silence_thresh,
            keep_silence
        )
        return result
        
    except Exception as e:
        logger.error(f"Fallback diarization error: {e}")
        return []


def _fallback_silence_diarization_sync(
    audio_path: str,
    min_silence_len: int,
    silence_thresh: int,
    keep_silence: int
) -> List[Dict]:
    """Synchronous fallback diarization."""
    try:
        audio = AudioSegment.from_file(audio_path)
        
        # Detect non-silent ranges
        nonsilent_ranges = detect_nonsilent(
            audio,
            min_silence_len=min_silence_len,
            silence_thresh=silence_thresh
        )
        
        segments = []
        for idx, (start_ms, end_ms) in enumerate(nonsilent_ranges):
            # Expand by keep_silence but clamp to audio duration
            start_ms = max(0, start_ms - keep_silence)
            end_ms = min(len(audio), end_ms + keep_silence)
            
            start = start_ms / 1000.0
            end = end_ms / 1000.0
            
            segments.append({
                'speaker': f'SPEAKER_{idx % 2:02d}',  # Alternate speakers
                'start': start,
                'end': end,
                'duration': end - start
            })
        
        # If no segments found, create single segment for whole file
        if not segments:
            duration = len(audio) / 1000.0
            segments.append({
                'speaker': 'SPEAKER_00',
                'start': 0.0,
                'end': duration,
                'duration': duration
            })
        
        logger.info(f"Fallback diarization created {len(segments)} segments")
        return segments
        
    except Exception as e:
        logger.error(f"Fallback diarization sync error: {e}")
        return []


def merge_consecutive_speaker_turns(
    segments: List[Dict],
    max_pause: float = 0.7
) -> List[Dict]:
    """
    Merge consecutive segments from same speaker.
    
    Args:
        segments: List of diarization segments
        max_pause: Maximum pause between segments to merge (seconds)
        
    Returns:
        Merged segments
    """
    if not segments:
        return []
    
    # Sort by start time
    segs = sorted(segments, key=lambda s: s['start'])
    merged = []
    current = dict(segs[0])
    
    for s in segs[1:]:
        if s['speaker'] == current['speaker']:
            # Check gap
            gap = s['start'] - current.get('end', s['start'])
            if gap <= max_pause:
                # Extend current segment
                current['end'] = max(current.get('end', 0.0), s.get('end', 0.0))
                current['duration'] = current['end'] - current.get('start', 0.0)
            else:
                # Gap too long - finalize current
                merged.append(current)
                current = dict(s)
        else:
            # Different speaker
            merged.append(current)
            current = dict(s)
    
    merged.append(current)
    return merged
