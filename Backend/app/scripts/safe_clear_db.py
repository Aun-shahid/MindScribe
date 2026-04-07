"""
Safely clear all Django-managed data from the configured database.

This script uses Django's built-in `flush` command, which handles foreign-key
constraints in the correct order and keeps schema/migrations intact.

Usage:
    python scripts/safe_clear_db.py --yes
    python scripts/safe_clear_db.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _bootstrap_django() -> None:
    project_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(project_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

    import django

    django.setup()


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Safely clear DB data using Django flush (schema is preserved)."
    )
    parser.add_argument(
        "--database",
        default="default",
        help="Django database alias to flush (default: default).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would run without modifying data.",
    )
    parser.add_argument(
        "--verbosity",
        type=int,
        default=1,
        choices=[0, 1, 2, 3],
        help="Django command verbosity (0-3).",
    )
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    _bootstrap_django()

    from django.core.management import call_command
    from django.db import connections

    if args.dry_run:
        print(
            "[DRY RUN] Would execute: flush --no-input "
            f"--database {args.database}"
        )
        return 0

    if not args.yes:
        answer = input(
            f"This will permanently delete all data in '{args.database}'. Continue? [y/N]: "
        ).strip().lower()
        if answer not in {"y", "yes"}:
            print("Cancelled. No changes made.")
            return 0

    try:
        connections[args.database].ensure_connection()
    except Exception as exc:
        print(f"Database connection failed for '{args.database}': {exc}")
        return 1

    try:
        call_command(
            "flush",
            interactive=False,
            database=args.database,
            verbosity=args.verbosity,
        )
    except Exception as exc:
        print(f"Database clear failed: {exc}")
        return 1

    print("Database cleared successfully. Schema and migrations are preserved.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
