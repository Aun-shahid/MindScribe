from rest_framework import serializers
from django.db import DatabaseError
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from .models import PatientProfile, TherapistProfile, ConnectionRequest

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
    connected_therapists = serializers.SerializerMethodField()
    preferred_session_days_list = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientProfile
        fields = [
            'emergency_contact_name', 'emergency_contact_phone', 'medical_history',
            'current_medications', 'preferred_language', 'connected_at',
            'session_frequency', 'preferred_session_days', 'preferred_session_days_list',
            'primary_concern', 'therapy_start_date', 'user_info', 'therapist_info', 'connected_therapists'
        ]
        read_only_fields = ['connected_at']
    
    @extend_schema_field(serializers.DictField())
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
    
    @extend_schema_field(serializers.DictField(allow_null=True))
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

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_connected_therapists(self, obj):
        try:
            links = obj.get_connected_therapist_links()
        except DatabaseError:
            # Keep profile endpoint functional even if connection-link table is unavailable.
            return []

        return [
            {
                'id': str(link.therapist.user.id),
                'name': link.therapist.user.full_name,
                'specialization': link.therapist.specialization,
                'clinic_name': link.therapist.clinic_name,
                'connected_at': link.connected_at,
                'is_primary': obj.therapist_id == link.therapist_id,
            }
            for link in links
        ]
    
    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
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
    
    @extend_schema_field(serializers.DictField())
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
    
    @extend_schema_field(serializers.IntegerField())
    def get_patient_count(self, obj):
        return obj.get_patient_count()


class TherapistPatientListSerializer(serializers.Serializer):
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
    patients = TherapistPatientListSerializer(many=True, read_only=True)
    total_count = serializers.IntegerField(read_only=True)
    therapist_info = TherapistInfoSerializer(read_only=True)
    filters_applied = serializers.DictField(read_only=True)


class PatientDetailResponseSerializer(serializers.Serializer):
    """Serializer for individual patient detail response"""
    patient = PatientProfileSerializer(read_only=True)
    therapist_info = TherapistInfoSerializer(read_only=True)


class ConnectionRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating a connection request"""
    therapist_pin = serializers.CharField(
        max_length=9,
        min_length=9,
        required=True,
        help_text="9-digit PIN of the therapist to connect to"
    )
    message = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional message to the therapist"
    )
    
    def validate_therapist_pin(self, value):
        """Validate that the therapist PIN exists"""
        try:
            therapist_profile = TherapistProfile.objects.get(therapist_pin=value)
            return value
        except TherapistProfile.DoesNotExist:
            raise serializers.ValidationError("Invalid therapist PIN. Please check the PIN and try again.")


class ConnectionRequestSerializer(serializers.ModelSerializer):
    """Serializer for displaying connection requests"""
    patient_info = serializers.SerializerMethodField()
    therapist_info = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = ConnectionRequest
        fields = [
            'id', 'patient_info', 'therapist_info', 'status', 'message',
            'rejection_reason', 'created_at', 'updated_at', 'expires_at',
            'responded_at', 'is_expired'
        ]
    
    def get_patient_info(self, obj):
        """Get patient user information"""
        return {
            'id': str(obj.patient_user.id),
            'name': obj.patient_user.full_name,
            'email': obj.patient_user.email,
            'phone_number': obj.patient_user.phone_number,
        }
    
    def get_therapist_info(self, obj):
        """Get therapist information"""
        return {
            'id': str(obj.therapist.user.id),
            'name': obj.therapist.user.full_name,
            'specialization': obj.therapist.specialization,
            'clinic_name': obj.therapist.clinic_name,
        }


class ConnectionRequestAcceptSerializer(serializers.Serializer):
    """Serializer for accepting a connection request"""
    action = serializers.ChoiceField(
        choices=['accept_new', 'merge'],
        required=True,
        help_text="'accept_new' to add as new patient, 'merge' to merge with existing"
    )
    merge_patient_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of existing patient profile to merge with (required if action='merge')"
    )
    
    def validate(self, attrs):
        action = attrs.get('action')
        merge_patient_id = attrs.get('merge_patient_id')
        
        if action == 'merge' and not merge_patient_id:
            raise serializers.ValidationError({
                'merge_patient_id': "merge_patient_id is required when action is 'merge'"
            })
        
        return attrs


class ConnectionRequestRejectSerializer(serializers.Serializer):
    """Serializer for rejecting a connection request"""
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for rejection"
    )


class MergeablePatientSerializer(serializers.ModelSerializer):
    """Serializer for patients that can be merged (therapist-created, not yet linked)"""
    user_info = serializers.SerializerMethodField()
    session_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientProfile
        fields = [
            'patient_id', 'primary_concern', 'therapy_start_date',
            'session_frequency', 'user_info', 'session_count', 
            'is_linked_account', 'created_by_therapist'
        ]
    
    def get_user_info(self, obj):
        return {
            'id': str(obj.user.id),
            'name': obj.user.full_name,
            'email': obj.user.email,
            'phone_number': obj.user.phone_number,
        }
    
    def get_session_count(self, obj):
        from therapy_sessions.models import Session
        return Session.objects.filter(patient=obj.user).count()

