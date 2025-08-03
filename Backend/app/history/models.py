# apps/history/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()

class MoodEntry(models.Model):
    MOOD_TYPES = [
        ('very_sad', 'Very Sad'),
        ('sad', 'Sad'),
        ('neutral', 'Neutral'),
        ('happy', 'Happy'),
        ('very_happy', 'Very Happy'),
    ]
    
    TRIGGER_TYPES = [
        ('work', 'Work/Career'),
        ('family', 'Family'),
        ('relationships', 'Relationships'),
        ('health', 'Health'),
        ('finances', 'Finances'),
        ('social', 'Social Situations'),
        ('weather', 'Weather'),
        ('sleep', 'Sleep'),
        ('exercise', 'Exercise'),
        ('medication', 'Medication'),
        ('therapy', 'Therapy Session'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mood_entries')
    
    # Core mood data
    mood = models.CharField(max_length=20, choices=MOOD_TYPES)
    mood_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    
    # Detailed tracking
    energy_level = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    sleep_quality = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    anxiety_level = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    stress_level = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Context and triggers
    triggers = models.CharField(max_length=500, blank=True, null=True, 
                               help_text="Comma-separated list of triggers")
    location = models.CharField(max_length=100, blank=True, null=True)
    weather = models.CharField(max_length=50, blank=True, null=True)
    
    # Notes and reflection
    notes = models.TextField(blank=True, null=True)
    coping_strategies_used = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def get_triggers_list(self):
        """Return triggers as a list"""
        if self.triggers:
            return [trigger.strip() for trigger in self.triggers.split(',')]
        return []
    
    def set_triggers(self, triggers_list):
        """Set triggers from a list"""
        if triggers_list:
            self.triggers = ','.join(triggers_list)
        else:
            self.triggers = ''
    
    class Meta:
        db_table = 'mood_entries'
        ordering = ['-created_at']

class ReflectionPrompt(models.Model):
    PROMPT_TYPES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('session_based', 'Session Based'),
        ('custom', 'Custom'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reflection_prompts')
    prompt_text = models.TextField()
    prompt_type = models.CharField(max_length=20, choices=PROMPT_TYPES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reflection_prompts'

class ReflectionEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reflection_entries')
    prompt = models.ForeignKey(ReflectionPrompt, on_delete=models.CASCADE, related_name='entries')
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reflection_entries'
        ordering = ['-created_at']

class PatientGoal(models.Model):
    GOAL_STATUS = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_goals')
    title = models.CharField(max_length=200)
    description = models.TextField()
    target_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=GOAL_STATUS, default='active')
    progress_percentage = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_goals'

class ProgressTracking(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_tracking')
    date = models.DateField()
    overall_wellbeing = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    symptom_severity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    functional_improvement = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    medication_adherence = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'progress_tracking'
        unique_together = ['patient', 'date']


class JournalEntry(models.Model):
    """Patient's personal journal entries"""
    ENTRY_TYPES = [
        ('daily', 'Daily Journal'),
        ('gratitude', 'Gratitude Entry'),
        ('reflection', 'Self Reflection'),
        ('dream', 'Dream Journal'),
        ('therapy', 'Post-Therapy Reflection'),
        ('milestone', 'Milestone/Achievement'),
        ('challenge', 'Challenge/Difficulty'),
        ('free_form', 'Free Form'),
    ]
    
    PRIVACY_LEVELS = [
        ('private', 'Private (Only Me)'),
        ('therapist', 'Share with Therapist'),
        ('anonymous', 'Anonymous Sharing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    
    # Entry details
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.TextField()
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default='free_form')
    privacy_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='private')
    
    # Emotional context
    mood_before = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    mood_after = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Tags and categorization
    tags = models.CharField(max_length=500, blank=True, null=True, 
                           help_text="Comma-separated tags")
    
    # Metadata
    word_count = models.IntegerField(default=0)
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate word count
        if self.content:
            self.word_count = len(self.content.split())
        super().save(*args, **kwargs)
    
    def get_tags_list(self):
        """Return tags as a list"""
        if self.tags:
            return [tag.strip() for tag in self.tags.split(',')]
        return []
    
    def set_tags(self, tags_list):
        """Set tags from a list"""
        if tags_list:
            self.tags = ','.join(tags_list)
        else:
            self.tags = ''
    
    @property
    def mood_improvement(self):
        """Calculate mood improvement during journaling"""
        if self.mood_before and self.mood_after:
            return self.mood_after - self.mood_before
        return None
    
    class Meta:
        db_table = 'journal_entries'
        ordering = ['-created_at']


class ActivityLog(models.Model):
    """Track patient's daily activities and their impact on mood"""
    ACTIVITY_TYPES = [
        ('exercise', 'Exercise/Physical Activity'),
        ('meditation', 'Meditation/Mindfulness'),
        ('social', 'Social Activity'),
        ('work', 'Work/Study'),
        ('hobby', 'Hobby/Creative Activity'),
        ('therapy', 'Therapy Session'),
        ('medication', 'Medication'),
        ('sleep', 'Sleep'),
        ('meal', 'Meal/Nutrition'),
        ('self_care', 'Self Care'),
        ('outdoor', 'Outdoor Activity'),
        ('entertainment', 'Entertainment/Leisure'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    
    # Activity details
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    activity_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Duration and intensity
    duration_minutes = models.IntegerField(blank=True, null=True)
    intensity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], 
                                   blank=True, null=True, help_text="Activity intensity (1-10)")
    
    # Impact tracking
    mood_before = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    mood_after = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    energy_before = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    energy_after = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Context
    location = models.CharField(max_length=100, blank=True, null=True)
    with_others = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    activity_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def mood_impact(self):
        """Calculate mood impact of activity"""
        if self.mood_before and self.mood_after:
            return self.mood_after - self.mood_before
        return None
    
    @property
    def energy_impact(self):
        """Calculate energy impact of activity"""
        if self.energy_before and self.energy_after:
            return self.energy_after - self.energy_before
        return None
    
    class Meta:
        db_table = 'activity_logs'
        ordering = ['-activity_date']


class MedicationLog(models.Model):
    """Track medication adherence and side effects"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medication_logs')
    
    # Medication details
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    prescribed_time = models.TimeField()
    
    # Adherence tracking
    taken_at = models.DateTimeField(blank=True, null=True)
    was_taken = models.BooleanField(default=False)
    missed_reason = models.CharField(max_length=200, blank=True, null=True)
    
    # Side effects and mood impact
    side_effects = models.TextField(blank=True, null=True)
    mood_before = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    mood_after = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    effectiveness_rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    log_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_logs'
        ordering = ['-log_date', '-prescribed_time']
        unique_together = ['patient', 'medication_name', 'log_date', 'prescribed_time']


class SleepLog(models.Model):
    """Track sleep patterns and quality"""
    SLEEP_QUALITY_CHOICES = [
        ('very_poor', 'Very Poor'),
        ('poor', 'Poor'),
        ('fair', 'Fair'),
        ('good', 'Good'),
        ('excellent', 'Excellent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sleep_logs')
    
    # Sleep timing
    sleep_date = models.DateField()
    bedtime = models.TimeField(blank=True, null=True)
    sleep_time = models.TimeField(blank=True, null=True)
    wake_time = models.TimeField(blank=True, null=True)
    
    # Sleep metrics
    hours_slept = models.FloatField(blank=True, null=True)
    times_woken = models.IntegerField(default=0)
    sleep_quality = models.CharField(max_length=20, choices=SLEEP_QUALITY_CHOICES, blank=True, null=True)
    sleep_quality_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Context
    pre_sleep_activities = models.TextField(blank=True, null=True)
    sleep_environment = models.CharField(max_length=200, blank=True, null=True)
    dreams_remembered = models.BooleanField(default=False)
    dream_content = models.TextField(blank=True, null=True)
    
    # Impact on next day
    morning_mood = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    morning_energy = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sleep_logs'
        ordering = ['-sleep_date']
        unique_together = ['patient', 'sleep_date']


class SymptomTracker(models.Model):
    """Track specific symptoms and their severity"""
    SYMPTOM_TYPES = [
        ('anxiety', 'Anxiety'),
        ('depression', 'Depression'),
        ('panic', 'Panic Attacks'),
        ('mood_swings', 'Mood Swings'),
        ('irritability', 'Irritability'),
        ('fatigue', 'Fatigue'),
        ('concentration', 'Concentration Issues'),
        ('sleep_issues', 'Sleep Issues'),
        ('appetite', 'Appetite Changes'),
        ('social_withdrawal', 'Social Withdrawal'),
        ('physical_pain', 'Physical Pain'),
        ('headaches', 'Headaches'),
        ('nausea', 'Nausea'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='symptom_logs')
    
    # Symptom details
    symptom_type = models.CharField(max_length=20, choices=SYMPTOM_TYPES)
    symptom_name = models.CharField(max_length=200, blank=True, null=True)
    severity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    
    # Context and triggers
    triggers = models.TextField(blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    
    # Coping and relief
    coping_strategies = models.TextField(blank=True, null=True)
    relief_methods = models.TextField(blank=True, null=True)
    effectiveness_rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    symptom_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'symptom_tracker'
        ordering = ['-symptom_date']


class CopingStrategy(models.Model):
    """Track coping strategies and their effectiveness"""
    STRATEGY_TYPES = [
        ('breathing', 'Breathing Exercises'),
        ('meditation', 'Meditation'),
        ('physical', 'Physical Exercise'),
        ('social', 'Social Support'),
        ('creative', 'Creative Activities'),
        ('cognitive', 'Cognitive Techniques'),
        ('distraction', 'Distraction Techniques'),
        ('relaxation', 'Relaxation Techniques'),
        ('grounding', 'Grounding Techniques'),
        ('journaling', 'Journaling'),
        ('music', 'Music/Audio'),
        ('nature', 'Nature/Outdoors'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coping_strategies')
    
    # Strategy details
    strategy_type = models.CharField(max_length=20, choices=STRATEGY_TYPES)
    strategy_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Usage tracking
    times_used = models.IntegerField(default=0)
    average_effectiveness = models.FloatField(default=0.0)
    last_used = models.DateTimeField(blank=True, null=True)
    
    # Context
    best_situations = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    is_favorite = models.BooleanField(default=False)
    learned_from_therapist = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def update_effectiveness(self, new_rating):
        """Update average effectiveness with new rating"""
        if self.times_used == 0:
            self.average_effectiveness = new_rating
        else:
            total_score = self.average_effectiveness * self.times_used
            self.average_effectiveness = (total_score + new_rating) / (self.times_used + 1)
        
        self.times_used += 1
        self.last_used = timezone.now()
        self.save()
    
    class Meta:
        db_table = 'coping_strategies'
        ordering = ['-average_effectiveness', '-times_used']


class PatientMilestone(models.Model):
    """Track patient achievements and milestones"""
    MILESTONE_TYPES = [
        ('therapy', 'Therapy Milestone'),
        ('personal', 'Personal Achievement'),
        ('health', 'Health Improvement'),
        ('social', 'Social Progress'),
        ('work', 'Work/Career'),
        ('education', 'Educational'),
        ('relationship', 'Relationship'),
        ('habit', 'Habit Formation'),
        ('goal', 'Goal Achievement'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='milestones')
    
    # Milestone details
    title = models.CharField(max_length=200)
    description = models.TextField()
    milestone_type = models.CharField(max_length=20, choices=MILESTONE_TYPES)
    
    # Significance
    importance_rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    mood_impact = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], blank=True, null=True)
    
    # Context
    related_goal = models.ForeignKey(PatientGoal, on_delete=models.SET_NULL, blank=True, null=True)
    celebration_notes = models.TextField(blank=True, null=True)
    
    # Metadata
    achieved_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'patient_milestones'
        ordering = ['-achieved_date']
