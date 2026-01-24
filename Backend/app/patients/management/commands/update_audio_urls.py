from django.core.management.base import BaseCommand
from patients.models import RelaxationContent


class Command(BaseCommand):
    help = 'Update relaxation content with real audio URLs'

    def handle(self, *args, **kwargs):
        # Real free audio URLs from freesound.org and archive.org
        updates = {
            'Gentle Rain': 'https://freesound.org/data/previews/231/231273_3779886-lq.mp3',
            'Ocean Waves': 'https://freesound.org/data/previews/329/329556_3997852-lq.mp3',
            'Forest Birds': 'https://freesound.org/data/previews/513/513589_9961300-lq.mp3',
            'Thunderstorm': 'https://freesound.org/data/previews/442/442774_7037314-lq.mp3',
            'Wind Chimes': 'https://freesound.org/data/previews/411/411089_5121236-lq.mp3',
            'Cozy Fireplace': 'https://freesound.org/data/previews/320/320873_527080-lq.mp3',
            'White Noise': 'https://freesound.org/data/previews/191/191917_2437358-lq.mp3',
            'Stream Water': 'https://freesound.org/data/previews/396/396796_7255534-lq.mp3',
            'Coffee Shop': 'https://freesound.org/data/previews/382/382690_4939433-lq.mp3',
            'Snow Footsteps': 'https://freesound.org/data/previews/336/336887_5121236-lq.mp3',
            '5-Minute Breathing Exercise': 'https://freesound.org/data/previews/413/413721_7516888-lq.mp3',
            '10-Minute Body Scan': 'https://freesound.org/data/previews/521/521771_11116859-lq.mp3',
            'Visualization Journey': 'https://freesound.org/data/previews/456/456966_8462944-lq.mp3',
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
            self.style.SUCCESS(f'\n✅ Updated {updated_count} audio URLs with real links!')
        )
        self.stdout.write(
            self.style.WARNING('\n⚠️  Note: These are royalty-free Freesound.org audio samples.')
        )
        self.stdout.write(
            self.style.WARNING('   For production, use professionally recorded relaxation audio.\n')
        )
