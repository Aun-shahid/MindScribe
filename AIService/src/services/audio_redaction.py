"""Local audio redaction for privacy-preserving transcription.

This module implements a server-side "privacy guard" that keeps audio local
until likely PII has been muted.

Pipeline:
1. Run local Whisper (Faster-Whisper) to get rough word-level timestamps.
2. Run Microsoft Presidio on the rough draft text to detect PII.
3. Map detected entities back to timestamps.
4. Mute those intervals with pydub before the audio is sent anywhere else.

The implementation is intentionally standalone and works with .wav input.
"""

from __future__ import annotations

import argparse
import io
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple, Union

logger = logging.getLogger(__name__)

PathLike = Union[str, Path]
AudioSource = Union[PathLike, bytes, bytearray, io.BytesIO]

DEFAULT_ENTITY_TYPES: tuple[str, ...] = ("PERSON", "PHONE_NUMBER", "LOCATION", "CREDIT_CARD", "CNIC")


@dataclass(frozen=True)
class RedactionInterval:
    """A redaction interval expressed in seconds."""

    start: float
    end: float
    entity_type: str = ""
    text: str = ""


def _load_faster_whisper_model(
    model_size: str,
    device: str,
    compute_type: str,
):
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise ImportError(
            "faster-whisper is required. Install: pip install faster-whisper"
        ) from exc

    return WhisperModel(model_size, device=device, compute_type=compute_type)


def _build_presidio_analyzer(spacy_model_name: str):
    try:
        from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
        from presidio_analyzer.nlp_engine import NlpEngineProvider
    except ImportError as exc:
        raise ImportError(
            "presidio-analyzer is required. Install: pip install presidio-analyzer spacy"
        ) from exc

    nlp_configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": spacy_model_name}],
    }

    try:
        provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
        nlp_engine = provider.create_engine()
        analyzer = AnalyzerEngine(nlp_engine=nlp_engine)

        # 1. Add custom CNIC recognizer (Pakistan National ID)
        cnic_pattern = Pattern(
            name="cnic_pattern",
            regex=r"\b\d{5}[\s-]?\d{7}[\s-]?\d{1}\b",
            score=0.95
        )
        cnic_recognizer = PatternRecognizer(
            supported_entity="CNIC",
            patterns=[cnic_pattern],
            context=["cnic", "identity", "card", "nic", "number"]
        )
        analyzer.registry.add_recognizer(cnic_recognizer)

        # 2. Add custom Credit Card recognizer (generic 16-digit, bypasses Luhn for testing)
        cc_pattern = Pattern(
            name="cc_pattern",
            regex=r"\b(?:\d{4}[\s-]?){3}\d{4}\b",
            score=0.85
        )
        cc_recognizer = PatternRecognizer(
            supported_entity="CREDIT_CARD",
            patterns=[cc_pattern],
            context=["credit", "debit", "card", "visa", "mastercard"]
        )
        analyzer.registry.add_recognizer(cc_recognizer)

        # 3. Add custom Address recognizer (handles "Makan number", "Gali", "Phase", etc.)
        # This is a generic pattern, not hardcoded to specific numbers.
        address_pattern = Pattern(
            name="address_pattern",
            regex=r"\b(?:makan|gali|house|street|sector|phase|plot|apartment|flat|home|building|block|unit|village|chak|tehsil|district)\s*(?:number|no|#)?\s*\d+[a-z]?\b",
            score=0.85
        )
        address_recognizer = PatternRecognizer(
            supported_entity="LOCATION",
            patterns=[address_pattern],
            context=["makan", "gali", "house", "street", "address", "location", "resident", "sector", "block"]
        )
        analyzer.registry.add_recognizer(address_recognizer)
        
        return analyzer
    except Exception as exc:
        raise RuntimeError(
            "Failed to initialize Presidio. Make sure the spaCy model is installed, "
            f"for example: python -m spacy download {spacy_model_name}"
        ) from exc


def _load_audio_segment_module():
    try:
        from pydub import AudioSegment
    except ImportError as exc:
        raise ImportError(
            "pydub is required. Install: pip install pydub"
        ) from exc

    return AudioSegment


_guard_instance: Optional[AudioPrivacyGuard] = None


def get_audio_privacy_guard() -> AudioPrivacyGuard:
    """Get or create a singleton instance of AudioPrivacyGuard."""
    global _guard_instance
    if _guard_instance is None:
        # Default to CPU for production stability on Railway
        _guard_instance = AudioPrivacyGuard(
            device=os.getenv("PII_REDACTION_DEVICE", "cpu"),
            model_size=os.getenv("PII_REDACTION_MODEL", "small")
        )
    return _guard_instance


def _write_source_to_temp_wav(source: AudioSource) -> Tuple[str, Optional[str]]:
    """Materialize an audio source to a temporary WAV file if needed.

    Returns a tuple of (path, cleanup_path). If cleanup_path is not None, the
    caller must delete it after use.
    """

    if isinstance(source, (str, Path)):
        return str(Path(source)), None

    if isinstance(source, io.BytesIO):
        payload = source.getvalue()
    elif isinstance(source, (bytes, bytearray)):
        payload = bytes(source)
    else:
        raise TypeError("source must be a path, bytes, or BytesIO")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    try:
        temp_file.write(payload)
        temp_file.flush()
    finally:
        temp_file.close()

    return temp_file.name, temp_file.name


def _merge_intervals(intervals: Iterable[Tuple[float, float]]) -> List[Tuple[float, float]]:
    merged: List[Tuple[float, float]] = []
    for start, end in sorted((max(0.0, float(s)), max(0.0, float(e))) for s, e in intervals):
        if end <= start:
            continue
        if not merged or start > merged[-1][1]:
            merged.append((start, end))
        else:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    return merged


class AudioPrivacyGuard:
    """Local audio redaction guard.

    The guard keeps audio on-device/server until PII intervals are muted.
    """

    def __init__(
        self,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        spacy_model_name: str = "en_core_web_lg",
        entity_types: Sequence[str] = DEFAULT_ENTITY_TYPES,
        padding_ms: int = 200,
    ) -> None:
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.spacy_model_name = spacy_model_name
        self.entity_types = tuple(entity_types)
        self.padding_ms = max(0, int(padding_ms))

        self.stt_model = _load_faster_whisper_model(
            model_size=model_size,
            device=device,
            compute_type=compute_type,
        )
        self.analyzer = _build_presidio_analyzer(spacy_model_name=spacy_model_name)

    def _collect_word_map(self, audio_path: str) -> Tuple[str, List[dict]]:
        """Transcribe locally and collect word-to-character/time mappings."""

        segments, _info = self.stt_model.transcribe(
            audio_path,
            word_timestamps=True,
            vad_filter=True,
            task="translate",
            initial_prompt="This is a session recording involving PII like names, addresses, CNIC numbers, and contact details."
        )

        full_text_parts: List[str] = []
        word_map: List[dict] = []

        char_cursor = 0

        for segment in segments:
            words = getattr(segment, "words", None) or []
            for word in words:
                word_text = str(getattr(word, "word", "") or "").strip()
                if not word_text:
                    continue

                if full_text_parts:
                    full_text_parts.append(" ")
                    char_cursor += 1

                char_start = char_cursor
                full_text_parts.append(word_text)
                char_cursor += len(word_text)
                char_end = char_cursor

                start_time = float(getattr(word, "start", 0.0) or 0.0)
                end_time = float(getattr(word, "end", start_time) or start_time)

                word_map.append(
                    {
                        "word": word_text,
                        "start": start_time,
                        "end": end_time,
                        "char_start": char_start,
                        "char_end": char_end,
                    }
                )

        return "".join(full_text_parts), word_map

    def get_pii_segments(self, audio_source: AudioSource) -> List[RedactionInterval]:
        """Return PII-based redaction intervals in seconds."""

        audio_path, cleanup_path = _write_source_to_temp_wav(audio_source)
        try:
            full_text, word_map = self._collect_word_map(audio_path)
            if not full_text.strip() or not word_map:
                return []

            results = self.analyzer.analyze(
                text=full_text,
                entities=list(self.entity_types),
                language="en",
            )

            intervals: List[RedactionInterval] = []

            for result in results:
                pii_start = int(getattr(result, "start", 0) or 0)
                pii_end = int(getattr(result, "end", 0) or 0)
                if pii_end <= pii_start:
                    continue

                matched_words = [
                    word
                    for word in word_map
                    if not (word["char_end"] <= pii_start or word["char_start"] >= pii_end)
                ]
                if not matched_words:
                    continue

                start_time = matched_words[0]["start"]
                end_time = matched_words[-1]["end"]

                # Whisper often aligns long numbers poorly, pushing the start timestamp to the end
                # of the spoken number. If there's a gap before this PII word, it's highly likely
                # the PII was being spoken during that gap. We extend the start time backward.
                try:
                    first_idx = word_map.index(matched_words[0])
                    if first_idx > 0:
                        prev_end = word_map[first_idx - 1]["end"]
                        # If there's more than 0.2s gap, expand start_time backwards
                        if start_time - prev_end > 0.2:
                            start_time = prev_end + 0.1
                except ValueError:
                    pass

                intervals.append(
                    RedactionInterval(
                        start=start_time,
                        end=end_time,
                        entity_type=str(getattr(result, "entity_type", "") or ""),
                        text=full_text[pii_start:pii_end].strip(),
                    )
                )

            return intervals
        finally:
            if cleanup_path:
                try:
                    Path(cleanup_path).unlink(missing_ok=True)
                except Exception:
                    logger.warning("Failed to delete temporary audio file: %s", cleanup_path)

    def redact_audio(self, audio_source: AudioSource) -> io.BytesIO:
        """Mute detected PII intervals and return a WAV buffer."""

        audio_path, cleanup_path = _write_source_to_temp_wav(audio_source)
        try:
            AudioSegment = _load_audio_segment_module()
            audio = AudioSegment.from_file(audio_path)

            intervals = self.get_pii_segments(audio_path)
            if not intervals:
                buffer = io.BytesIO()
                audio.export(buffer, format="wav")
                buffer.seek(0)
                return buffer

            merged = _merge_intervals((interval.start, interval.end) for interval in intervals)

            redacted = AudioSegment.empty()
            cursor_ms = 0

            for start, end in merged:
                start_ms = max(0, int(start * 1000) - self.padding_ms)
                end_ms = min(len(audio), int(end * 1000) + self.padding_ms)

                if start_ms > cursor_ms:
                    redacted += audio[cursor_ms:start_ms]

                if end_ms > start_ms:
                    redacted += AudioSegment.silent(duration=end_ms - start_ms, frame_rate=audio.frame_rate)

                cursor_ms = max(cursor_ms, end_ms)

            if cursor_ms < len(audio):
                redacted += audio[cursor_ms:]

            buffer = io.BytesIO()
            redacted.export(buffer, format="wav")
            buffer.seek(0)
            return buffer
        finally:
            if cleanup_path:
                try:
                    Path(cleanup_path).unlink(missing_ok=True)
                except Exception:
                    logger.warning("Failed to delete temporary audio file: %s", cleanup_path)

    def redact_audio_file(self, input_path: PathLike, output_path: Optional[PathLike] = None) -> Path:
        """Redact a WAV file on disk and write a new WAV file."""

        input_file = Path(input_path)
        if input_file.suffix.lower() != ".wav":
            raise ValueError("input_path must point to a .wav file")
        if not input_file.exists():
            raise FileNotFoundError(str(input_file))

        buffer = self.redact_audio(str(input_file))

        if output_path is None:
            output_file = input_file.with_name(f"{input_file.stem}_redacted.wav")
        else:
            output_file = Path(output_path)
            if output_file.suffix.lower() != ".wav":
                raise ValueError("output_path must point to a .wav file")

        output_file.write_bytes(buffer.getvalue())
        return output_file


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Redact likely PII from a WAV file using local Whisper and Presidio.",
    )
    parser.add_argument("input_wav", help="Path to the input .wav file")
    parser.add_argument("output_wav", nargs="?", help="Path to the output .wav file")
    parser.add_argument("--model-size", default="small", help="Faster-Whisper model size")
    parser.add_argument("--device", default="cpu", help="faster-whisper device, usually cpu or cuda")
    parser.add_argument("--compute-type", default="int8", help="faster-whisper compute type")
    parser.add_argument(
        "--spacy-model",
        default="en_core_web_lg",
        help="spaCy model used by Presidio",
    )
    parser.add_argument(
        "--padding-ms",
        type=int,
        default=200,
        help="Extra mute padding before and after each detected interval",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    """Command-line entry point."""

    args = _build_arg_parser().parse_args(argv)
    guard = AudioPrivacyGuard(
        model_size=args.model_size,
        device=args.device,
        compute_type=args.compute_type,
        spacy_model_name=args.spacy_model,
        padding_ms=args.padding_ms,
    )
    output_file = guard.redact_audio_file(args.input_wav, output_path=args.output_wav)
    print(str(output_file))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())