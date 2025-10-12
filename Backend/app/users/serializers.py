from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PatientProfile, TherapistProfile

User = get_user_model()


class PatientTherapistConnectionSerializer(serializers.Serializer):
    therapist_pin = serializers.CharField(
        max_length=9,
        min_length=9,
        required=True,
        help_text="9-digit PIN of the therapist to connect to"
    )
    
    def validate_therapist_pin(self, value):
        """Validate that the therapist PIN exists"""
        try:
            therapist_profile = TherapistProfile.objects.get(therapist_pin=value)
            return value
        except TherapistProfile.DoesNotExist:
            raise serializers.ValidationError("Invalid therapist PIN. Please check the PIN and try again.")


class TherapistInfoSerializer(serializers.Serializer):
    """Serializer for therapist information (for QR code generation)"""
    therapist_pin = serializers.CharField(read_only=True)
    therapist_id = serializers.CharField(read_only=True)
    therapist_name = serializers.CharField(read_only=True)
    specialization = serializers.CharField(read_only=True)
    clinic_name = serializers.CharField(read_only=True)
    patient_count = serializers.IntegerField(read_only=True)


class PatientProfileSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()
    therapist_info = serializers.SerializerMethodField()
    preferred_session_days_list = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientProfile
        fields = [
            'emergency_contact_name', 'emergency_contact_phone', 'medical_history',
            'current_medications', 'preferred_language', 'connected_at',
            'session_frequency', 'preferred_session_days', 'preferred_session_days_list',
            'primary_concern', 'therapy_start_date', 'user_info', 'therapist_info'
        ]
        read_only_fields = ['connected_at']
    
    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'date_of_birth': user.date_of_birth,
        }
    
    def get_therapist_info(self, obj):
        if obj.therapist:
            therapist = obj.therapist
            return {
                'id': str(therapist.user.id),
                'name': f"{therapist.user.first_name} {therapist.user.last_name}".strip(),
                'specialization': therapist.specialization,
                'clinic_name': therapist.clinic_name,
            }
        return None
    
    def get_preferred_session_days_list(self, obj):
        """Return preferred session days as a list"""
        return obj.get_preferred_days_list()


class TherapistProfileSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()
    patient_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TherapistProfile
        fields = [
            'license_number', 'specialization', 'years_of_experience',
            'education', 'certifications', 'clinic_name', 'clinic_address',
            'therapist_pin', 'user_info', 'patient_count'
        ]
        read_only_fields = ['therapist_pin']
    
    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'date_of_birth': user.date_of_birth,
        }
    
    def get_patient_count(self, obj):
        return obj.get_patient_count()


class PatientListSerializer(serializers.Serializer):
    """Serializer for patient list responses"""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone_number = serializers.CharField(read_only=True)
    date_of_birth = serializers.DateField(read_only=True)
    connected_at = serializers.DateTimeField(read_only=True)
    preferred_language = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class PatientListResponseSerializer(serializers.Serializer):
    """Serializer for the complete patient list response"""
    patients = PatientListSerializer(many=True, read_only=True)
    total_count = serializers.IntegerField(read_only=True)
    therapist_info = TherapistInfoSerializer(read_only=True)
    filters_applied = serializers.DictField(read_only=True)


class PatientDetailResponseSerializer(serializers.Serializer):
    """Serializer for individual patient detail response"""
    patient = PatientProfileSerializer(read_only=True)
    therapist_info = TherapistInfoSerializer(read_only=True)
