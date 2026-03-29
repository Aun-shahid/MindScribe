"""
Diarization Service - Speaker diarization using PyAnnote.
All heavy imports are inside functions so a missing package
does NOT crash the FastAPI app on startup.
"""
import tempfile
import os
import logging
from typing import List, Dict, Any

from ..config import settings

logger = logging.getLogger(__name__)

_diarization_pipeline = None


def get_diarization_pipeline():
    """Load PyAnnote diarization pipeline (cached)."""
    global _diarization_pipeline
    if _diarization_pipeline is not None:
        return _diarization_pipeline

    try:
        from pyannote.audio import Pipeline
        from huggingface_hub import login as hf_login

        hf_token = settings.hf_token
        if hf_token:
            hf_login(hf_token)

        _diarization_pipeline = Pipeline.from_pretrained(
            settings.diarization_model,
        )

        try:
            import torch
            if torch.cuda.is_available():
                _diarization_pipeline.to(torch.device("cuda"))
        except Exception:
            pass

        logger.info("PyAnnote diarization pipeline loaded")
        return _diarization_pipeline

    except Exception as e:
        logger.error(f"Failed to load diarization pipeline: {e}")
        return None


async def diarize_audio(audio_path: str) -> List[Dict[str, Any]]:
    """
    Run speaker diarization on audio file.
    Returns list of segments with speaker, start, end, duration.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _diarize_sync, audio_path)


def _diarize_sync(audio_path: str) -> List[Dict[str, Any]]:
    """Synchronous diarization."""
    try:
        import torchaudio

        pipeline = get_diarization_pipeline()
        if pipeline is None:
            logger.warning("Diarization pipeline not available, using fallback")
            return _fallback_diarization(audio_path)

        waveform, sample_rate = torchaudio.load(audio_path)
        audio_in_memory = {"waveform": waveform, "sample_rate": sample_rate}

        diarization = pipeline(audio_in_memory)

        segments = []
        if hasattr(diarization, 'itertracks'):
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    'speaker': speaker,
                    'start': float(turn.start),
                    'end': float(turn.end),
                    'duration': float(turn.end - turn.start)
                })
        else:
            for turn, _, speaker in diarization:
                start = float(turn.start) if hasattr(turn, 'start') else float(turn[0])
                end = float(turn.end) if hasattr(turn, 'end') else float(turn[1])
                segments.append({
                    'speaker': speaker,
                    'start': start,
                    'end': end,
                    'duration': end - start
                })

        logger.info(f"Diarization found {len(segments)} segments")
        return segments

    except Exception as e:
        logger.error(f"Diarization error: {e}")
        return _fallback_diarization(audio_path)


def _fallback_diarization(audio_path: str) -> List[Dict[str, Any]]:
    """Simple silence-based fallback when PyAnnote fails."""
    try:
        from pydub import AudioSegment
        from pydub.silence import detect_nonsilent

        audio = AudioSegment.from_file(audio_path)
        nonsilent_ranges = detect_nonsilent(
            audio, min_silence_len=700, silence_thresh=-40
        )

        segments = []
        for idx, (start_ms, end_ms) in enumerate(nonsilent_ranges):
            start_ms = max(0, start_ms - 200)
            end_ms = min(len(audio), end_ms + 200)
            segments.append({
                'speaker': f'SPEAKER_0{idx % 2}',
                'start': start_ms / 1000.0,
                'end': end_ms / 1000.0,
                'duration': (end_ms - start_ms) / 1000.0
            })

        if not segments:
            duration = len(audio) / 1000.0
            segments.append({
                'speaker': 'SPEAKER_00',
                'start': 0.0,
                'end': duration,
                'duration': duration
            })

        return segments

    except Exception as e:
        logger.error(f"Fallback diarization error: {e}")
        return [{'speaker': 'SPEAKER_00', 'start': 0.0, 'end': 60.0, 'duration': 60.0}]


def resample_audio(audio_path: str, target_sr: int = 16000) -> str:
    """Resample audio to target sample rate, return path to resampled WAV."""
    try:
        import librosa
        import soundfile as sf
        from pathlib import Path

        audio, _ = librosa.load(audio_path, sr=target_sr, mono=True)
        stem = Path(audio_path).stem
        out_path = str(Path(tempfile.gettempdir()) / f"{stem}_16khz.wav")
        sf.write(out_path, audio, target_sr, subtype='PCM_16')
        logger.info(f"Audio resampled to {target_sr}Hz: {out_path}")
        return out_path

    except Exception as e:
        logger.error(f"Resampling error: {e}")
        return audio_path