from django.core.management.base import BaseCommand
from django.conf import settings
from patients.models import RelaxationContent
import os
import logging

try:
    from mutagen import File as MutagenFile
except Exception:
    MutagenFile = None


class Command(BaseCommand):
    help = 'Compute and update duration_seconds for RelaxationContent items using local media files'

    def handle(self, *args, **options):
        if MutagenFile is None:
            self.stderr.write('mutagen is not installed. Please pip install mutagen')
            return

        qs = RelaxationContent.objects.all()
        updated = 0
        skipped = 0
        for item in qs:
            url = item.audio_url or ''
            if '/media/' in url:
                path = url.split('/media/', 1)[1]
                local_path = os.path.join(settings.BASE_DIR, 'media', path)
                if not os.path.exists(local_path):
                    # Try MEDIA_ROOT
                    local_path = os.path.join(settings.MEDIA_ROOT, path)

                if not os.path.exists(local_path):
                    self.stdout.write(f"Skipping {item.title}: local file not found for {url}")
                    skipped += 1
                    continue

                try:
                    audio = MutagenFile(local_path)
                    if audio is None or not hasattr(audio, 'info') or not getattr(audio.info, 'length', None):
                        self.stdout.write(f"Could not read duration for {local_path}")
                        skipped += 1
                        continue

                    length_seconds = int(round(audio.info.length))
                    if item.duration_seconds != length_seconds:
                        item.duration_seconds = length_seconds
                        item.save(update_fields=['duration_seconds'])
                        updated += 1
                        self.stdout.write(f"Updated {item.title}: {length_seconds}s")
                except Exception as e:
                    logging.exception('Error reading file %s', local_path)
                    skipped += 1
            else:
                self.stdout.write(f"Skipping {item.title}: audio_url not local media ({url})")
                skipped += 1

        self.stdout.write(f"Done. Updated: {updated}, Skipped: {skipped}")
