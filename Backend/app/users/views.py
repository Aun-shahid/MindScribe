from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter

from .models import PatientProfile, TherapistProfile
from .serializers import (
    PatientTherapistConnectionSerializer, TherapistInfoSerializer,
    PatientProfileSerializer, TherapistProfileSerializer,
    PatientListResponseSerializer, PatientDetailResponseSerializer
)

User = get_user_model()


@extend_schema(tags=['Therapist Management'])
class TherapistPinView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        responses={
            200: OpenApiResponse(description='Therapist PIN retrieved successfully.'),
            403: OpenApiResponse(description='User is not a therapist.'),
            404: OpenApiResponse(description='Therapist profile not found.')
        },
        summary="Get Therapist PIN",
        description="Retrieve the therapist's unique PIN for QR code generation."
    )
    def get(self, request):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = user.therapist_profile
            return Response({
                'therapist_pin': therapist_profile.therapist_pin,
                'therapist_id': str(user.id),
                'therapist_name': f"{user.first_name} {user.last_name}".strip(),
                'specialization': therapist_profile.specialization,
                'clinic_name': therapist_profile.clinic_name,
                'patient_count': therapist_profile.get_patient_count()
            }, status=status.HTTP_200_OK)
        except TherapistProfile.DoesNotExist:
            return Response(
                {'detail': 'Therapist profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(tags=['Therapist Management'])
class TherapistsView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='id',
                description='Specific therapist ID to get details for',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='ordering',
                description='Order by: created_at, name, specialization',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='search',
                description='Search by name, specialization, or clinic name',
                required=False,
                type=str
            )
        ],
        responses={
            200: OpenApiResponse(description='Therapists retrieved successfully.'),
            403: OpenApiResponse(description='Access denied.'),
            404: OpenApiResponse(description='Therapist not found.')
        },
        summary="Get Therapists",
        description="Get all therapists or specific therapist details. Supports filtering and ordering."
    )
    def get(self, request):
        user = request.user
        therapist_id = request.query_params.get('id')
        ordering = request.query_params.get('ordering', 'created_at')
        search = request.query_params.get('search', '')
        
        # If specific therapist ID is provided
        if therapist_id:
            try:
                therapist_profile = TherapistProfile.objects.select_related('user').get(user__id=therapist_id)
                
                # Check permissions based on user type
                if user.user_type == 'patient':
                    # Patients can only see their own therapist's details
                    try:
                        patient_profile = user.patient_profile
                        if patient_profile.therapist != therapist_profile:
                            return Response(
                                {'detail': 'You can only view your connected therapist.'}, 
                                status=status.HTTP_403_FORBIDDEN
                            )
                    except PatientProfile.DoesNotExist:
                        return Response(
                            {'detail': 'Patient profile not found.'}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                
                # Return detailed therapist info
                return Response({
                    'therapist': {
                        'id': str(therapist_profile.user.id),
                        'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                        'email': therapist_profile.user.email,
                        'specialization': therapist_profile.specialization,
                        'clinic_name': therapist_profile.clinic_name,
                        'clinic_address': therapist_profile.clinic_address,
                        'years_of_experience': therapist_profile.years_of_experience,
                        'education': therapist_profile.education,
                        'certifications': therapist_profile.certifications,
                        'license_number': therapist_profile.license_number,
                        'patient_count': therapist_profile.get_patient_count(),
                        'created_at': therapist_profile.user.created_at,
                        'updated_at': therapist_profile.user.updated_at
                    }
                }, status=status.HTTP_200_OK)
                
            except TherapistProfile.DoesNotExist:
                return Response(
                    {'detail': 'Therapist not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get all therapists with filtering
        therapists = TherapistProfile.objects.select_related('user').all()
        
        # Apply search filter
        if search:
            therapists = therapists.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(specialization__icontains=search) |
                Q(clinic_name__icontains=search)
            )
        
        # Apply ordering
        if ordering == 'name':
            therapists = therapists.order_by('user__first_name', 'user__last_name')
        elif ordering == 'specialization':
            therapists = therapists.order_by('specialization')
        else:  # default to created_at
            therapists = therapists.order_by('-user__created_at')
        
        # Format response based on user type
        if user.user_type == 'patient':
            # Patients can only see basic info of all therapists
            therapists_data = []
            for therapist_profile in therapists:
                therapists_data.append({
                    'id': str(therapist_profile.user.id),
                    'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                    'specialization': therapist_profile.specialization,
                    'clinic_name': therapist_profile.clinic_name,
                    'years_of_experience': therapist_profile.years_of_experience,
                    'created_at': therapist_profile.user.created_at
                })
        else:
            # Therapists and admins can see more detailed info
            therapists_data = []
            for therapist_profile in therapists:
                therapists_data.append({
                    'id': str(therapist_profile.user.id),
                    'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                    'email': therapist_profile.user.email,
                    'specialization': therapist_profile.specialization,
                    'clinic_name': therapist_profile.clinic_name,
                    'years_of_experience': therapist_profile.years_of_experience,
                    'patient_count': therapist_profile.get_patient_count(),
                    'created_at': therapist_profile.user.created_at,
                    'updated_at': therapist_profile.user.updated_at
                })
        
        return Response({
            'therapists': therapists_data,
            'total_count': len(therapists_data),
            'filters_applied': {
                'search': search,
                'ordering': ordering
            }
        }, status=status.HTTP_200_OK)


@extend_schema(tags=[ 'Patient Management'])
class PatientsView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='id',
                description='Specific patient ID to get details for',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='therapist_id',
                description='Specific therapist ID to get patients for (defaults to authenticated therapist)',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='ordering',
                description='Order by: connected_at, name, created_at',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='search',
                description='Search by name or email',
                required=False,
                type=str
            )
        ],
        responses={
            200: OpenApiResponse(
                description='Patients retrieved successfully.',
                response=PatientListResponseSerializer
            ),
            403: OpenApiResponse(description='Access denied.'),
            404: OpenApiResponse(description='Patient or therapist not found.')
        },
        summary="Get Patients",
        description="Get all patients or specific patient details for a therapist. Supports filtering and ordering. If therapist_id is provided, get patients for that specific therapist (admin only), otherwise get patients for the authenticated therapist."
    )
    def get(self, request):
        user = request.user
        patient_id = request.query_params.get('id')
        therapist_id = request.query_params.get('therapist_id')
        ordering = request.query_params.get('ordering', 'connected_at')
        search = request.query_params.get('search', '')
        
        # Only therapists and admins can access this endpoint
        if user.user_type not in ['therapist', 'admin']:
            return Response(
                {'detail': 'Only therapists and admins can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Determine which therapist's patients to fetch
        if therapist_id:
            # Only admins can specify a different therapist_id
            if user.user_type != 'admin':
                return Response(
                    {'detail': 'Only admins can specify a therapist_id.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the specified therapist's profile
            try:
                therapist_profile = TherapistProfile.objects.get(user__id=therapist_id)
            except TherapistProfile.DoesNotExist:
                return Response(
                    {'detail': 'Therapist not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Use authenticated therapist's profile
            if user.user_type == 'therapist':
                try:
                    therapist_profile = user.therapist_profile
                except TherapistProfile.DoesNotExist:
                    return Response(
                        {'detail': 'Therapist profile not found.'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Admin must specify therapist_id
                return Response(
                    {'detail': 'Admin must specify therapist_id parameter.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # If specific patient ID is provided
        if patient_id:
            try:
                patient_profile = PatientProfile.objects.select_related('user').get(
                    user__id=patient_id,
                    therapist=therapist_profile
                )
                
                # Return detailed patient info
                return Response({
                    'patient': {
                        'id': str(patient_profile.user.id),
                        'name': f"{patient_profile.user.first_name} {patient_profile.user.last_name}".strip(),
                        'email': patient_profile.user.email,
                        'phone_number': patient_profile.user.phone_number,
                        'date_of_birth': patient_profile.user.date_of_birth,
                        'connected_at': patient_profile.connected_at,
                        'preferred_language': patient_profile.preferred_language,
                        'emergency_contact_name': patient_profile.emergency_contact_name,
                        'emergency_contact_phone': patient_profile.emergency_contact_phone,
                        'medical_history': patient_profile.medical_history,
                        'current_medications': patient_profile.current_medications,
                        'created_at': patient_profile.user.created_at,
                        'updated_at': patient_profile.user.updated_at
                    },
                    'therapist_info': {
                        'id': str(therapist_profile.user.id),
                        'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                        'specialization': therapist_profile.specialization,
                        'clinic_name': therapist_profile.clinic_name,
                        'therapist_pin': therapist_profile.therapist_pin
                    }
                }, status=status.HTTP_200_OK)
                
            except PatientProfile.DoesNotExist:
                return Response(
                    {'detail': f'Patient not found or not connected to therapist {therapist_profile.user.first_name} {therapist_profile.user.last_name}.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get all patients connected to this therapist
        patients = PatientProfile.objects.select_related('user').filter(therapist=therapist_profile)
        
        # Apply search filter
        if search:
            patients = patients.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Apply ordering
        if ordering == 'name':
            patients = patients.order_by('user__first_name', 'user__last_name')
        elif ordering == 'created_at':
            patients = patients.order_by('-user__created_at')
        else:  # default to connected_at
            patients = patients.order_by('-connected_at')
        
        # Format response
        patients_data = []
        for patient_profile in patients:
            patients_data.append({
                'id': str(patient_profile.user.id),
                'name': f"{patient_profile.user.first_name} {patient_profile.user.last_name}".strip(),
                'email': patient_profile.user.email,
                'phone_number': patient_profile.user.phone_number,
                'date_of_birth': patient_profile.user.date_of_birth,
                'connected_at': patient_profile.connected_at,
                'preferred_language': patient_profile.preferred_language,
                'created_at': patient_profile.user.created_at
            })
        
        return Response({
            'patients': patients_data,
            'total_count': len(patients_data),
            'therapist_info': {
                'id': str(therapist_profile.user.id),
                'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                'specialization': therapist_profile.specialization,
                'clinic_name': therapist_profile.clinic_name,
                'therapist_pin': therapist_profile.therapist_pin
            },
            'filters_applied': {
                'search': search,
                'ordering': ordering,
                'therapist_id': therapist_id
            }
        }, status=status.HTTP_200_OK)


@extend_schema(tags=[ 'Patient Management'])
class ConnectToTherapistView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PatientTherapistConnectionSerializer
    
    @extend_schema(
        request=PatientTherapistConnectionSerializer,
        responses={
            200: OpenApiResponse(description='Successfully connected to therapist.'),
            400: OpenApiResponse(description='Invalid PIN or already connected.'),
            403: OpenApiResponse(description='Only patients can connect to therapists.')
        },
        summary="Connect Patient to Therapist",
        description="Connect a patient to a therapist using the therapist's PIN."
    )
    def post(self, request):
        user = request.user
        
        # Only patients can connect to therapists
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can connect to therapists.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            therapist_pin = serializer.validated_data['therapist_pin']
            
            try:
                # Get the therapist profile using the PIN
                therapist_profile = TherapistProfile.objects.get(therapist_pin=therapist_pin)
                
                # Get or create patient profile
                patient_profile, created = PatientProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'preferred_language': 'en'
                    }
                )
                
                # Check if patient is already connected to this therapist
                if patient_profile.therapist == therapist_profile:
                    return Response(
                        {'detail': 'You are already connected to this therapist.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Connect patient to therapist
                patient_profile.therapist = therapist_profile
                patient_profile.connected_at = timezone.now()
                patient_profile.save()
                
                return Response({
                    'detail': 'Successfully connected to therapist.',
                    'therapist': {
                        'id': str(therapist_profile.user.id),
                        'name': f"{therapist_profile.user.first_name} {therapist_profile.user.last_name}".strip(),
                        'specialization': therapist_profile.specialization,
                        'clinic_name': therapist_profile.clinic_name,
                        'connected_at': patient_profile.connected_at
                    }
                }, status=status.HTTP_200_OK)
                
            except TherapistProfile.DoesNotExist:
                return Response(
                    {'detail': 'Invalid therapist PIN.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=[ 'Patient Management'])
class DisconnectFromTherapistView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    class DisconnectResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
    
    serializer_class = DisconnectResponseSerializer
    
    @extend_schema(
        responses={
            200: OpenApiResponse(description='Successfully disconnected from therapist.'),
            400: OpenApiResponse(description='Not connected to any therapist.'),
            403: OpenApiResponse(description='Only patients can disconnect from therapists.')
        },
        summary="Disconnect Patient from Therapist",
        description="Disconnect a patient from their current therapist."
    )
    def post(self, request):
        user = request.user
        
        # Only patients can disconnect from therapists
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can disconnect from therapists.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient_profile = PatientProfile.objects.get(user=user)
            
            if not patient_profile.therapist:
                return Response(
                    {'detail': 'You are not connected to any therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Disconnect from therapist
            patient_profile.therapist = None
            patient_profile.connected_at = None
            patient_profile.save()
            
            return Response({
                'detail': 'Successfully disconnected from therapist.'
            }, status=status.HTTP_200_OK)
            
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Patient profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(tags=[ 'User Management'])
class PatientProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']  # Remove PUT
    
    def get_object(self):
        patient_profile, created = PatientProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'preferred_language': 'en'}
        )
        return patient_profile
    
    def get(self, request, *args, **kwargs):
        # Only patients can access their profile
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().get(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        # Only patients can update their profile
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().patch(request, *args, **kwargs)


@extend_schema(tags=[ 'User Management'])
class TherapistProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = TherapistProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']  # Remove PUT
    
    def get_object(self):
        return get_object_or_404(TherapistProfile, user=self.request.user)
    
    def get(self, request, *args, **kwargs):
        # Only therapists can access their profile
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().get(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        # Only therapists can update their profile
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().patch(request, *args, **kwargs)