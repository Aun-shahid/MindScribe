import atexit
import logging
import os
import sys
import threading

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django.conf import settings

from .notification_service import (
    send_goal_reminder_notifications,
    send_journal_reminder_notifications,
    send_mood_reminder_notifications,
    send_session_reminder_notifications,
    send_therapist_upcoming_session_notifications,
)

logger = logging.getLogger(__name__)

_scheduler = None
_scheduler_lock = threading.Lock()


def _scheduler_interval_seconds() -> int:
    raw_value = os.environ.get("IN_APP_REMINDER_SCHEDULER_INTERVAL_SECONDS", "30")
    try:
        interval = int(raw_value)
    except (TypeError, ValueError):
        interval = 30
    return min(60, max(10, interval))


def _should_start_scheduler() -> bool:
    if os.environ.get("DISABLE_IN_APP_REMINDER_SCHEDULER", "false").lower() == "true":
        return False

    process_type = os.environ.get("PROCESS_TYPE", "web").strip().lower()
    if process_type in {"worker", "beat"}:
        return False

    management_commands_to_skip = {
        "collectstatic",
        "createsuperuser",
        "makemigrations",
        "migrate",
        "shell",
        "test",
    }
    if any(command in sys.argv for command in management_commands_to_skip):
        return False

    if "runserver" in sys.argv and os.environ.get("RUN_MAIN") != "true":
        return False

    return True


def run_reminder_scheduler_tick():
    session_count = 0
    therapist_session_count = 0
    goal_count = 0
    mood_count = 0
    journal_count = 0

    try:
        session_count = send_session_reminder_notifications()
    except Exception:
        logger.exception("Session reminder tick failed")

    try:
        therapist_session_count = send_therapist_upcoming_session_notifications()
    except Exception:
        logger.exception("Therapist session reminder tick failed")

    try:
        goal_count = send_goal_reminder_notifications()
    except Exception:
        logger.exception("Goal reminder tick failed")

    try:
        mood_count = send_mood_reminder_notifications()
    except Exception:
        logger.exception("Mood reminder tick failed")

    try:
        journal_count = send_journal_reminder_notifications()
    except Exception:
        logger.exception("Journal reminder tick failed")

    logger.debug(
        "Reminder tick complete (session=%s therapist_session=%s goal=%s mood=%s journal=%s)",
        session_count,
        therapist_session_count,
        goal_count,
        mood_count,
        journal_count,
    )


def stop_reminder_scheduler():
    global _scheduler

    with _scheduler_lock:
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
            logger.info("In-app reminder scheduler stopped")
        _scheduler = None


def start_reminder_scheduler():
    global _scheduler

    if not _should_start_scheduler():
        return

    with _scheduler_lock:
        if _scheduler and _scheduler.running:
            return

        interval_seconds = _scheduler_interval_seconds()
        scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
        scheduler.add_job(
            run_reminder_scheduler_tick,
            trigger=IntervalTrigger(seconds=interval_seconds),
            id="in_app_reminder_tick",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()

        _scheduler = scheduler
        logger.info(
            "In-app reminder scheduler started (interval=%ss)",
            interval_seconds,
        )

        atexit.register(stop_reminder_scheduler)
