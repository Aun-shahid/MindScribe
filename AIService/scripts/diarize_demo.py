#!/usr/bin/env python3
"""
Diarize demo using ElevenLabs `scribe_v2` speech-to-text model.

Usage:
  python AIService/scripts/diarize_demo.py --file meeting.wav --language ur --output out.json

Requirements:
    - `requests` Python package
    - Set environment variable `ELEVENLABS_API_KEY`

This script uploads an audio file and prints the combined transcript
and diarized segments (speaker labels and timestamps). It can also
save the raw JSON response to `--output`.
"""
import os
import sys
import argparse
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    import requests
except Exception as e:
    print("Missing dependency: install the 'requests' package.", file=sys.stderr)
    raise


MAX_UPLOAD_BYTES = 3 * 1024 * 1024 * 1024
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_MODEL_ID = "scribe_v2"
SENTENCE_END_CHARS = {".", "!", "?", "۔", "؟"}


def bool_to_api(value: bool) -> str:
    return "true" if value else "false"


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


def read_env_value(key: str) -> Optional[str]:
    """Read a key from local .env files when not exported in shell."""
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[1] / ".env",
    ]

    for env_path in candidates:
        if not env_path.exists() or not env_path.is_file():
            continue
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                k, v = stripped.split("=", 1)
                if k.strip() != key:
                    continue
                value = v.strip().strip('"').strip("'")
                if value:
                    return value
        except Exception:
            continue

    return None


def request_diarization(api_key: str, audio_path: Path, payload: Dict[str, Any], enable_logging: bool) -> Dict[str, Any]:
    data_items: List[tuple[str, str]] = []
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, bool):
            data_items.append((key, bool_to_api(value)))
        elif isinstance(value, list):
            # Multipart form arrays are encoded as repeated fields.
            for item in value:
                if isinstance(item, (dict, list)):
                    data_items.append((key, json.dumps(item, ensure_ascii=False)))
                else:
                    data_items.append((key, str(item)))
        elif isinstance(value, dict):
            data_items.append((key, json.dumps(value, ensure_ascii=False)))
        else:
            data_items.append((key, str(value)))

    headers = {"xi-api-key": api_key}
    params = {"enable_logging": bool_to_api(enable_logging)}
    with open(audio_path, "rb") as audio_file:
        files = {"file": (audio_path.name, audio_file, "application/octet-stream")}
        response = requests.post(
            ELEVENLABS_STT_URL,
            headers=headers,
            params=params,
            data=data_items,
            files=files,
            timeout=900,
        )

    parsed_payload: Optional[Dict[str, Any]]
    try:
        raw_payload = response.json()
        parsed_payload = raw_payload if isinstance(raw_payload, dict) else None
    except Exception:
        parsed_payload = None

    if response.status_code >= 400:
        if parsed_payload is not None:
            raise RuntimeError(f"ElevenLabs transcription failed ({response.status_code}): {json.dumps(parsed_payload, ensure_ascii=False)}")
        raise RuntimeError(f"ElevenLabs transcription failed ({response.status_code}): {response.text}")

    if parsed_payload is None:
        raise RuntimeError("ElevenLabs transcription returned an unexpected response format.")
    return parsed_payload


def token_ends_sentence(token_text: str) -> bool:
    token = token_text.rstrip()
    return bool(token) and token[-1] in SENTENCE_END_CHARS


def flush_segment(segments: List[Dict[str, Any]], current: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if current is None:
        return None
    text = current.get("text", "").strip()
    if not text:
        return None
    segments.append(
        {
            "start": current["start"],
            "end": current["end"],
            "speaker": current["speaker"],
            "text": text,
        }
    )
    return None


def build_segments_from_words(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build sentence-level diarized segments from word/spacing tokens."""
    segments: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

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
            current = flush_segment(segments, current)

        if current is None:
            if token_type == "spacing":
                continue
            current = {
                "start": start,
                "end": end,
                "speaker": speaker,
                "text": token,
            }
        else:
            current["end"] = end
            current["text"] += token

        if token_type != "spacing" and token_ends_sentence(token):
            current = flush_segment(segments, current)

    flush_segment(segments, current)
    return segments


def transcribe(
    file_path: str,
    language: str = "ur",
    output_path: Optional[str] = None,
    dry_run: bool = False,
    model_id: str = ELEVENLABS_MODEL_ID,
    enable_logging: bool = True,
    tag_audio_events: bool = True,
    num_speakers: Optional[int] = None,
    timestamps_granularity: str = "word",
    diarize: bool = True,
    diarization_threshold: Optional[float] = 0.22,
    file_format: str = "other",
    webhook: bool = False,
    webhook_id: Optional[str] = None,
    temperature: float = 0.0,
    seed: int = 42,
    use_multi_channel: bool = False,
    webhook_metadata: Optional[Dict[str, Any]] = None,
    entity_detection: str = "all",
    no_verbatim: bool = False,
    entity_redaction: str = "pii",
    entity_redaction_mode: str = "enumerated_entity_type",
    keyterms: Optional[List[str]] = None,
    additional_formats: Optional[List[Dict[str, Any]]] = None,
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
            f"WARNING: File is {file_size / (1024 * 1024):.2f} MB (> 3 GB API limit). "
            "Use a smaller source file.",
            file=sys.stderr,
        )

    if num_speakers is not None and diarization_threshold is not None:
        print(
            "INFO: diarization_threshold can only be set when num_speakers is null. Ignoring diarization_threshold.",
            file=sys.stderr,
        )
        diarization_threshold = None

    if webhook_metadata is None:
        webhook_metadata = {"source": "diarize_demo", "language_code": language}

    if keyterms is None:
        keyterms = ["therapy", "session", "patient", "therapist", "mindscribe"]

    if additional_formats is None:
        additional_formats = []

    request_payload: Dict[str, Any] = {
        "model_id": model_id,
        "language_code": language,
        "tag_audio_events": tag_audio_events,
        "num_speakers": num_speakers,
        "timestamps_granularity": timestamps_granularity,
        "diarize": diarize,
        "diarization_threshold": diarization_threshold,
        "additional_formats": additional_formats,
        "file_format": file_format,
        "webhook": webhook,
        "webhook_id": webhook_id,
        "temperature": temperature,
        "seed": seed,
        "use_multi_channel": use_multi_channel,
        "webhook_metadata": webhook_metadata,
        "entity_detection": entity_detection,
        "no_verbatim": no_verbatim,
        "entity_redaction": entity_redaction,
        "entity_redaction_mode": entity_redaction_mode,
        "keyterms": keyterms,
    }

    # Dry-run: validate inputs and show request that would be sent
    if dry_run:
        print(f"DRY RUN: Would upload: {resolved_path}")
        print(f"DRY RUN: endpoint={ELEVENLABS_STT_URL}?enable_logging={bool_to_api(enable_logging)}")
        print("DRY RUN: payload=")
        print(json.dumps(request_payload, ensure_ascii=False, indent=2))
        print("DRY RUN: Skipping network call to ElevenLabs API.")
        return

    api_key = os.getenv("ELEVENLABS_API_KEY") or read_env_value("ELEVENLABS_API_KEY")
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    print(f"Uploading {resolved_path.name} and requesting transcription (model={model_id})...")

    try:
        transcript = request_diarization(api_key, resolved_path, request_payload, enable_logging)
    except Exception as e:
        print(f"Transcription request failed: {e}", file=sys.stderr)
        raise

    text = transcript.get("text", "")
    print("\n--- Combined Text ---\n")
    print(text)

    words = transcript.get("words", [])
    segments = build_segments_from_words(words)
    print("\n--- Segments ---\n")
    if not segments:
        print("No segments found in response.")
    else:
        for seg in segments:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", 0.0))
            speaker = seg.get("speaker", "?")
            stext = seg.get("text", "")
            print(f"[{start:.1f}s - {end:.1f}s] Speaker {speaker}: {stext}")

    if output_path:
        out_obj = {
            "language_code": transcript.get("language_code"),
            "language_probability": transcript.get("language_probability"),
            "text": text,
            "segments": segments,
        }

        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(out_obj, f, ensure_ascii=False, indent=2)
            print(f"Saved response JSON to {output_path}")
        except Exception as e:
            print(f"Failed to save JSON output: {e}", file=sys.stderr)


def parse_args():
    p = argparse.ArgumentParser(description="Diarization demo with ElevenLabs scribe_v2")
    p.add_argument("--file", "-f", required=True, help="Path to audio file (wav, mp3, m4a, etc.)")
    p.add_argument("--language", "-l", default="ur", help="Language ISO code (e.g. 'ur' for Urdu, 'en' for English)")
    p.add_argument("--output", "-o", default=None, help="Optional output JSON file to save response")
    p.add_argument("--model-id", default=ELEVENLABS_MODEL_ID, choices=["scribe_v2", "scribe_v1"], help="ElevenLabs STT model")
    p.add_argument("--enable-logging", action=argparse.BooleanOptionalAction, default=True, help="Set query enable_logging=true/false")
    p.add_argument("--tag-audio-events", action=argparse.BooleanOptionalAction, default=True, help="Include non-speech tags")
    p.add_argument("--num-speakers", "-n", type=int, default=None, help="Optional speaker cap for diarization (1-32)")
    p.add_argument("--timestamps-granularity", default="word", choices=["none", "word", "character"], help="Timestamp granularity")
    p.add_argument("--diarize", action=argparse.BooleanOptionalAction, default=True, help="Enable speaker diarization")
    p.add_argument("--diarization-threshold", type=float, default=0.22, help="Diarization threshold (0.1-0.4, only when --num-speakers is omitted)")
    p.add_argument("--file-format", default="other", choices=["other", "pcm_s16le_16"], help="Input file format hint")
    p.add_argument("--webhook", action=argparse.BooleanOptionalAction, default=False, help="Process asynchronously via configured webhooks")
    p.add_argument("--webhook-id", default=None, help="Optional specific webhook ID")
    p.add_argument("--temperature", type=float, default=0.0, help="Sampling temperature (0-2)")
    p.add_argument("--seed", type=int, default=42, help="Deterministic seed (0-2147483647)")
    p.add_argument("--use-multi-channel", action=argparse.BooleanOptionalAction, default=False, help="Enable multichannel transcription")
    p.add_argument("--webhook-metadata", default='{"source":"diarize_demo"}', help="JSON object string for webhook metadata")
    p.add_argument("--entity-detection", default="all", help="Entity detection mode, e.g. all|pii|phi")
    p.add_argument("--no-verbatim", action="store_true", help="Remove fillers/non-speech for scribe_v2")
    p.add_argument("--entity-redaction", default="pii", help="Entity redaction mode subset of detection")
    p.add_argument("--entity-redaction-mode", default="enumerated_entity_type", choices=["redacted", "entity_type", "enumerated_entity_type"], help="Redaction rendering mode")
    p.add_argument("--keyterms", default="therapy,session,patient,therapist,mindscribe", help="Comma-separated keyterms")
    p.add_argument("--additional-formats", default="[]", help="JSON list for additional_formats")
    p.add_argument("--dry-run", action="store_true", help="Validate inputs and show request without calling ElevenLabs API")
    return p.parse_args()


def main():
    args = parse_args()
    try:
        webhook_metadata = json.loads(args.webhook_metadata) if args.webhook_metadata else None
        additional_formats = json.loads(args.additional_formats) if args.additional_formats else []
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in --webhook-metadata/--additional-formats: {e}", file=sys.stderr)
        sys.exit(2)

    keyterms = [k.strip() for k in args.keyterms.split(",") if k.strip()] if args.keyterms else []

    transcribe(
        file_path=args.file,
        language=args.language,
        output_path=args.output,
        dry_run=args.dry_run,
        model_id=args.model_id,
        enable_logging=args.enable_logging,
        tag_audio_events=args.tag_audio_events,
        num_speakers=args.num_speakers,
        timestamps_granularity=args.timestamps_granularity,
        diarize=args.diarize,
        diarization_threshold=args.diarization_threshold,
        file_format=args.file_format,
        webhook=args.webhook,
        webhook_id=args.webhook_id,
        temperature=args.temperature,
        seed=args.seed,
        use_multi_channel=args.use_multi_channel,
        webhook_metadata=webhook_metadata,
        entity_detection=args.entity_detection,
        no_verbatim=args.no_verbatim,
        entity_redaction=args.entity_redaction,
        entity_redaction_mode=args.entity_redaction_mode,
        keyterms=keyterms,
        additional_formats=additional_formats,
    )


if __name__ == "__main__":
    main()
