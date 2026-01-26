from django.core.management.base import BaseCommand
from patients.models import RelaxationContent


class Command(BaseCommand):
    help = 'Update relaxation content with local audio URLs'

    def handle(self, *args, **kwargs):
        # Local audio URLs - files should be placed in media/sounds/
        updates = {
            'Gentle Rain': 'http://192.168.1.22:8000/media/sounds/gentle-rain.mp3',
            'Ocean Waves': 'http://192.168.1.22:8000/media/sounds/ocean-waves.mp3',
            'Forest Birds': 'http://192.168.1.22:8000/media/sounds/forest-birds.mp3',
            'Thunderstorm': 'http://192.168.1.22:8000/media/sounds/thunderstorm.mp3',
            'Wind Chimes': 'http://192.168.1.22:8000/media/sounds/wind-chimes.mp3',
            'Cozy Fireplace': 'http://192.168.1.22:8000/media/sounds/cozy-fireplace.mp3',
            'White Noise': 'http://192.168.1.22:8000/media/sounds/white-noise.mp3',
            'Stream Water': 'http://192.168.1.22:8000/media/sounds/stream-water.mp3',
            'Coffee Shop': 'http://192.168.1.22:8000/media/sounds/coffee-shop.mp3',
            'Snow Footsteps': 'http://192.168.1.22:8000/media/sounds/snow-footsteps.mp3',
            '5-Minute Breathing Exercise': 'http://192.168.1.22:8000/media/sounds/breathing-5min.mp3',
            '10-Minute Body Scan': 'http://192.168.1.22:8000/media/sounds/body-scan-10min.mp3',
            'Visualization Journey': 'http://192.168.1.22:8000/media/sounds/visualization.mp3',
        }

        updated_count = 0
        for title, url in updates.items():
            result = RelaxationContent.objects.filter(title=title).update(audio_url=url)
            if result:
                updated_count += result
                self.stdout.write(self.style.SUCCESS(f'✓ Updated: {title}'))
            else:
                self.stdout.write(self.style.WARNING(f'✗ Not found: {title}'))

        self.stdout.write(
            self.style.SUCCESS(f'\n✅ Updated {updated_count} audio URLs to local paths!')
        )
        self.stdout.write(
            self.style.WARNING('\n📁 Place your MP3 files in: Backend/app/media/sounds/')
        )
        self.stdout.write(
            self.style.WARNING('   Example: gentle-rain.mp3, ocean-waves.mp3, etc.\n')
        )
