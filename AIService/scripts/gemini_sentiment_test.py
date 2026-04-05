#!/usr/bin/env python3
"""
Quick Gemini sentiment/classification smoke test.

Purpose:
- Verify GEMINI_API_KEY works.
- Parse text from out.json and send it to Gemini for text-based sentiment classification.

No external Python dependencies required.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


FALLBACK_SAMPLE_LINES = [
    "Therapist: What triggers your stress most at work?",
    "Patient: I feel irritated when my effort is ignored.",
    "Therapist: How do you usually respond in those moments?",
    "Patient: Sometimes sarcasm, sometimes anger, sometimes I withdraw.",
    "Therapist: Good awareness. We can build a self-regulation strategy from this.",
]


def load_local_env_if_present(env_path: Path) -> None:
    """Load KEY=VALUE pairs from a local .env file if env vars are not already set."""
    if not env_path.exists() or not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _extract_text_from_segments(segments: List[Dict[str, Any]], max_segments: int = 14) -> str:
    """Join a few segment texts to build a compact sample payload."""
    parts: List[str] = []
    for seg in segments[:max_segments]:
        speaker = str(seg.get("speaker", "UNKNOWN") or "UNKNOWN")
        text = str(seg.get("text", "") or "").strip()
        if text:
            parts.append(f"Speaker {speaker}: {text}")
    return "\n".join(parts)


def extract_text_for_gemini(out_json_path: Path, max_chars: int = 3000) -> str:
    """
    Parse out.json and extract test text.

    Priority:
    1. Use `text` field if available.
    2. Else compose from first N segment lines.
    3. Else use fallback sample lines inspired by session transcript style.
    """
    if out_json_path.exists() and out_json_path.is_file():
        payload = json.loads(out_json_path.read_text(encoding="utf-8"))

        whole_text = str(payload.get("text", "") or "").strip()
        if whole_text:
            return whole_text[:max_chars]

        segments = payload.get("segments") or []
        if isinstance(segments, list) and segments:
            merged = _extract_text_from_segments(segments)
            if merged:
                return merged[:max_chars]

    return "\n".join(FALLBACK_SAMPLE_LINES)


def build_prompt(input_text: str) -> str:
    return (
        "You are a sentiment classifier for a therapy conversation transcript.\n"
        "Return ONLY strict JSON with this schema:\n"
        "{\n"
        '  "overall_sentiment": "positive|neutral|negative|mixed",\n'
        '  "confidence": 0.0,\n'
        '  "dominant_emotions": ["anger", "frustration", "sadness", "joy", "neutral"],\n'
        '  "risk_flags": ["none"],\n'
        '  "short_reason": "one short sentence"\n'
        "}\n\n"
        "Transcript sample:\n"
        f"{input_text}"
    )


def call_gemini(api_key: str, model: str, prompt: str) -> Dict[str, Any]:
    url = f"{DEFAULT_API_BASE}/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json",
        },
    }

    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def extract_gemini_text(response_payload: Dict[str, Any]) -> str:
    candidates = response_payload.get("candidates") or []
    if not candidates:
        return ""
    first = candidates[0] if isinstance(candidates[0], dict) else {}
    content = first.get("content") or {}
    parts = content.get("parts") or []
    if not parts:
        return ""
    text = parts[0].get("text", "") if isinstance(parts[0], dict) else ""
    return str(text or "").strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gemini sentiment smoke test using out.json")
    parser.add_argument(
        "--input",
        "-i",
        default=str(Path(__file__).parent / "out.json"),
        help="Path to out.json (default: scripts/out.json)",
    )
    parser.add_argument(
        "--model",
        "-m",
        default=DEFAULT_MODEL,
        help="Gemini model name (default from GEMINI_MODEL or gemini-1.5-flash)",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=3000,
        help="Maximum number of input characters sent to Gemini",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print extracted sample text and exit without network call",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Load local .env (AIService/.env) for convenience if running manually.
    local_env_path = Path(__file__).resolve().parents[1] / ".env"
    load_local_env_if_present(local_env_path)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GEMINI_API_KEY is not set.", file=sys.stderr)
        return 1

    input_path = Path(args.input)
    text_sample = extract_text_for_gemini(input_path, max_chars=args.max_chars)

    print(f"Using model: {args.model}")
    print(f"Input source: {input_path}")
    print(f"Extracted chars: {len(text_sample)}")

    if args.dry_run:
        print("\n--- Extracted Text Preview ---\n")
        print(text_sample)
        return 0

    prompt = build_prompt(text_sample)

    try:
        response_payload = call_gemini(api_key=api_key, model=args.model, prompt=prompt)
        model_text = extract_gemini_text(response_payload)

        print("\n--- Gemini Raw JSON Text ---\n")
        print(model_text or "<empty>")

        # Best-effort parse for cleaner output
        if model_text:
            try:
                parsed = json.loads(model_text)
                print("\n--- Parsed Classification ---\n")
                print(json.dumps(parsed, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print("\nNOTE: Model output was not valid JSON.")

        return 0

    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        print(f"HTTPError {e.code}: {detail}", file=sys.stderr)
        return 2
    except URLError as e:
        print(f"Network error: {e}", file=sys.stderr)
        return 3
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
