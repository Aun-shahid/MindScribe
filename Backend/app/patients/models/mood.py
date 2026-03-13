from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class MoodEntry(models.Model):
    """Model for tracking patient's daily mood"""
    MOOD_CHOICES = [
        ('happy', 'Happy 😊'),
        ('sad', 'Sad 😟'),
        ('angry', 'Angry 😠'),
        ('anxious', 'Anxious 😰'),
        ('peaceful', 'Peaceful 😌'),
        ('excited', 'Excited 🤩'),
        ('grateful', 'Grateful 🙏'),
        ('overwhelmed', 'Overwhelmed 😱'),
        ('hopeful', 'Hopeful ☀️'),
        ('stressed', 'Stressed 😰'),
    ]
    
    INTENSITY_CHOICES = [
        (1, 'Very Low'),
        (2, 'Low'),
        (3, 'Moderate'),
        (4, 'High'),
        (5, 'Very High'),
    ]
    
    TRIGGER_CHOICES = [
        ('work', 'Work'),
        ('personal', 'Personal'),
        ('relationships', 'Relationships'),
        ('health', 'Health'),
        ('academic', 'Academic'),
        ('financial', 'Financial'),
        ('family', 'Family'),
        ('social', 'Social'),
        ('weather', 'Weather'),
        ('sleep', 'Sleep'),
        ('exercise', 'Exercise'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                               related_name='patient_mood_entries',
                               limit_choices_to={'user_type': 'patient'})
    
    # Mood with individual intensity levels - JSON format: {"happy": 4, "anxious": 2, "peaceful": 5}
    mood_intensities = models.JSONField(
        default=dict,
        help_text="Dictionary of moods with their intensity levels (1-5). Example: {'happy': 4, 'grateful': 5}"
    )
    
    notes = models.TextField(blank=True, null=True, help_text="Optional notes about the mood")
    
    # Contextual information - comma-separated trigger categories
    triggers = models.CharField(max_length=200, blank=True, null=True,
                               help_text="Comma-separated trigger categories (e.g., 'work,sleep,health')")
    
    activities = models.TextField(blank=True, null=True,
                                 help_text="Activities during this mood")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mood_date = models.DateField(default=timezone.now, 
                                help_text="Date of the mood entry")
    
    class Meta:
        db_table = 'patient_mood_entries'
        ordering = ['-mood_date', '-created_at']
        # Multiple entries allowed per day - most frequent mood is considered dominant
        indexes = [
            models.Index(fields=['patient', '-mood_date']),
            models.Index(fields=['mood_date']),
        ]
        verbose_name = 'Mood Entry'
        verbose_name_plural = 'Mood Entries'
    
    def __str__(self):
        return f"{self.patient.full_name} - Entry on {self.mood_date}"
    
    @property
    def moods_list(self):
        """Return list of moods (for backward compatibility and easy access)"""
        return list(self.mood_intensities.keys()) if self.mood_intensities else []
    
    @property
    def dominant_mood(self):
        """Get a single dominant mood (stable when there is a tie)."""
        dominant = self.dominant_moods
        return dominant[0] if dominant else None

    @property
    def dominant_moods(self):
        """Get all top-tied moods by intensity (sorted for deterministic output)."""
        if not self.mood_intensities:
            return []

        max_intensity = max(self.mood_intensities.values())
        return sorted([
            mood for mood, intensity in self.mood_intensities.items()
            if intensity == max_intensity
        ])
    
    @property
    def average_intensity(self):
        """Calculate average intensity across all moods"""
        if not self.mood_intensities:
            return 0
        intensities = list(self.mood_intensities.values())
        return round(sum(intensities) / len(intensities), 1)
    
    @property
    def triggers_list(self):
        """Return triggers as a list"""
        if self.triggers:
            return [trigger.strip() for trigger in self.triggers.split(',')]
        return []
    
    def get_mood_display(self, mood_key):
        """Get display label for a specific mood"""
        mood_choice = next((choice for choice in self.MOOD_CHOICES if choice[0] == mood_key), None)
        return mood_choice[1] if mood_choice else mood_key.title()
    
    @classmethod
    def get_dominant_mood_for_day(cls, patient, date):
        """Get the most frequent and intense mood for a specific day across all entries"""
        entries = cls.objects.filter(patient=patient, mood_date=date)
        
        if not entries.exists():
            return None
        
        # Aggregate mood intensities across all entries
        mood_intensity_sum = {}  # {mood: total_intensity}
        mood_frequency = {}      # {mood: count}
        all_triggers = set()
        entry_count = len(entries)
        
        for entry in entries:
            for mood, intensity in entry.mood_intensities.items():
                mood_intensity_sum[mood] = mood_intensity_sum.get(mood, 0) + intensity
                mood_frequency[mood] = mood_frequency.get(mood, 0) + 1
            all_triggers.update(entry.triggers_list)
        
        # Calculate weighted score: (total_intensity × frequency)
        mood_scores = {}
        for mood in mood_intensity_sum:
            mood_scores[mood] = mood_intensity_sum[mood] * mood_frequency[mood]
        
        # Get dominant mood(s) by highest weighted score, deterministic on ties
        if mood_scores:
            max_score = max(mood_scores.values())
            dominant_moods = sorted([
                mood for mood, score in mood_scores.items()
                if score == max_score
            ])
            dominant_mood = dominant_moods[0]
        else:
            dominant_moods = ['neutral']
            dominant_mood = 'neutral'
        
        # Calculate average intensity for the dominant mood
        dominant_avg_intensity = round(mood_intensity_sum[dominant_mood] / mood_frequency[dominant_mood])
        
        # Overall average intensity across all moods
        total_intensity_sum = sum(mood_intensity_sum.values())
        total_mood_count = sum(mood_frequency.values())
        overall_avg_intensity = round(total_intensity_sum / total_mood_count) if total_mood_count > 0 else 0
        
        return {
            'dominant_mood': dominant_mood,
            'dominant_moods': dominant_moods,
            'dominant_intensity': dominant_avg_intensity,
            'all_moods': list(mood_scores.keys()),
            'mood_frequency': mood_frequency,
            'avg_intensity': overall_avg_intensity,
            'entry_count': entry_count,
            'triggers': list(all_triggers),
            'mood_breakdown': {mood: {
                'avg_intensity': round(mood_intensity_sum[mood] / mood_frequency[mood], 1),
                'frequency': mood_frequency[mood]
            } for mood in mood_scores}
        }
    
    def get_primary_mood_display(self):
        """Get display name for the first/primary mood"""
        moods = self.moods_list
        if moods:
            for value, label in self.MOOD_CHOICES:
                if value == moods[0]:
                    return label
        return None
