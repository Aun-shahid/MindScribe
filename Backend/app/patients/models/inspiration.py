from django.db import models
import uuid


class DailyInspiration(models.Model):
    """Model for daily inspirational quotes and messages"""
    CATEGORY_CHOICES = [
        ('motivation', 'Motivation'),
        ('healing', 'Healing'),
        ('strength', 'Strength'),
        ('self_love', 'Self Love'),
        ('mindfulness', 'Mindfulness'),
        ('gratitude', 'Gratitude'),
        ('resilience', 'Resilience'),
        ('hope', 'Hope'),
        ('peace', 'Peace'),
        ('growth', 'Personal Growth'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote = models.TextField(help_text="The inspirational quote")
    author = models.CharField(max_length=200, blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Additional content
    reflection_prompt = models.TextField(blank=True, null=True,
                                        help_text="Optional reflection question")
    
    # Status
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False, help_text="Featured quote of the day")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'daily_inspirations'
        ordering = ['-featured', '?']  # Featured first, then random
        indexes = [
            models.Index(fields=['is_active', 'featured']),
            models.Index(fields=['category']),
        ]
        verbose_name = 'Daily Inspiration'
        verbose_name_plural = 'Daily Inspirations'
    
    def __str__(self):
        return f"{self.quote[:50]}... - {self.author or 'Unknown'}"
