from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class PatientGoal(models.Model):
    """Model for patient therapy goals"""
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='therapy_goals',
                               limit_choices_to={'user_type': 'patient'})
    
    # Goal details
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Timeline
    target_date = models.DateField(blank=True, null=True)
    completed_date = models.DateField(blank=True, null=True)
    
    # Progress tracking
    progress_percentage = models.IntegerField(default=0,
                                             validators=[MinValueValidator(0), MaxValueValidator(100)])
    milestones = models.TextField(blank=True, null=True,
                                 help_text="JSON or comma-separated milestones")
    
    # Collaboration
    created_by_therapist = models.BooleanField(default=False,
                                              help_text="True if therapist created this goal")
    therapist_notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patients_goals'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['target_date']),
        ]
        verbose_name = 'Patient Goal'
        verbose_name_plural = 'Patient Goals'
    
    def __str__(self):
        return f"{self.patient.full_name} - {self.title}"
