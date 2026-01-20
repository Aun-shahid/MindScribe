from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class RelaxationContent(models.Model):
    """Model for relaxation sounds and nature therapy content"""
    CONTENT_TYPE_CHOICES = [
        ('audio', 'Audio'),
        ('guided_meditation', 'Guided Meditation'),
        ('nature', 'Nature Sounds'),
        ('meditation', 'Meditation'),
        ('breathing', 'Breathing Exercise'),
        ('music', 'Relaxing Music'),
        ('ambient', 'Ambient Sounds'),
    ]
    
    CATEGORY_CHOICES = [
        ('rain', 'Rain'),
        ('ocean', 'Ocean'),
        ('forest', 'Forest'),
        ('birds', 'Birds'),
        ('wind', 'Wind'),
        ('fire', 'Fire'),
        ('nature', 'Nature'),
        ('ambient', 'Ambient'),
        ('meditation', 'Meditation'),
        ('breathing', 'Breathing'),
        ('visualization', 'Visualization'),
        ('sleep', 'Sleep'),
        ('focus', 'Focus'),
        ('anxiety', 'Anxiety Relief'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Media files
    audio_url = models.URLField(help_text="URL to audio file")
    thumbnail_url = models.URLField(blank=True, null=True)
    duration_seconds = models.IntegerField(help_text="Duration in seconds")
    
    # Optional instructions for guided content
    instructions = models.TextField(blank=True, null=True,
                                   help_text="Instructions for guided meditations")
    
    # Metadata
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    play_count = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, 
                                        default=0.00, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'relaxation_content'
        ordering = ['-play_count', 'title']
        indexes = [
            models.Index(fields=['content_type', 'category']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'Relaxation Content'
        verbose_name_plural = 'Relaxation Content'
    
    def __str__(self):
        return f"{self.title} ({self.get_content_type_display()})"


class RelaxationSession(models.Model):
    """Track patient's relaxation sessions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='relaxation_sessions',
                               limit_choices_to={'user_type': 'patient'})
    content = models.ForeignKey(RelaxationContent, on_delete=models.CASCADE,
                               related_name='sessions')
    
    # Session details
    duration_listened_seconds = models.IntegerField(help_text="How long patient listened")
    completed = models.BooleanField(default=False, help_text="Did patient complete the full content?")
    
    # Feedback
    rating = models.IntegerField(blank=True, null=True,
                                validators=[MinValueValidator(1), MaxValueValidator(5)])
    mood_before = models.CharField(max_length=20, blank=True, null=True,
                                  help_text="Mood before session")
    mood_after = models.CharField(max_length=20, blank=True, null=True,
                                 help_text="Mood after session")
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'relaxation_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['patient', '-started_at']),
            models.Index(fields=['content']),
        ]
        verbose_name = 'Relaxation Session'
        verbose_name_plural = 'Relaxation Sessions'
    
    def __str__(self):
        return f"{self.patient.full_name} - {self.content.title}"


class RelaxationTip(models.Model):
    """Model for relaxation tips and techniques"""
    TIP_TYPE_CHOICES = [
        ('breathing', 'Breathing Technique'),
        ('visualization', 'Visualization'),
        ('position', 'Comfortable Position'),
        ('distraction', 'Minimize Distractions'),
        ('general', 'General Tip'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    tip_type = models.CharField(max_length=20, choices=TIP_TYPE_CHOICES)
    description = models.TextField()
    icon = models.CharField(max_length=50, blank=True, null=True,
                          help_text="Icon name or emoji for the tip")
    order = models.IntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'relaxation_tips'
        ordering = ['order', 'title']
        verbose_name = 'Relaxation Tip'
        verbose_name_plural = 'Relaxation Tips'
    
    def __str__(self):
        return f"{self.title} ({self.get_tip_type_display()})"
