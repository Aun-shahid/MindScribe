"""Patient therapy goals views"""
from rest_framework import generics, filters
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..models import PatientGoal
from ..serializers import PatientGoalSerializer
from .permissions import IsPatient
from users.models import PatientProfile
from ..services.notification_center import create_notification


@extend_schema_view(
    get=extend_schema(
        tags=['Patient - Goals & Progress'],
        summary='List therapy goals',
        description='Get all therapy goals with optional filtering by status.',
        parameters=[
            OpenApiParameter(name='status', description='Filter by status (not_started/in_progress/completed/on_hold)', required=False, type=str),
        ]
    ),
    post=extend_schema(
        tags=['Patient - Goals & Progress'],
        summary='Create therapy goal',
        description='Set a new therapy goal with target date and milestones.'
    )
)
class PatientGoalListCreateView(generics.ListCreateAPIView):
    """
    GET: List all patient goals
    POST: Create a new goal
    """
    serializer_class = PatientGoalSerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['priority', 'target_date', 'created_at']
    ordering = ['-priority', 'target_date']
    
    def get_queryset(self):
        queryset = PatientGoal.objects.filter(patient=self.request.user)
        
        # Filter by status
        goal_status = self.request.query_params.get('status')
        if goal_status:
            queryset = queryset.filter(status=goal_status)
        
        return queryset

    def perform_create(self, serializer):
        goal = serializer.save()
        try:
            patient_profile = PatientProfile.objects.select_related('therapist__user').get(user=goal.patient)
            therapist_profile = patient_profile.therapist
            if therapist_profile and therapist_profile.user:
                create_notification(
                    recipient=therapist_profile.user,
                    notification_type='therapist_message',
                    title='New Patient Goal',
                    message=f'{goal.patient.full_name} created a new therapy goal.',
                    action_url=f'/therapist/patients/{goal.patient.id}/goals',
                    source_event='goal.created.by_patient',
                    metadata={
                        'patient_id': str(goal.patient.id),
                        'goal_id': str(goal.id),
                    },
                )
        except Exception:
            pass


@extend_schema_view(
    get=extend_schema(tags=['Patient - Goals & Progress'], summary='Get goal details'),
    put=extend_schema(tags=['Patient - Goals & Progress'], summary='Update goal (full)'),
    patch=extend_schema(tags=['Patient - Goals & Progress'], summary='Update goal progress', description='Update goal status, progress percentage, or other details.'),
    delete=extend_schema(tags=['Patient - Goals & Progress'], summary='Delete goal')
)
class PatientGoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a goal
    PATCH/PUT: Update a goal
    DELETE: Delete a goal
    """
    serializer_class = PatientGoalSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return PatientGoal.objects.filter(patient=self.request.user)
