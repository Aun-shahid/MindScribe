from django.core.management.base import BaseCommand
from patients.models import JournalPrompt


class Command(BaseCommand):
    help = 'Populate journal prompts for the Journal feature'

    def handle(self, *args, **kwargs):
        prompts = [
            # Feelings
            {
                'prompt': 'How are you feeling today?',
                'category': 'feelings',
                'description': 'Express your current emotional state',
            },
            {
                'prompt': 'What emotions have you experienced today?',
                'category': 'feelings',
                'description': 'Reflect on the range of feelings throughout your day',
            },
            {
                'prompt': 'What made you smile today?',
                'category': 'feelings',
                'description': 'Capture moments of joy',
            },
            # Gratitude
            {
                'prompt': 'What are three things you are grateful for today?',
                'category': 'gratitude',
                'description': 'Practice gratitude',
            },
            {
                'prompt': 'Who or what brought you comfort today?',
                'category': 'gratitude',
                'description': 'Acknowledge sources of support',
            },
            # Reflection
            {
                'prompt': 'What was the most challenging part of your day?',
                'category': 'reflection',
                'description': 'Identify and process challenges',
            },
            {
                'prompt': 'What did you learn about yourself today?',
                'category': 'reflection',
                'description': 'Explore personal insights',
            },
            {
                'prompt': 'Describe a moment when you felt proud of yourself today.',
                'category': 'reflection',
                'description': 'Celebrate your achievements',
            },
            # Goals
            {
                'prompt': 'What is one small step you can take toward your goals tomorrow?',
                'category': 'goals',
                'description': 'Plan for progress',
            },
            {
                'prompt': 'What progress did you make today toward your personal goals?',
                'category': 'goals',
                'description': 'Track your journey',
            },
            # Mindfulness
            {
                'prompt': 'What sensations do you notice in your body right now?',
                'category': 'mindfulness',
                'description': 'Practice body awareness',
            },
            {
                'prompt': 'Take a moment to breathe. What do you notice?',
                'category': 'mindfulness',
                'description': 'Ground yourself in the present',
            },
            # Relationships
            {
                'prompt': 'How did your interactions with others make you feel today?',
                'category': 'relationships',
                'description': 'Reflect on connections',
            },
            {
                'prompt': 'What kind words would you like to hear right now?',
                'category': 'relationships',
                'description': 'Identify your needs',
            },
            # Growth
            {
                'prompt': 'What challenge helped you grow today?',
                'category': 'growth',
                'description': 'Find growth in difficulty',
            },
            {
                'prompt': 'How have you shown resilience recently?',
                'category': 'growth',
                'description': 'Recognize your strength',
            },
            # Challenges
            {
                'prompt': 'What is weighing on your mind today?',
                'category': 'challenges',
                'description': 'Express your concerns',
            },
            {
                'prompt': 'What support do you need right now?',
                'category': 'challenges',
                'description': 'Identify ways to help yourself',
            },
            # Creativity
            {
                'prompt': 'If your day had a soundtrack, what would it be?',
                'category': 'creativity',
                'description': 'Express yourself creatively',
            },
            {
                'prompt': 'Describe your ideal peaceful moment.',
                'category': 'creativity',
                'description': 'Visualize calm',
            },
            # Self Care
            {
                'prompt': 'What acts of self-care did you practice today?',
                'category': 'self_care',
                'description': 'Acknowledge self-nurturing',
            },
            {
                'prompt': 'What does your mind and body need right now?',
                'category': 'self_care',
                'description': 'Listen to your needs',
            },
        ]

        created_count = 0
        updated_count = 0

        for prompt_data in prompts:
            prompt_obj, created = JournalPrompt.objects.update_or_create(
                prompt=prompt_data['prompt'],
                defaults={
                    'category': prompt_data['category'],
                    'description': prompt_data.get('description', ''),
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {prompt_data["prompt"][:50]}...'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'• Updated: {prompt_data["prompt"][:50]}...'))

        total = JournalPrompt.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✅ Populated {created_count} new prompts, updated {updated_count} existing.')
        )
        self.stdout.write(
            self.style.SUCCESS(f'📝 Total journal prompts in database: {total}\n')
        )
