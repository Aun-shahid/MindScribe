from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid
import random

class User(AbstractUser):
    USER_TYPES = [
        ('patient', 'Patient'),
        ('therapist', 'Therapist'),
        ('admin', 'Admin'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='patient')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    @property
    def full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    class Meta:
        db_table = 'users'

class PatientProfile(models.Model):
    SESSION_FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('monthly', 'Monthly'),
        ('as_needed', 'As Needed'),
    ]
    
    WEEKDAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    therapist = models.ForeignKey('TherapistProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    
    # Patient identification
    patient_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    
    # Therapy details
    primary_concern = models.TextField(blank=True, null=True, help_text="Primary concern or issue")
    therapy_start_date = models.DateField(blank=True, null=True)
    session_frequency = models.CharField(max_length=20, choices=SESSION_FREQUENCY_CHOICES, default='weekly')
    
    # Preferred session days (stored as comma-separated values)
    preferred_session_days = models.CharField(max_length=100, blank=True, null=True, 
                                            help_text="Comma-separated weekdays (e.g., 'monday,wednesday,friday')")
    
    # Contact and emergency information
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True, help_text="Patient's address")
    
    # Medical information
    medical_history = models.TextField(blank=True, null=True)
    current_medications = models.TextField(blank=True, null=True)
    
    # Preferences
    preferred_language = models.CharField(max_length=10, choices=[('en', 'English'), ('ur', 'Urdu')], default='en')
    
    # Connection tracking
    connected_at = models.DateTimeField(null=True, blank=True)
    created_by_therapist = models.ForeignKey('TherapistProfile', on_delete=models.SET_NULL, 
                                           null=True, blank=True, related_name='created_patients',
                                           help_text="Therapist who created this patient profile")
    
    # History integration
    history_id = models.UUIDField(null=True, blank=True, 
                                help_text="ID linking to patient history records")
    
    # Account linking fields
    is_linked_account = models.BooleanField(default=False, 
                                          help_text="True if this patient profile is linked to a user account")
    linked_at = models.DateTimeField(null=True, blank=True, 
                                   help_text="Timestamp when the account was linked")
    
    def save(self, *args, **kwargs):
        # Auto-generate patient ID if not provided
        if not self.patient_id:
            self.patient_id = self.generate_patient_id()
        super().save(*args, **kwargs)
    
    def generate_patient_id(self):
        """Generate a unique patient ID"""
        import datetime
        today = datetime.date.today()
        year_suffix = str(today.year)[-2:]  # Last 2 digits of year
        
        # Find the next sequential number for this year
        existing_ids = PatientProfile.objects.filter(
            patient_id__startswith=f'PT{year_suffix}'
        ).values_list('patient_id', flat=True)
        
        if existing_ids:
            # Extract numbers and find the highest
            numbers = []
            for pid in existing_ids:
                try:
                    num = int(pid[4:])  # Remove 'PT' + year suffix
                    numbers.append(num)
                except ValueError:
                    continue
            next_num = max(numbers) + 1 if numbers else 1
        else:
            next_num = 1
        
        return f'PT{year_suffix}{next_num:04d}'  # PT24001, PT24002, etc.
    
    def get_preferred_days_list(self):
        """Return preferred session days as a list"""
        if self.preferred_session_days:
            return [day.strip() for day in self.preferred_session_days.split(',')]
        return []
    
    def set_preferred_days(self, days_list):
        """Set preferred session days from a list"""
        if days_list:
            self.preferred_session_days = ','.join(days_list)
        else:
            self.preferred_session_days = ''
    
    @property
    def assigned_therapist_name(self):
        """Return the name of the assigned therapist"""
        if self.therapist:
            return self.therapist.user.full_name
        return None
    
    class Meta:
        db_table = 'patient_profiles'
        ordering = ['-user__created_at']
        indexes = [
            models.Index(fields=['patient_id'], name='patient_id_idx'),
            models.Index(fields=['therapist', 'connected_at'], name='therapist_connected_idx'),
            models.Index(fields=['is_linked_account'], name='linked_account_idx'),
            models.Index(fields=['created_by_therapist'], name='created_by_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(session_frequency__in=['weekly', 'biweekly', 'monthly', 'as_needed']),
                name='valid_session_frequency'
            ),
        ]

class TherapistProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='therapist_profile')
    
    # Professional details
    license_number = models.CharField(max_length=100, unique=True)
    specialization = models.CharField(max_length=200)
    years_of_experience = models.IntegerField(default=0)
    education = models.TextField(blank=True, null=True)
    certifications = models.TextField(blank=True, null=True)
    
    # Practice details
    clinic_name = models.CharField(max_length=200, blank=True, null=True)
    clinic_address = models.TextField(blank=True, null=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Working hours and availability
    working_hours_start = models.TimeField(blank=True, null=True, help_text="Start of working hours")
    working_hours_end = models.TimeField(blank=True, null=True, help_text="End of working hours")
    working_days = models.CharField(max_length=100, blank=True, null=True, 
                                  help_text="Comma-separated working days (e.g., 'monday,tuesday,wednesday')")
    
    # Pairing and identification
    therapist_pin = models.CharField(max_length=9, unique=True, blank=True, null=True)
    pairing_code = models.CharField(max_length=8, unique=True, blank=True, null=True, 
                                  help_text="Short code for patient pairing")
    
    # Professional settings
    session_duration_minutes = models.IntegerField(default=60, help_text="Default session duration in minutes")
    max_patients = models.IntegerField(default=50, help_text="Maximum number of patients")
    
    # Bio and additional info
    bio = models.TextField(blank=True, null=True, help_text="Professional bio/description")
    languages_spoken = models.CharField(max_length=200, blank=True, null=True, 
                                      help_text="Comma-separated languages (e.g., 'English,Urdu')")
    
    def generate_unique_pin(self):
        """Generate a unique 9-digit PIN for the therapist"""
        while True:
            pin = str(random.randint(100000000, 999999999))
            if not TherapistProfile.objects.filter(therapist_pin=pin).exists():
                return pin
    
    def generate_pairing_code(self):
        """Generate a unique 8-character pairing code"""
        import string
        while True:
            # Generate 8-character alphanumeric code
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not TherapistProfile.objects.filter(pairing_code=code).exists():
                return code
    
    def save(self, *args, **kwargs):
        # Generate PIN only if it doesn't exist
        if not self.therapist_pin:
            self.therapist_pin = self.generate_unique_pin()
        
        # Generate pairing code only if it doesn't exist
        if not self.pairing_code:
            self.pairing_code = self.generate_pairing_code()
        
        super().save(*args, **kwargs)
    
    def get_connected_patients(self):
        """Get all patients connected to this therapist"""
        return self.patients.all()
    
    def get_patient_count(self):
        """Get the number of patients connected to this therapist"""
        return self.patients.count()
    
    def get_working_days_list(self):
        """Return working days as a list"""
        if self.working_days:
            return [day.strip() for day in self.working_days.split(',')]
        return []
    
    def set_working_days(self, days_list):
        """Set working days from a list"""
        if days_list:
            self.working_days = ','.join(days_list)
        else:
            self.working_days = ''
    
    def get_languages_list(self):
        """Return languages spoken as a list"""
        if self.languages_spoken:
            return [lang.strip() for lang in self.languages_spoken.split(',')]
        return []
    
    def can_accept_new_patients(self):
        """Check if therapist can accept new patients"""
        return self.get_patient_count() < self.max_patients
    
    def create_patient(self, user_data, patient_data):
        """Create a new patient and assign to this therapist"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Create user
        user = User.objects.create_user(**user_data)
        
        # Create patient profile
        patient_profile = PatientProfile.objects.create(
            user=user,
            therapist=self,
            created_by_therapist=self,
            connected_at=timezone.now(),
            **patient_data
        )
        
        return patient_profile
    
    class Meta:
        db_table = 'therapist_profiles'
        ordering = ['-user__created_at']