"""
Management command to populate relaxation tips for Take a Break feature
"""
from django.core.management.base import BaseCommand
from patients.models import RelaxationTip


class Command(BaseCommand):
    help = 'Populate relaxation tips for the Take a Break feature'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Populating relaxation tips...'))
        
        # Define all relaxation tips from the mockup
        tips = [
            {
                'title': 'Breathing Technique',
                'tip_type': 'breathing',
                'description': 'Breathe in for 4 counts, hold for 4, exhale for 4. Repeat with the sounds.',
                'icon': '🧘',
                'order': 1,
                'is_active': True,
            },
            {
                'title': 'Visualization',
                'tip_type': 'visualization',
                'description': 'Close your eyes and imagine yourself in the environment of the sound.',
                'icon': '👁️',
                'order': 2,
                'is_active': True,
            },
            {
                'title': 'Comfortable Position',
                'tip_type': 'position',
                'description': 'Sit or lie down comfortably. Let your body relax completely.',
                'icon': '🪑',
                'order': 3,
                'is_active': True,
            },
            {
                'title': 'Minimize Distractions',
                'tip_type': 'distraction',
                'description': 'Put your phone on silent and focus solely on the present moment.',
                'icon': '🔇',
                'order': 4,
                'is_active': True,
            },
            {
                'title': 'Set Your Intention',
                'tip_type': 'general',
                'description': 'Before starting, set a simple intention like "I am here to relax" or "I am letting go of stress."',
                'icon': '🎯',
                'order': 5,
                'is_active': True,
            },
            {
                'title': 'Body Scan',
                'tip_type': 'general',
                'description': 'Notice any tension in your body. With each breath, imagine that tension melting away.',
                'icon': '✨',
                'order': 6,
                'is_active': True,
            },
            {
                'title': 'Stay Present',
                'tip_type': 'general',
                'description': 'If your mind wanders, gently bring your attention back to the sounds without judgment.',
                'icon': '🌟',
                'order': 7,
                'is_active': True,
            },
            {
                'title': 'Use Headphones',
                'tip_type': 'general',
                'description': 'For the best experience, use quality headphones to fully immerse yourself in the sounds.',
                'icon': '🎧',
                'order': 8,
                'is_active': True,
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for tip_data in tips:
            tip, created = RelaxationTip.objects.update_or_create(
                title=tip_data['title'],
                defaults=tip_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {tip.title}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated: {tip.title}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Done! Created {created_count} new tips, updated {updated_count} existing tips.'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Total relaxation tips: {RelaxationTip.objects.count()}'
            )
        )
