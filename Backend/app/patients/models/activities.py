"""Activity tracking model for patients"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class ActivityLog(models.Model):
    """Track patient's daily activities and their impact on mood"""
    ACTIVITY_TYPES = [
        ('exercise', 'Exercise/Physical Activity'),
        ('meditation', 'Meditation/Mindfulness'),
        ('social', 'Social Activity'),
        ('work', 'Work/Study'),
        ('hobby', 'Hobby/Creative Activity'),
        ('therapy', 'Therapy Session'),
        ('rest', 'Rest/Relaxation'),
        ('outdoor', 'Outdoor Activity'),
        ('creative', 'Creative Activity'),
        ('music', 'Music'),
        ('reading', 'Reading'),
        ('cooking', 'Cooking'),
        ('study', 'Study/Learning'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_activity_logs')
    
    # Activity details
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    activity_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Duration and intensity
    duration_minutes = models.IntegerField(blank=True, null=True)
    intensity = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        blank=True, 
        null=True, 
        help_text="Activity intensity (1-10)"
    )
    
    # Impact tracking
    mood_before = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        blank=True, 
        null=True
    )
    mood_after = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        blank=True, 
        null=True
    )
    energy_before = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        blank=True, 
        null=True
    )
    energy_after = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        blank=True, 
        null=True
    )
    
    # Context
    location = models.CharField(max_length=100, blank=True, null=True)
    with_others = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    activity_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def mood_impact(self):
        """Calculate mood impact of activity"""
        if self.mood_before is not None and self.mood_after is not None:
            impact = self.mood_after - self.mood_before
            if impact > 0:
                return f"+{impact}"
            return str(impact)
        return None
    
    @property
    def energy_impact(self):
        """Calculate energy impact of activity"""
        if self.energy_before is not None and self.energy_after is not None:
            impact = self.energy_after - self.energy_before
            if impact > 0:
                return f"+{impact}"
            return str(impact)
        return None
    
    class Meta:
        db_table = 'patient_activity_logs'
        ordering = ['-activity_date']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
    
    def __str__(self):
        return f"{self.activity_name} - {self.patient.full_name} ({self.activity_date.date()})"
