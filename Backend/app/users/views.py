from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from .models import PatientProfile, TherapistProfile, ConnectionRequest
from .serializers import (
    PatientTherapistConnectionSerializer, TherapistInfoSerializer,
    PatientProfileSerializer, TherapistProfileSerializer,
    PatientListResponseSerializer, ConnectionRequestSerializer,
    ConnectionRequestCreateSerializer, ConnectionRequestAcceptSerializer,
    ConnectionRequestRejectSerializer, MergeablePatientSerializer
)
from patients.services.notification_center import create_notification


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
    """Create a connection request to a therapist (uses new request workflow)"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=ConnectionRequestCreateSerializer,
        responses={
            201: OpenApiResponse(description='Connection request created successfully.'),
            400: OpenApiResponse(description='Invalid PIN, already connected, or pending request exists.'),
            403: OpenApiResponse(description='Only patients can request connections.')
        },
        summary="Request Connection to Therapist",
        description="Create a connection request to a therapist using their PIN. The therapist must approve the request."
    )
    def post(self, request):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can request connections to therapists.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ConnectionRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        therapist_pin = serializer.validated_data['therapist_pin']
        message = serializer.validated_data.get('message', '')
        
        try:
            therapist_profile = TherapistProfile.objects.get(therapist_pin=therapist_pin)
            
            # Check if patient is already connected to this therapist
            try:
                patient_profile = request.user.patient_profile
                if patient_profile.therapist == therapist_profile:
                    return Response(
                        {'detail': 'You are already connected to this therapist.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except PatientProfile.DoesNotExist:
                pass
            
            # Check if there's already a pending request
            existing_request = ConnectionRequest.objects.filter(
                patient_user=request.user,
                therapist=therapist_profile,
                status='pending'
            ).first()
            
            if existing_request:
                return Response(
                    {'detail': 'You already have a pending connection request to this therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if therapist can accept new patients
            if not therapist_profile.can_accept_new_patients():
                return Response(
                    {'detail': 'This therapist is not accepting new patients at this time.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create connection request
            connection_request = ConnectionRequest.objects.create(
                patient_user=request.user,
                therapist=therapist_profile,
                message=message,
                status='pending'
            )

            try:
                create_notification(
                    recipient=therapist_profile.user,
                    notification_type='general',
                    title='New Connection Request',
                    message=f'{request.user.full_name} requested to connect with you.',
                    action_url='/users/connection-requests',
                    source_event='connection.request.created',
                    metadata={
                        'request_id': str(connection_request.id),
                        'patient_id': str(request.user.id),
                    },
                )
            except Exception:
                pass
            
            return Response({
                'detail': 'Connection request sent successfully. Please wait for the therapist to respond.',
                'request': ConnectionRequestSerializer(connection_request).data
            }, status=status.HTTP_201_CREATED)
            
        except TherapistProfile.DoesNotExist:
            return Response(
                {'detail': 'Invalid therapist PIN.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(tags=['Patient Management'])
class DisconnectFromTherapistView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None # Explicitly state no serializer is used
    
    @extend_schema(
        request=None,
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

            therapist_profile = patient_profile.therapist
            
            try:
                create_notification(
                    recipient=therapist_profile.user,
                    notification_type='general',
                    title='Patient Disconnected',
                    message=f'{request.user.full_name} has disconnected from your care.',
                    action_url='/users/patients',
                    source_event='patient.connection.disconnected',
                    metadata={
                        'patient_id': str(request.user.id),
                        'therapist_id': str(therapist_profile.user.id),
                    },
                )
            except Exception:
                pass

            # Disconnect from therapist
            patient_profile.therapist = None
            patient_profile.connected_at = None
            patient_profile.save()
            
            return Response({'detail': 'Successfully disconnected from therapist.'}, status=status.HTTP_200_OK)
            
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=['Patient Management'])
class DisconnectPatientFromTherapistView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(description='Successfully disconnected patient from therapist.'),
            400: OpenApiResponse(description='Patient is not connected to this therapist.'),
            403: OpenApiResponse(description='Only therapists can disconnect patients.'),
            404: OpenApiResponse(description='Patient profile not found.')
        },
        summary="Disconnect Patient from Therapist",
        description="Disconnect a patient from the authenticated therapist and notify the patient."
    )
    def post(self, request, patient_id):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can disconnect patients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            therapist_profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'detail': 'Therapist profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            patient_profile = PatientProfile.objects.select_related('user', 'therapist__user').get(
                user__id=patient_id,
                therapist=therapist_profile,
            )
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Patient not found or not connected to you.'},
                status=status.HTTP_404_NOT_FOUND
            )

        patient_user = patient_profile.user
        therapist_name = request.user.full_name

        patient_profile.therapist = None
        patient_profile.connected_at = None
        patient_profile.save(update_fields=['therapist', 'connected_at'])

        try:
            create_notification(
                recipient=patient_user,
                notification_type='general',
                title='Disconnected from Therapist',
                message=f'Dr. {therapist_name} has ended your therapy connection.',
                action_url='/users/therapists',
                source_event='therapist.connection.disconnected',
                metadata={
                    'patient_id': str(patient_user.id),
                    'therapist_id': str(therapist_profile.user.id),
                },
            )
        except Exception:
            pass

        return Response(
            {
                'detail': 'Patient disconnected successfully.',
                'patient': {
                    'id': str(patient_user.id),
                    'name': patient_user.full_name,
                },
            },
            status=status.HTTP_200_OK,
        )


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
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'therapist':
            self.permission_denied(
                request,
                message='Only therapists can access this endpoint.',
            )


@extend_schema(tags=['Connection Requests'])
class ConnectionRequestsListView(APIView):
    """List all connection requests for a therapist"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', description='Filter by status: pending, accepted, merged, rejected', required=False, type=str),
        ],
        responses={
            200: OpenApiResponse(description='Connection requests retrieved successfully.'),
            403: OpenApiResponse(description='Only therapists can view connection requests.')
        },
        summary="List Connection Requests",
        description="Get all connection requests for the authenticated therapist."
    )
    def get(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can view connection requests.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'detail': 'Therapist profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        status_filter = request.query_params.get('status')
        
        requests_qs = ConnectionRequest.objects.filter(therapist=therapist_profile).select_related('patient_user')
        
        if status_filter:
            requests_qs = requests_qs.filter(status=status_filter)
        
        # Order by created_at descending (most recent first)
        requests_qs = requests_qs.order_by('-created_at')
        
        # Get mergeable patients (existing patients connected to this therapist)
        existing_patients = PatientProfile.objects.filter(therapist=therapist_profile).select_related('user')
        mergeable_patients = [
            {
                'id': str(p.user.id),
                'name': p.user.full_name,
                'email': p.user.email
            }
            for p in existing_patients
        ]
        
        requests_data = []
        for req in requests_qs:
            requests_data.append({
                'id': str(req.id),
                'patient_name': req.patient_user.full_name,
                'patient_email': req.patient_user.email,
                'patient_user_id': str(req.patient_user.id),
                'message': req.message,
                'status': req.status,
                'expires_at': req.expires_at,
                'created_at': req.created_at,
                'updated_at': req.updated_at,
                'merged_with_patient_id': str(req.merged_with_patient.user.id) if req.merged_with_patient else None
            })
        
        return Response({
            'connection_requests': requests_data,
            'total_count': len(requests_data),
            'mergeable_patients': mergeable_patients,
            'filters_applied': {'status': status_filter}
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Connection Requests'])
class ConnectionRequestActionView(APIView):
    """Accept, merge, or reject a connection request"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=ConnectionRequestAcceptSerializer,
        responses={
            200: OpenApiResponse(description='Connection request accepted. Patient connected.'),
            400: OpenApiResponse(description='Invalid action or request already processed.'),
            403: OpenApiResponse(description='Only therapists can manage connection requests.'),
            404: OpenApiResponse(description='Connection request not found.')
        },
        summary="Accept Connection Request",
        description="Accept a pending connection request and create a new patient connection."
    )
    def post(self, request, request_id):
        """Accept - creates new patient connection"""
        return self._handle_action(request, request_id, 'accept')
    
    @extend_schema(
        request=ConnectionRequestRejectSerializer,
        responses={
            200: OpenApiResponse(description='Connection request rejected.'),
            400: OpenApiResponse(description='Request already processed.'),
            403: OpenApiResponse(description='Only therapists can manage connection requests.'),
            404: OpenApiResponse(description='Connection request not found.')
        },
        summary="Reject Connection Request",
        description="Reject a pending connection request."
    )
    def delete(self, request, request_id):
        """Reject - marks request as rejected"""
        return self._handle_action(request, request_id, 'reject')
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='merge_with_patient_id', description='ID of existing patient to merge with', required=True, type=str),
        ],
        responses={
            200: OpenApiResponse(description='Connection request merged with existing patient.'),
            400: OpenApiResponse(description='Invalid merge target or request already processed.'),
            403: OpenApiResponse(description='Only therapists can manage connection requests.'),
            404: OpenApiResponse(description='Connection request or merge target not found.')
        },
        summary="Merge Connection Request",
        description="Merge a connection request with an existing patient profile."
    )
    def put(self, request, request_id):
        """Merge - link requesting user to existing patient profile"""
        return self._handle_action(request, request_id, 'merge')
    
    def _handle_action(self, request, request_id, action):
        """Handle connection request actions"""
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can manage connection requests.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'detail': 'Therapist profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            connection_request = ConnectionRequest.objects.get(
                id=request_id, 
                therapist=therapist_profile
            )
        except ConnectionRequest.DoesNotExist:
            return Response(
                {'detail': 'Connection request not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if connection_request.status != 'pending':
            return Response(
                {'detail': f'This request has already been {connection_request.status}.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action == 'accept':
            return self._accept_request(connection_request, therapist_profile)
        elif action == 'reject':
            return self._reject_request(connection_request, request.data.get('reason', ''))
        elif action == 'merge':
            merge_with_patient_id = request.data.get('merge_with_patient_id')
            if not merge_with_patient_id:
                return Response(
                    {'detail': 'merge_with_patient_id is required for merge action.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            return self._merge_request(connection_request, therapist_profile, merge_with_patient_id)
        
        return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)
    
    def _accept_request(self, connection_request, therapist_profile):
        """Accept request and create patient connection"""
        patient_user = connection_request.patient_user
        
        # Get or create patient profile
        patient_profile, created = PatientProfile.objects.get_or_create(
            user=patient_user,
            defaults={'preferred_language': 'en'}
        )
        
        # Connect to therapist
        patient_profile.therapist = therapist_profile
        patient_profile.connected_at = timezone.now()
        patient_profile.save()
        
        # Update connection request
        connection_request.status = 'accepted'
        connection_request.save()

        try:
            create_notification(
                recipient=patient_user,
                notification_type='general',
                title='Connection Request Accepted',
                message=f'Dr. {therapist_profile.user.full_name} accepted your connection request.',
                action_url='/users/therapists',
                source_event='connection.request.accepted',
                metadata={
                    'request_id': str(connection_request.id),
                    'therapist_id': str(therapist_profile.user.id),
                },
            )
        except Exception:
            pass
        
        return Response({
            'detail': 'Connection request accepted. Patient is now connected.',
            'patient': {
                'id': str(patient_user.id),
                'name': patient_user.full_name,
                'email': patient_user.email,
                'connected_at': patient_profile.connected_at
            }
        }, status=status.HTTP_200_OK)
    
    def _reject_request(self, connection_request, reason=''):
        """Reject the connection request"""
        connection_request.status = 'rejected'
        connection_request.save()

        try:
            create_notification(
                recipient=connection_request.patient_user,
                notification_type='general',
                title='Connection Request Rejected',
                message='Your connection request was declined by the therapist.',
                action_url='/users/therapists',
                source_event='connection.request.rejected',
                metadata={
                    'request_id': str(connection_request.id),
                    'reason': reason or '',
                },
            )
        except Exception:
            pass
        
        return Response({
            'detail': 'Connection request rejected.',
            'request_id': str(connection_request.id)
        }, status=status.HTTP_200_OK)
    
    def _merge_request(self, connection_request, therapist_profile, merge_with_patient_id):
        """Merge request with existing patient"""
        try:
            existing_patient = PatientProfile.objects.get(
                user__id=merge_with_patient_id,
                therapist=therapist_profile
            )
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Target patient not found or not connected to you.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        requesting_user = connection_request.patient_user
        
        # Create or update profile for requesting user, linking them as the same "patient entity"
        # The merge essentially means both accounts now point to the same therapist
        patient_profile, created = PatientProfile.objects.get_or_create(
            user=requesting_user,
            defaults={'preferred_language': 'en'}
        )
        
        patient_profile.therapist = therapist_profile
        patient_profile.connected_at = timezone.now()
        patient_profile.save()
        
        # Update connection request with merge info
        connection_request.status = 'merged'
        connection_request.merged_with_patient = existing_patient
        connection_request.save()

        try:
            create_notification(
                recipient=requesting_user,
                notification_type='general',
                title='Connection Request Merged',
                message=f'Your request was merged with existing patient records by Dr. {therapist_profile.user.full_name}.',
                action_url='/users/therapists',
                source_event='connection.request.merged',
                metadata={
                    'request_id': str(connection_request.id),
                    'merged_with_patient_id': str(existing_patient.user.id),
                },
            )
        except Exception:
            pass
        
        return Response({
            'detail': f'Connection request merged with existing patient {existing_patient.user.full_name}.',
            'merged_patient': {
                'id': str(existing_patient.user.id),
                'name': existing_patient.user.full_name
            },
            'new_patient': {
                'id': str(requesting_user.id),
                'name': requesting_user.full_name,
                'connected_at': patient_profile.connected_at
            }
        }, status=status.HTTP_200_OK)