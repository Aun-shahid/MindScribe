from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from .models import PatientProfile, TherapistProfile
from .serializers import (
    PatientTherapistConnectionSerializer, TherapistInfoSerializer,
    PatientProfileSerializer, TherapistProfileSerializer,
    PatientListResponseSerializer
)


@extend_schema(tags=['Therapist Management'])
class TherapistPinView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        responses={
            200: TherapistInfoSerializer,
            403: OpenApiResponse(description='User is not a therapist.'),
            404: OpenApiResponse(description='Therapist profile not found.')
        },
        summary="Get Therapist PIN",
        description="Retrieve the therapist's unique PIN for QR code generation."
    )
    def get(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = request.user.therapist_profile
            serializer = TherapistInfoSerializer({
                'therapist_pin': therapist_profile.therapist_pin,
                'therapist_id': str(request.user.id),
                'therapist_name': request.user.full_name,
                'specialization': therapist_profile.specialization,
                'clinic_name': therapist_profile.clinic_name,
                'patient_count': therapist_profile.get_patient_count()
            })
            return Response(serializer.data, status=status.HTTP_200_OK)
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
            OpenApiParameter(name='id', description='Specific therapist ID', required=False, type=str),
            OpenApiParameter(name='ordering', description='Order by: created_at, name, specialization', required=False, type=str),
            OpenApiParameter(name='search', description='Search by name, specialization, or clinic', required=False, type=str)
        ],
        responses={200: OpenApiResponse(description='Therapists retrieved successfully.')},
        summary="Get Therapists",
        description="Get all therapists or specific therapist details with filtering and ordering."
    )
    def get(self, request):
        therapist_id = request.query_params.get('id')
        
        if therapist_id:
            return self._get_therapist_detail(request, therapist_id)
        
        return self._get_therapists_list(request)
    
    def _get_therapist_detail(self, request, therapist_id):
        """Get detailed information for a specific therapist"""
        try:
            therapist_profile = TherapistProfile.objects.select_related('user').get(user__id=therapist_id)
            
            # Check patient permissions
            if request.user.user_type == 'patient':
                try:
                    patient_profile = request.user.patient_profile
                    if patient_profile.therapist != therapist_profile:
                        return Response(
                            {'detail': 'You can only view your connected therapist.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                except PatientProfile.DoesNotExist:
                    return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            therapist_data = self._format_therapist_data(therapist_profile, detailed=True)
            return Response({'therapist': therapist_data}, status=status.HTTP_200_OK)
            
        except TherapistProfile.DoesNotExist:
            return Response({'detail': 'Therapist not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    def _get_therapists_list(self, request):
        """Get list of therapists with filtering and ordering"""
        ordering = request.query_params.get('ordering', 'created_at')
        search = request.query_params.get('search', '')
        
        therapists = TherapistProfile.objects.select_related('user')
        
        # Apply search filter
        if search:
            therapists = therapists.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(specialization__icontains=search) |
                Q(clinic_name__icontains=search)
            )
        
        # Apply ordering
        ordering_map = {
            'name': ['user__first_name', 'user__last_name'],
            'specialization': ['specialization'],
            'created_at': ['-user__created_at']
        }
        therapists = therapists.order_by(*ordering_map.get(ordering, ['-user__created_at']))
        
        # Format response based on user permissions
        is_patient = request.user.user_type == 'patient'
        therapists_data = [
            self._format_therapist_data(tp, detailed=not is_patient) 
            for tp in therapists
        ]
        
        return Response({
            'therapists': therapists_data,
            'total_count': len(therapists_data),
            'filters_applied': {'search': search, 'ordering': ordering}
        }, status=status.HTTP_200_OK)
    
    def _format_therapist_data(self, therapist_profile, detailed=False):
        """Format therapist data based on permission level"""
        base_data = {
            'id': str(therapist_profile.user.id),
            'name': therapist_profile.user.full_name,
            'specialization': therapist_profile.specialization,
            'clinic_name': therapist_profile.clinic_name,
            'years_of_experience': therapist_profile.years_of_experience,
            'created_at': therapist_profile.user.created_at
        }
        
        if detailed:
            base_data.update({
                'email': therapist_profile.user.email,
                'clinic_address': therapist_profile.clinic_address,
                'education': therapist_profile.education,
                'certifications': therapist_profile.certifications,
                'license_number': therapist_profile.license_number,
                'patient_count': therapist_profile.get_patient_count(),
                'updated_at': therapist_profile.user.updated_at
            })
        
        return base_data


@extend_schema(tags=['Patient Management'])
class PatientsView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='id', description='Specific patient ID', required=False, type=str),
            OpenApiParameter(name='therapist_id', description='Therapist ID (admin only)', required=False, type=str),
            OpenApiParameter(name='ordering', description='Order by: connected_at, name, created_at', required=False, type=str),
            OpenApiParameter(name='search', description='Search by name or email', required=False, type=str)
        ],
        responses={200: PatientListResponseSerializer},
        summary="Get Patients",
        description="Get patients for a therapist with filtering and ordering support."
    )
    def get(self, request):
        if request.user.user_type not in ['therapist', 'admin']:
            return Response(
                {'detail': 'Only therapists and admins can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        therapist_profile = self._get_therapist_profile(request)
        if isinstance(therapist_profile, Response):
            return therapist_profile
        
        patient_id = request.query_params.get('id')
        if patient_id:
            return self._get_patient_detail(patient_id, therapist_profile)
        
        return self._get_patients_list(request, therapist_profile)
    
    def _get_therapist_profile(self, request):
        """Get the therapist profile based on request parameters and user permissions"""
        therapist_id = request.query_params.get('therapist_id')
        
        if therapist_id:
            if request.user.user_type != 'admin':
                return Response(
                    {'detail': 'Only admins can specify a therapist_id.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            try:
                return TherapistProfile.objects.get(user__id=therapist_id)
            except TherapistProfile.DoesNotExist:
                return Response({'detail': 'Therapist not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.user.user_type == 'therapist':
            try:
                return request.user.therapist_profile
            except TherapistProfile.DoesNotExist:
                return Response({'detail': 'Therapist profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(
            {'detail': 'Admin must specify therapist_id parameter.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def _get_patient_detail(self, patient_id, therapist_profile):
        """Get detailed information for a specific patient"""
        try:
            patient_profile = PatientProfile.objects.select_related('user').get(
                user__id=patient_id, therapist=therapist_profile
            )
            
            patient_data = self._format_patient_data(patient_profile, detailed=True)
            therapist_data = self._format_therapist_info(therapist_profile)
            
            return Response({
                'patient': patient_data,
                'therapist_info': therapist_data
            }, status=status.HTTP_200_OK)
            
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': f'Patient not found or not connected to therapist {therapist_profile.user.full_name}.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _get_patients_list(self, request, therapist_profile):
        """Get list of patients with filtering and ordering"""
        ordering = request.query_params.get('ordering', 'connected_at')
        search = request.query_params.get('search', '')
        
        patients = PatientProfile.objects.select_related('user').filter(therapist=therapist_profile)
        
        # Apply search filter
        if search:
            patients = patients.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Apply ordering
        ordering_map = {
            'name': ['user__first_name', 'user__last_name'],
            'created_at': ['-user__created_at'],
            'connected_at': ['-connected_at']
        }
        patients = patients.order_by(*ordering_map.get(ordering, ['-connected_at']))
        
        patients_data = [self._format_patient_data(p) for p in patients]
        
        return Response({
            'patients': patients_data,
            'total_count': len(patients_data),
            'therapist_info': self._format_therapist_info(therapist_profile),
            'filters_applied': {
                'search': search,
                'ordering': ordering,
                'therapist_id': request.query_params.get('therapist_id')
            }
        }, status=status.HTTP_200_OK)
    
    def _format_patient_data(self, patient_profile, detailed=False):
        """Format patient data"""
        base_data = {
            'id': str(patient_profile.user.id),
            'name': patient_profile.user.full_name,
            'email': patient_profile.user.email,
            'phone_number': patient_profile.user.phone_number,
            'date_of_birth': patient_profile.user.date_of_birth,
            'connected_at': patient_profile.connected_at,
            'preferred_language': patient_profile.preferred_language,
            'created_at': patient_profile.user.created_at
        }
        
        if detailed:
            base_data.update({
                'emergency_contact_name': patient_profile.emergency_contact_name,
                'emergency_contact_phone': patient_profile.emergency_contact_phone,
                'medical_history': patient_profile.medical_history,
                'current_medications': patient_profile.current_medications,
                'updated_at': patient_profile.user.updated_at
            })
        
        return base_data
    
    def _format_therapist_info(self, therapist_profile):
        """Format therapist info"""
        return {
            'id': str(therapist_profile.user.id),
            'name': therapist_profile.user.full_name,
            'specialization': therapist_profile.specialization,
            'clinic_name': therapist_profile.clinic_name,
            'therapist_pin': therapist_profile.therapist_pin
        }


@extend_schema(tags=['Patient Management'])
class ConnectToTherapistView(APIView):
    permission_classes = [IsAuthenticated]
    
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
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can connect to therapists.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = PatientTherapistConnectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        therapist_pin = serializer.validated_data['therapist_pin']
        
        try:
            therapist_profile = TherapistProfile.objects.get(therapist_pin=therapist_pin)
            
            # Get or create patient profile
            patient_profile, created = PatientProfile.objects.get_or_create(
                user=request.user,
                defaults={'preferred_language': 'en'}
            )
            
            # Check if already connected
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
                    'name': therapist_profile.user.full_name,
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


@extend_schema(tags=['Patient Management'])
class DisconnectFromTherapistView(APIView):
    permission_classes = [IsAuthenticated]
    
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
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can disconnect from therapists.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
            
            if not patient_profile.therapist:
                return Response(
                    {'detail': 'You are not connected to any therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Disconnect from therapist
            patient_profile.therapist = None
            patient_profile.connected_at = None
            patient_profile.save()
            
            return Response({'detail': 'Successfully disconnected from therapist.'}, status=status.HTTP_200_OK)
            
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=['User Management'])
class PatientProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']
    
    def get_object(self):
        patient_profile, created = PatientProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'preferred_language': 'en'}
        )
        return patient_profile
    
    def dispatch(self, request, *args, **kwargs):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().dispatch(request, *args, **kwargs)


@extend_schema(tags=['User Management'])
class TherapistProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = TherapistProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']
    
    def get_object(self):
        return get_object_or_404(TherapistProfile, user=self.request.user)
    
    def dispatch(self, request, *args, **kwargs):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().dispatch(request, *args, **kwargs)