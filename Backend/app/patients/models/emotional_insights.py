from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class EmotionalInsight(models.Model):
    """Model for tracking emotional exploration and insights"""
    EMOTION_CHOICES = [
        ('joy', 'Joy'),
        ('sadness', 'Sadness'),
        ('anger', 'Anger'),
        ('fear', 'Fear'),
        ('anxiety', 'Anxiety'),
        ('love', 'Love'),
        ('guilt', 'Guilt'),
        ('shame', 'Shame'),
        ('pride', 'Pride'),
        ('hope', 'Hope'),
        ('gratitude', 'Gratitude'),
        ('confusion', 'Confusion'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='emotional_insights',
                               limit_choices_to={'user_type': 'patient'})
    
    # Primary emotion being explored
    primary_emotion = models.CharField(max_length=20, choices=EMOTION_CHOICES)
    intensity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    
    # Exploration details
    what_happened = models.TextField(help_text="What situation triggered this emotion?")
    body_sensations = models.TextField(blank=True, null=True,
                                      help_text="Physical sensations experienced")
    thoughts = models.TextField(blank=True, null=True,
                               help_text="Thoughts during this emotion")
    behaviors = models.TextField(blank=True, null=True,
                                help_text="How did you respond/behave?")
    
    # Reflection
    insights_learned = models.TextField(blank=True, null=True,
                                       help_text="What did you learn from this?")
    coping_strategies = models.TextField(blank=True, null=True,
                                        help_text="Strategies used to cope")
    
    # Progress tracking
    is_resolved = models.BooleanField(default=False)
    helpfulness_rating = models.IntegerField(blank=True, null=True,
                                            validators=[MinValueValidator(1), MaxValueValidator(5)],
                                            help_text="How helpful was this exploration? (1-5)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_emotional_insights'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['primary_emotion']),
            models.Index(fields=['is_resolved']),
        ]
        verbose_name = 'Emotional Insight'
        verbose_name_plural = 'Emotional Insights'
    
    def __str__(self):
        return f"{self.patient.full_name} - {self.get_primary_emotion_display()}"
