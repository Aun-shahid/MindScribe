import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from patients.services.notification_service import (
    send_goal_reminder_notifications,
    send_journal_reminder_notifications,
    send_mood_reminder_notifications,
)
from patients.services.time_based_notifications import (
    send_time_based_session_reminders,
    send_time_based_therapist_reminders,
)


class Command(BaseCommand):
    help = "Run notification reminder scheduler loop (session/goal/mood/journal)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run exactly one scheduler tick and exit.',
        )
        parser.add_argument(
            '--interval-seconds',
            type=int,
            default=60,
            help='Seconds between scheduler ticks in loop mode (default: 60).',
        )
    def _run_tick(self):
        session_count = send_time_based_session_reminders()
        therapist_session_count = send_time_based_therapist_reminders()
        goal_count = send_goal_reminder_notifications()
        mood_count = send_mood_reminder_notifications()
        journal_count = send_journal_reminder_notifications()

        timestamp = timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(
            self.style.SUCCESS(
                f"[{timestamp}] Tick complete | session={session_count} "
                f"therapist_session={therapist_session_count} goal={goal_count} mood={mood_count} "
                f"journal={journal_count}"
            )
        )

    def handle(self, *args, **options):
        once = options['once']
        interval_seconds = max(10, int(options['interval_seconds']))

        if once:
            self._run_tick()
            return

        self.stdout.write(
            self.style.WARNING(
                f"Starting notification scheduler loop (interval={interval_seconds}s)"
            )
        )
        self.stdout.write(self.style.WARNING("Press Ctrl+C to stop."))

        try:
            while True:
                self._run_tick()
                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Notification scheduler stopped."))
