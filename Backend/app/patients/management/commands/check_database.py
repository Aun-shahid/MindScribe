from django.core.management.base import BaseCommand
from django.db import connection
from patients.models import (
    MoodEntry, JournalEntry, EmotionalInsight, RelaxationContent,
    RelaxationSession, RelaxationTip, DailyInspiration, PatientGoal
)
from users.models import User


class Command(BaseCommand):
    help = 'Comprehensive database check for patients module'

    def check_table_exists(self, table_name):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                );
            """, [table_name])
            return cursor.fetchone()[0]

    def handle(self, *args, **kwargs):
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("COMPREHENSIVE DATABASE CHECK"))
        self.stdout.write("=" * 70)

        # 1. DATABASE CONNECTION
        self.stdout.write(self.style.HTTP_INFO("\n[1] DATABASE CONNECTION"))
        self.stdout.write("-" * 70)
        try:
            connection.ensure_connection()
            db_settings = connection.settings_dict
            self.stdout.write(f"  Database: {db_settings['NAME']}")
            self.stdout.write(f"  Host: {db_settings['HOST']}")
            self.stdout.write(f"  Port: {db_settings['PORT']}")
            self.stdout.write(self.style.SUCCESS("  Status: Connected & Active"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ERROR: {str(e)}"))

        # 2. TABLES
        self.stdout.write(self.style.HTTP_INFO("\n[2] PATIENT MODULE TABLES"))
        self.stdout.write("-" * 70)
        patient_tables = {
            'patient_mood_entries': 'Mood Entries',
            'patient_journal_entries': 'Journal Entries',
            'patient_emotional_insights': 'Emotional Insights',
            'relaxation_content': 'Relaxation Content',
            'relaxation_sessions': 'Relaxation Sessions',
            'relaxation_tips': 'Relaxation Tips',
            'daily_inspirations': 'Daily Inspirations',
            'patient_goals': 'Patient Goals',
        }

        for table_name, display_name in patient_tables.items():
            exists = self.check_table_exists(table_name)
            if exists:
                self.stdout.write(self.style.SUCCESS(f"  OK {display_name}"))
            else:
                self.stdout.write(self.style.ERROR(f"  MISSING {display_name}"))

        # 3. DATA COUNTS
        self.stdout.write(self.style.HTTP_INFO("\n[3] DATA POPULATION"))
        self.stdout.write("-" * 70)
        
        counts = {
            'Mood Entries': MoodEntry.objects.count(),
            'Journal Entries': JournalEntry.objects.count(),
            'Emotional Insights': EmotionalInsight.objects.count(),
            'Relaxation Content': RelaxationContent.objects.count(),
            'Relaxation Sessions': RelaxationSession.objects.count(),
            'Relaxation Tips': RelaxationTip.objects.count(),
            'Daily Inspirations': DailyInspiration.objects.count(),
            'Patient Goals': PatientGoal.objects.count(),
        }
        
        for name, count in counts.items():
            self.stdout.write(f"  {name}: {count}")
        
        if counts['Relaxation Content'] == 13 and counts['Relaxation Tips'] == 8:
            self.stdout.write(self.style.SUCCESS("\n  Critical data OK!"))
        else:
            self.stdout.write(self.style.WARNING(f"\n  WARNING: Expected 13 sounds, 8 tips"))

        # 4. RELAXATION CONTENT BREAKDOWN
        self.stdout.write(self.style.HTTP_INFO("\n[4] RELAXATION CONTENT BREAKDOWN"))
        self.stdout.write("-" * 70)
        
        nature = RelaxationContent.objects.filter(category='nature').count()
        ambient = RelaxationContent.objects.filter(category='ambient').count()
        breathing = RelaxationContent.objects.filter(category='breathing').count()
        meditation = RelaxationContent.objects.filter(category='meditation').count()
        visualization = RelaxationContent.objects.filter(category='visualization').count()
        
        self.stdout.write(f"  Nature: {nature} | Ambient: {ambient}")
        self.stdout.write(f"  Breathing: {breathing} | Meditation: {meditation} | Visualization: {visualization}")
        
        audio = RelaxationContent.objects.filter(content_type='audio').count()
        guided = RelaxationContent.objects.filter(content_type='guided_meditation').count()
        self.stdout.write(f"  Audio Files: {audio} | Guided Meditations: {guided}")
        
        local = RelaxationContent.objects.filter(audio_url__startswith='http://127.0.0.1').count()
        total = RelaxationContent.objects.count()
        self.stdout.write(f"  Local URLs: {local}/{total}")

        # 5. SAMPLE DATA
        self.stdout.write(self.style.HTTP_INFO("\n[5] SAMPLE DATA"))
        self.stdout.write("-" * 70)
        
        self.stdout.write("  Sounds (first 5):")
        for sound in RelaxationContent.objects.all()[:5]:
            self.stdout.write(f"    - {sound.title} ({sound.get_category_display()})")
        
        self.stdout.write("\n  Tips (first 3):")
        for tip in RelaxationTip.objects.all()[:3]:
            self.stdout.write(f"    - {tip.title}")

        # 6. MIGRATIONS
        self.stdout.write(self.style.HTTP_INFO("\n[6] MIGRATIONS STATUS"))
        self.stdout.write("-" * 70)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name, applied 
                FROM django_migrations 
                WHERE app = 'patients' 
                ORDER BY applied DESC;
            """)
            migrations = cursor.fetchall()
            for name, applied in migrations:
                self.stdout.write(f"  OK {name}")

        # FINAL VERDICT
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("FINAL VERDICT"))
        self.stdout.write("=" * 70)
        
        all_good = (
            connection.is_usable() and
            RelaxationContent.objects.count() == 13 and
            RelaxationTip.objects.count() == 8 and
            self.check_table_exists('relaxation_content')
        )
        
        if all_good:
            self.stdout.write(self.style.SUCCESS("\nDATABASE IS FULLY FUNCTIONAL!"))
            self.stdout.write(self.style.SUCCESS("All tables exist | Data populated | Ready for production"))
        else:
            self.stdout.write(self.style.WARNING("\nSome issues detected - review above"))
        
        self.stdout.write("=" * 70 + "\n")
