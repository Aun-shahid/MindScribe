from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class JournalEntry(models.Model):
    """Model for patient journal entries"""
    
    MOOD_TAG_CHOICES = [
        ('happy', 'Happy'),
        ('sad', 'Sad'),
        ('anxious', 'Anxious'),
        ('peaceful', 'Peaceful'),
        ('angry', 'Angry'),
        ('grateful', 'Grateful'),
        ('hopeful', 'Hopeful'),
        ('overwhelmed', 'Overwhelmed'),
        ('excited', 'Excited'),
        ('calm', 'Calm'),
        ('stressed', 'Stressed'),
        ('reflective', 'Reflective'),
        ('struggling', 'Struggling'),
        ('breakthrough', 'Breakthrough'),
        ('progress', 'Progress'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='patient_journal_entries',
                               limit_choices_to={'user_type': 'patient'})
    
    # Prompt and content
    prompt = models.TextField(blank=True, null=True, help_text="Daily prompt that inspired this entry")
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.TextField(blank=True, null=True, help_text="Text content of the journal")
    
    # Tags and categorization
    mood_tags = models.CharField(max_length=200, blank=True, null=True,
                                help_text="Comma-separated mood tags")
    is_private = models.BooleanField(default=True, 
                                    help_text="If True, only patient can see. If False, therapist can also view")
    
    # Favorites and bookmarks
    is_favorite = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    entry_date = models.DateField(default=timezone.now)
    
    class Meta:
        db_table = 'patient_journal_entries'
        ordering = ['-entry_date', '-created_at']
        indexes = [
            models.Index(fields=['patient', '-entry_date']),
            models.Index(fields=['entry_date']),
            models.Index(fields=['is_favorite']),
            models.Index(fields=['is_private']),
        ]
        verbose_name = 'Journal Entry'
        verbose_name_plural = 'Journal Entries'
    
    def __str__(self):
        return f"{self.patient.full_name} - Entry on {self.entry_date}"
    
    @property
    def mood_tags_list(self):
        """Return mood tags as a list"""
        if self.mood_tags:
            return [tag.strip() for tag in self.mood_tags.split(',')]
        return []


class JournalPrompt(models.Model):
    """Model for daily journal prompts"""
    CATEGORY_CHOICES = [
        ('feelings', 'Feelings'),
        ('gratitude', 'Gratitude'),
        ('reflection', 'Reflection'),
        ('goals', 'Goals'),
        ('mindfulness', 'Mindfulness'),
        ('relationships', 'Relationships'),
        ('growth', 'Personal Growth'),
        ('challenges', 'Challenges'),
        ('creativity', 'Creativity'),
        ('self_care', 'Self Care'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt = models.TextField(help_text="Journal prompt question")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True, 
                                  help_text="Optional description or guidance")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'journal_prompts'
        ordering = ['?']  # Random ordering for variety
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['category']),
        ]
        verbose_name = 'Journal Prompt'
        verbose_name_plural = 'Journal Prompts'
    
    def __str__(self):
        return self.prompt[:60]
