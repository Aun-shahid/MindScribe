#!/usr/bin/env python3
"""
Diarize demo using OpenAI `gpt-4o-transcribe-diarize` model.

Usage:
  python AIService/scripts/diarize_demo.py --file meeting.wav --language ur --output out.json

Requirements:
  - `openai` Python package (the official SDK used in this repo)
  - Set environment variable `OPENAI_API_KEY`

This script uploads an audio file and prints the combined transcript
and diarized segments (speaker labels and timestamps). It can also
save the raw JSON response to `--output`.
"""
import os
import sys
import argparse
import json
import tempfile
from pathlib import Path
from typing import Optional, List

try:
    from openai import OpenAI, BadRequestError
except Exception as e:
    print("Missing dependency: install the 'openai' package.", file=sys.stderr)
    raise


MAX_UPLOAD_BYTES = 25 * 1024 * 1024


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


def transcribe(file_path: str, language: str = "ur", known_speakers=None, output_path: str = None, dry_run: bool = False):
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

    # Dry-run: validate inputs and show request that would be sent
    if dry_run:
        print(f"DRY RUN: Would upload: {resolved_path}")
        print(f"DRY RUN: model=gpt-4o-transcribe-diarize, response_format=diarized_json")
        print(f"DRY RUN: language={language}, chunking_strategy=auto")
        if known_speakers:
            print(f"DRY RUN: known_speaker_names={known_speakers}")
        print("DRY RUN: Skipping network call to OpenAI API.")
        return

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    print(f"Uploading {resolved_path.name} and requesting diarization (model=gpt-4o-transcribe-diarize)...")

    transcript = None
    temp_converted_path = None
    try:
        try:
            transcript = request_diarization(client, resolved_path, language, known_speakers)
        except BadRequestError as e:
            # Retry once with WAV conversion if OpenAI rejects the file format/stream.
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

    # Safely access text and segments from response-like objects or dicts
    def get_attr(obj, name, default=None):
        if obj is None:
            return default
        if isinstance(obj, dict):
            return obj.get(name, default)
        return getattr(obj, name, default)

    text = get_attr(transcript, "text", "")
    print("\n--- Combined Text ---\n")
    print(text)

    segments = get_attr(transcript, "segments", None)
    print("\n--- Segments ---\n")
    if not segments:
        print("No segments found in response.")
    else:
        for seg in segments:
            start = seg.get("start", 0.0) if isinstance(seg, dict) else get_attr(seg, "start", 0.0)
            end = seg.get("end", 0.0) if isinstance(seg, dict) else get_attr(seg, "end", 0.0)
            speaker = seg.get("speaker", "?") if isinstance(seg, dict) else get_attr(seg, "speaker", "?")
            stext = seg.get("text", "") if isinstance(seg, dict) else get_attr(seg, "text", "")
            print(f"[{start:.1f}s - {end:.1f}s] Speaker {speaker}: {stext}")

    if output_path:
        out_obj = None
        if isinstance(transcript, dict):
            out_obj = transcript
        else:
            # Build a safe serializable dict
            out_obj = {
                "text": text,
                "duration": get_attr(transcript, "duration", None),
                "segments": []
            }
            if segments:
                for seg in segments:
                    if isinstance(seg, dict):
                        out_obj["segments"].append(seg)
                    else:
                        out_obj["segments"].append({
                            "id": get_attr(seg, "id", None),
                            "start": get_attr(seg, "start", None),
                            "end": get_attr(seg, "end", None),
                            "speaker": get_attr(seg, "speaker", None),
                            "text": get_attr(seg, "text", None),
                        })

        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(out_obj, f, ensure_ascii=False, indent=2)
            print(f"Saved response JSON to {output_path}")
        except Exception as e:
            print(f"Failed to save JSON output: {e}", file=sys.stderr)


def parse_args():
    p = argparse.ArgumentParser(description="Diarization demo with gpt-4o-transcribe-diarize")
    p.add_argument("--file", "-f", required=True, help="Path to audio file (wav, mp3, m4a, etc.)")
    p.add_argument("--language", "-l", default="ur", help="Language ISO code (e.g. 'ur' for Urdu, 'en' for English)")
    p.add_argument("--output", "-o", default=None, help="Optional output JSON file to save response")
    p.add_argument("--known-speakers", "-k", default=None, help="Comma-separated known speaker names (optional)")
    p.add_argument("--dry-run", action="store_true", help="Validate inputs and show request without calling OpenAI API")
    return p.parse_args()


def main():
    args = parse_args()

    known = None
    if args.known_speakers:
        known = [s.strip() for s in args.known_speakers.split(",") if s.strip()]

    transcribe(args.file, language=args.language, known_speakers=known, output_path=args.output, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
