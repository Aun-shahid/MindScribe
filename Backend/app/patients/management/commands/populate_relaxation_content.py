"""
Management command to populate relaxation content for Take a Break feature
"""
from django.core.management.base import BaseCommand
from patients.models import RelaxationContent


class Command(BaseCommand):
    help = 'Populate relaxation content for the Take a Break feature'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Populating relaxation content...'))
        
        # Define all relaxation sounds from the mockup
        relaxation_sounds = [
            {
                'title': 'Gentle Rain',
                'description': 'Soothing rainfall sounds',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/gentle-rain.mp3',
                'duration_seconds': 600,  # 10 minutes
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Cozy Fireplace',
                'description': 'Crackling fire warmth',
                'content_type': 'audio',
                'category': 'ambient',
                'audio_url': 'https://example.com/sounds/cozy-fireplace.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Ocean Waves',
                'description': 'Peaceful ocean sounds',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/ocean-waves.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Snow Footsteps',
                'description': 'Quiet winter walk',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/snow-footsteps.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Forest Birds',
                'description': 'Nature symphony',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/forest-birds.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            # Additional relaxation sounds
            {
                'title': 'Thunderstorm',
                'description': 'Distant thunder with rain',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/thunderstorm.mp3',
                'duration_seconds': 900,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Wind Chimes',
                'description': 'Gentle wind chimes melody',
                'content_type': 'audio',
                'category': 'ambient',
                'audio_url': 'https://example.com/sounds/wind-chimes.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'White Noise',
                'description': 'Pure white noise for focus',
                'content_type': 'audio',
                'category': 'ambient',
                'audio_url': 'https://example.com/sounds/white-noise.mp3',
                'duration_seconds': 1800,  # 30 minutes
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Stream Water',
                'description': 'Gentle flowing stream',
                'content_type': 'audio',
                'category': 'nature',
                'audio_url': 'https://example.com/sounds/stream-water.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
            },
            {
                'title': 'Coffee Shop',
                'description': 'Cozy cafe ambiance',
                'content_type': 'audio',
                'category': 'ambient',
                'audio_url': 'https://example.com/sounds/coffee-shop.mp3',
                'duration_seconds': 1200,  # 20 minutes
                'is_active': True,
                'is_premium': True,
            },
        ]
        
        # Add guided meditations
        guided_meditations = [
            {
                'title': '5-Minute Breathing Exercise',
                'description': 'Quick breathing technique for calm',
                'content_type': 'guided_meditation',
                'category': 'breathing',
                'audio_url': 'https://example.com/guided/breathing-5min.mp3',
                'duration_seconds': 300,
                'is_active': True,
                'is_premium': False,
                'instructions': 'Breathe in for 4 counts, hold for 4, exhale for 4. Repeat with the sounds.',
            },
            {
                'title': '10-Minute Body Scan',
                'description': 'Progressive relaxation meditation',
                'content_type': 'guided_meditation',
                'category': 'meditation',
                'audio_url': 'https://example.com/guided/body-scan-10min.mp3',
                'duration_seconds': 600,
                'is_active': True,
                'is_premium': False,
                'instructions': 'Find a comfortable position and follow the gentle guidance.',
            },
            {
                'title': 'Visualization Journey',
                'description': 'Guided peaceful place visualization',
                'content_type': 'guided_meditation',
                'category': 'visualization',
                'audio_url': 'https://example.com/guided/visualization.mp3',
                'duration_seconds': 900,
                'is_active': True,
                'is_premium': True,
                'instructions': 'Close your eyes and imagine yourself in the environment of the sound.',
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        # Create or update sounds
        all_content = relaxation_sounds + guided_meditations
        
        for content_data in all_content:
            content, created = RelaxationContent.objects.update_or_create(
                title=content_data['title'],
                defaults=content_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {content.title}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated: {content.title}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Done! Created {created_count} new items, updated {updated_count} existing items.'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Total relaxation content: {RelaxationContent.objects.count()}'
            )
        )
