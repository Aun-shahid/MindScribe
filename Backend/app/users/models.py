from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from .validators import MaxFileSizeValidator
import uuid
import random
from datetime import timedelta

USERNAME_CHANGE_COOLDOWN_DAYS = 30


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
    # Set when the username is changed after signup (null = never changed; 30-day cooldown applies after first change).
    username_last_changed_at = models.DateTimeField(null=True, blank=True)
    avatar = models.FileField(
        upload_to='avatars/%Y/%m/',
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=('jpg', 'jpeg', 'png', 'gif', 'webp'),
            ),
            MaxFileSizeValidator(5 * 1024 * 1024),
        ],
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    @property
    def full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def can_change_username_now(self) -> bool:
        if self.username_last_changed_at is None:
            return True
        return timezone.now() >= self.username_last_changed_at + timedelta(
            days=USERNAME_CHANGE_COOLDOWN_DAYS
        )

    def next_username_change_allowed_at(self):
        """Return datetime when username may be changed again, or None if allowed now."""
        if self.username_last_changed_at is None:
            return None
        return self.username_last_changed_at + timedelta(days=USERNAME_CHANGE_COOLDOWN_DAYS)
    
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
    
    # Account linking fields
    is_linked_account = models.BooleanField(default=False, 
                                          help_text="True if this patient profile is linked to a user account")
    linked_at = models.DateTimeField(null=True, blank=True, 
                                   help_text="Timestamp when the account was linked")
    original_therapist_patient = models.ForeignKey('self', on_delete=models.SET_NULL,
                                                   null=True, blank=True, related_name='linked_accounts',
                                                   help_text="Reference to the original patient profile created by therapist (if merged)")
    
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

    def get_connected_therapist_links(self):
        links = self.therapist_connections.select_related('therapist__user').order_by('-connected_at')
        if links.exists() or not self.therapist:
            return links

        # Backward compatibility for legacy rows created before connection links existed.
        PatientTherapistConnection.objects.get_or_create(
            patient=self,
            therapist=self.therapist,
            defaults={'connected_at': self.connected_at or timezone.now()},
        )
        return self.therapist_connections.select_related('therapist__user').order_by('-connected_at')

    def get_connected_therapists(self):
        return [link.therapist for link in self.get_connected_therapist_links()]

    def is_connected_to_therapist(self, therapist_profile):
        if not therapist_profile:
            return False
        if self.therapist_id == therapist_profile.id:
            return True
        return self.therapist_connections.filter(therapist=therapist_profile).exists()

    def connect_to_therapist(self, therapist_profile, connected_at=None):
        if not therapist_profile:
            return None

        connected_at = connected_at or timezone.now()
        link, created = PatientTherapistConnection.objects.get_or_create(
            patient=self,
            therapist=therapist_profile,
            defaults={'connected_at': connected_at},
        )

        if not created and connected_at and link.connected_at != connected_at:
            link.connected_at = connected_at
            link.save(update_fields=['connected_at'])

        if not self.therapist:
            self.therapist = therapist_profile
            self.connected_at = connected_at
            self.save(update_fields=['therapist', 'connected_at'])

        return link

    def disconnect_from_therapist(self, therapist_profile):
        if not therapist_profile:
            return False

        deleted, _ = self.therapist_connections.filter(therapist=therapist_profile).delete()

        if self.therapist == therapist_profile:
            next_link = self.therapist_connections.select_related('therapist').order_by('-connected_at').first()
            if next_link:
                self.therapist = next_link.therapist
                self.connected_at = next_link.connected_at
            else:
                self.therapist = None
                self.connected_at = None
            self.save(update_fields=['therapist', 'connected_at'])

        return deleted > 0
    
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
    
    # Pairing and identification
    therapist_pin = models.CharField(max_length=9, unique=True, blank=True, null=True)
    
    # Professional settings
    session_duration_minutes = models.IntegerField(default=60, help_text="Default session duration in minutes")
    max_patients = models.IntegerField(default=50, help_text="Maximum number of patients")
    buffer_between_sessions = models.IntegerField(default=15, help_text="Buffer time between sessions in minutes")
    
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
    
    def save(self, *args, **kwargs):
        # Generate PIN only if it doesn't exist
        if not self.therapist_pin:
            self.therapist_pin = self.generate_unique_pin()
        
        super().save(*args, **kwargs)
    
    def get_connected_patients(self):
        """Get all patients connected to this therapist"""
        linked_patient_ids = PatientTherapistConnection.objects.filter(
            therapist=self
        ).values_list('patient_id', flat=True)
        return PatientProfile.objects.filter(id__in=linked_patient_ids)
    
    def get_patient_count(self):
        """Get the number of patients connected to this therapist"""
        return self.get_connected_patients().count()
    
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


class ConnectionRequest(models.Model):
    """Connection requests from patients to therapists"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('merged', 'Merged with Existing Patient'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # The patient user making the request
    patient_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connection_requests')
    
    # The therapist being requested
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE, related_name='connection_requests')
    
    # Request status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # If merged with an existing therapist-created patient
    merged_with_patient = models.ForeignKey(PatientProfile, on_delete=models.SET_NULL, 
                                           null=True, blank=True, related_name='merge_requests',
                                           help_text="The therapist-created patient profile this was merged with")
    
    # Request message from patient
    message = models.TextField(blank=True, null=True, help_text="Optional message from patient")
    
    # Rejection reason (if rejected)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Optional expiry date for the request")
    responded_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Set default expiry to 7 days if not set
        if not self.expires_at and self.status == 'pending':
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if request has expired"""
        if self.expires_at and self.status == 'pending':
            return timezone.now() > self.expires_at
        return False
    
    def accept_as_new(self):
        """Accept the request and connect patient as a new patient"""
        if self.status != 'pending':
            raise ValueError("Can only accept pending requests")
        
        # Get or create patient profile
        patient_profile, created = PatientProfile.objects.get_or_create(
            user=self.patient_user,
            defaults={'preferred_language': 'en'}
        )
        
        # Connect to therapist
        now = timezone.now()
        patient_profile.connect_to_therapist(self.therapist, connected_at=now)
        patient_profile.is_linked_account = True
        patient_profile.linked_at = now
        patient_profile.save(update_fields=['is_linked_account', 'linked_at'])
        
        # Update request status
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save()
        
        return patient_profile
    
    def merge_with_existing(self, existing_patient_profile):
        """Merge with an existing therapist-created patient profile"""
        if self.status != 'pending':
            raise ValueError("Can only merge pending requests")
        
        if not existing_patient_profile.is_connected_to_therapist(self.therapist):
            raise ValueError("Existing patient must belong to the same therapist")
        
        if existing_patient_profile.is_linked_account:
            raise ValueError("Cannot merge with an already linked patient account")
        
        # Get or create patient profile for requesting user
        new_patient_profile, created = PatientProfile.objects.get_or_create(
            user=self.patient_user,
            defaults={'preferred_language': 'en'}
        )
        
        # Transfer data from existing profile to new profile
        now = timezone.now()
        new_patient_profile.connect_to_therapist(self.therapist, connected_at=now)
        new_patient_profile.is_linked_account = True
        new_patient_profile.linked_at = now
        new_patient_profile.original_therapist_patient = existing_patient_profile
        
        # Copy relevant fields from existing profile
        if existing_patient_profile.primary_concern and not new_patient_profile.primary_concern:
            new_patient_profile.primary_concern = existing_patient_profile.primary_concern
        if existing_patient_profile.therapy_start_date and not new_patient_profile.therapy_start_date:
            new_patient_profile.therapy_start_date = existing_patient_profile.therapy_start_date
        if existing_patient_profile.session_frequency:
            new_patient_profile.session_frequency = existing_patient_profile.session_frequency
        if existing_patient_profile.emergency_contact_name and not new_patient_profile.emergency_contact_name:
            new_patient_profile.emergency_contact_name = existing_patient_profile.emergency_contact_name
        if existing_patient_profile.emergency_contact_phone and not new_patient_profile.emergency_contact_phone:
            new_patient_profile.emergency_contact_phone = existing_patient_profile.emergency_contact_phone
        if existing_patient_profile.medical_history and not new_patient_profile.medical_history:
            new_patient_profile.medical_history = existing_patient_profile.medical_history
        if existing_patient_profile.current_medications and not new_patient_profile.current_medications:
            new_patient_profile.current_medications = existing_patient_profile.current_medications
        
        new_patient_profile.save()
        
        # Update request status
        self.status = 'merged'
        self.merged_with_patient = existing_patient_profile
        self.responded_at = timezone.now()
        self.save()
        
        return new_patient_profile, existing_patient_profile
    
    def reject(self, reason=None):
        """Reject the connection request"""
        if self.status != 'pending':
            raise ValueError("Can only reject pending requests")
        
        self.status = 'rejected'
        self.rejection_reason = reason
        self.responded_at = timezone.now()
        self.save()
    
    class Meta:
        db_table = 'connection_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['therapist', 'status'], name='therapist_status_idx'),
            models.Index(fields=['patient_user', 'status'], name='patient_status_idx'),
            models.Index(fields=['expires_at'], name='expires_at_idx'),
        ]
        constraints = [
            # Prevent duplicate pending requests
            models.UniqueConstraint(
                fields=['patient_user', 'therapist'],
                condition=models.Q(status='pending'),
                name='unique_pending_request'
            ),
        ]


class PatientTherapistConnection(models.Model):
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='therapist_connections')
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE, related_name='patient_connections')
    connected_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'patient_therapist_connections'
        ordering = ['-connected_at']
        constraints = [
            models.UniqueConstraint(fields=['patient', 'therapist'], name='unique_patient_therapist_connection')
        ]
        indexes = [
            models.Index(fields=['therapist', 'connected_at'], name='ptc_therapist_connected_idx'),
            models.Index(fields=['patient', 'connected_at'], name='ptc_patient_connected_idx'),
        ]