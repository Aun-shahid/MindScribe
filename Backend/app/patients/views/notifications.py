from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from ..models import NotificationPreference, Notification, NotificationDevice
from ..serializers import (
    NotificationPreferenceSerializer,
    NotificationSerializer,
    DevicePushTokenSerializer,
    DevicePushTokenUnregisterSerializer,
)
from ..services.notification_categories import (
    VALID_NOTIFICATION_CATEGORIES,
    apply_notification_category_filter,
    build_therapist_notification_summary,
)
from .permissions import IsPatient, IsTherapist


@extend_schema(tags=['Patient Notifications'])
class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """Get or update notification preferences for the authenticated patient"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def get_object(self):
        """Get or create notification preferences for the patient"""
        preferences, created = NotificationPreference.objects.get_or_create(
            patient=self.request.user
        )
        return preferences
    
    @extend_schema(
        summary="Get notification preferences",
        description="Get the notification preferences for the authenticated patient",
        responses={200: NotificationPreferenceSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update notification preferences",
        description="Update notification preferences. Patients can enable/disable different types of notifications.",
        request=NotificationPreferenceSerializer,
        responses={200: NotificationPreferenceSerializer}
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)


@extend_schema(tags=['Patient Notifications'])
class DevicePushTokenView(APIView):
    """Register or unregister push tokens for the authenticated patient."""

    permission_classes = [permissions.IsAuthenticated, IsPatient]

    @extend_schema(
        summary="Register device push token",
        description="Registers or refreshes an Expo push token for this patient device.",
        request=DevicePushTokenSerializer,
        responses={
            200: OpenApiResponse(
                description='Push token registered',
                response={
                    'type': 'object',
                    'properties': {
                        'detail': {'type': 'string'},
                        'token_id': {'type': 'string'},
                        'is_active': {'type': 'boolean'},
                    },
                },
            )
        },
    )
    def post(self, request):
        serializer = DevicePushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        push_token = serializer.validated_data['push_token']
        device_id = serializer.validated_data.get('device_id')
        platform = serializer.validated_data.get('platform', NotificationDevice.PLATFORM_UNKNOWN)

        token, _ = NotificationDevice.objects.get_or_create(
            expo_push_token=push_token,
            defaults={
                'user': request.user,
                'device_id': device_id,
                'platform': platform,
                'is_active': True,
            },
        )

        changed_fields = []
        if token.user_id != request.user.id:
            token.user = request.user
            changed_fields.append('user')
        if token.device_id != device_id:
            token.device_id = device_id
            changed_fields.append('device_id')
        if token.platform != platform:
            token.platform = platform
            changed_fields.append('platform')
        if not token.is_active:
            token.is_active = True
            changed_fields.append('is_active')

        if changed_fields:
            changed_fields.extend(['last_seen_at', 'updated_at'])
            token.save(update_fields=changed_fields)
        else:
            token.save(update_fields=['last_seen_at', 'updated_at'])

        return Response(
            {
                'detail': 'Push token registered successfully.',
                'token_id': str(token.id),
                'is_active': token.is_active,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Unregister device push token",
        description="Deactivates a push token for this patient. If no token/device is provided, all patient tokens are deactivated.",
        request=DevicePushTokenUnregisterSerializer,
        responses={
            200: OpenApiResponse(
                description='Push token(s) unregistered',
                response={
                    'type': 'object',
                    'properties': {
                        'detail': {'type': 'string'},
                        'deactivated_count': {'type': 'integer'},
                    },
                },
            )
        },
    )
    def delete(self, request):
        serializer = DevicePushTokenUnregisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        push_token = serializer.validated_data.get('push_token')
        device_id = serializer.validated_data.get('device_id')

        queryset = NotificationDevice.objects.filter(user=request.user, is_active=True)
        if push_token:
            queryset = queryset.filter(expo_push_token=push_token)
        elif device_id:
            queryset = queryset.filter(device_id=device_id)

        deactivated_count = queryset.update(is_active=False, updated_at=timezone.now())

        return Response(
            {
                'detail': 'Push token(s) deactivated successfully.',
                'deactivated_count': deactivated_count,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Patient Notifications'])
class NotificationListView(generics.ListAPIView):
    """List all notifications for the authenticated patient"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def get_queryset(self):
        """Get notifications for the authenticated patient"""
        user = self.request.user
        is_read = self.request.query_params.get('is_read', None)
        
        queryset = Notification.objects.filter(patient=user)
        
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        return queryset.order_by('-sent_at')
    
    @extend_schema(
        summary="Get all notifications",
        description="Get all notifications for the authenticated patient. Can filter by read/unread status.",
        parameters=[
            {
                'name': 'is_read',
                'in': 'query',
                'description': 'Filter by read status (true/false)',
                'required': False,
                'schema': {'type': 'string', 'enum': ['true', 'false']}
            }
        ],
        responses={200: NotificationSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@extend_schema(tags=['Patient Notifications'])
class UnreadNotificationCountView(APIView):
    """Get count of unread notifications"""
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    @extend_schema(
        summary="Get unread notification count",
        description="Get the count of unread notifications for the authenticated patient",
        responses={
            200: OpenApiResponse(
                description='Unread count',
                response={'type': 'object', 'properties': {'unread_count': {'type': 'integer'}}}
            )
        }
    )
    def get(self, request):
        unread_count = Notification.objects.filter(
            patient=request.user,
            is_read=False
        ).count()
        
        return Response({'unread_count': unread_count})


@extend_schema(tags=['Patient Notifications'])
class MarkNotificationReadView(APIView):
    """Mark a notification as read"""
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    @extend_schema(
        summary="Mark notification as read",
        description="Mark a specific notification as read",
        responses={
            200: NotificationSerializer,
            404: OpenApiResponse(description='Notification not found')
        }
    )
    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                patient=request.user
            )
            notification.mark_as_read()
            serializer = NotificationSerializer(notification)
            return Response(serializer.data)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(tags=['Patient Notifications'])
class MarkAllNotificationsReadView(APIView):
    """Mark all notifications as read"""
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    @extend_schema(
        summary="Mark all notifications as read",
        description="Mark all unread notifications as read for the authenticated patient",
        responses={
            200: OpenApiResponse(
                description='All marked as read',
                response={'type': 'object', 'properties': {'marked_count': {'type': 'integer'}}}
            )
        }
    )
    def post(self, request):
        updated = Notification.objects.filter(
            patient=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({'marked_count': updated})


@extend_schema(tags=['Patient Notifications'])
class DeleteNotificationView(generics.DestroyAPIView):
    """Delete a notification"""
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def get_queryset(self):
        return Notification.objects.filter(patient=self.request.user)
    
    @extend_schema(
        summary="Delete notification",
        description="Delete a specific notification",
        responses={
            204: OpenApiResponse(description='Notification deleted'),
            404: OpenApiResponse(description='Notification not found')
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


@extend_schema(tags=['Therapist Notifications'])
class TherapistNotificationListView(generics.ListAPIView):
    """List all notifications for the authenticated therapist"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    def get_queryset(self):
        user = self.request.user
        is_read = self.request.query_params.get('is_read', None)
        category = self.request.query_params.get('category', None)

        queryset = Notification.objects.filter(patient=user)

        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)

        if category:
            queryset = apply_notification_category_filter(queryset, category)

        return queryset.order_by('-sent_at')

    @extend_schema(
        summary="Get therapist notifications",
        description="Get all notifications for the authenticated therapist. Can filter by read/unread status.",
        parameters=[
            {
                'name': 'is_read',
                'in': 'query',
                'description': 'Filter by read status (true/false)',
                'required': False,
                'schema': {'type': 'string', 'enum': ['true', 'false']}
            },
            {
                'name': 'category',
                'in': 'query',
                'description': 'Filter therapist notifications by tab/category.',
                'required': False,
                'schema': {'type': 'string', 'enum': sorted(list(VALID_NOTIFICATION_CATEGORIES))}
            }
        ],
        responses={200: NotificationSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@extend_schema(tags=['Therapist Notifications'])
class TherapistNotificationSummaryView(APIView):
    """Get therapist notification counts grouped for dashboard/tabs."""
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    @extend_schema(
        summary="Get therapist notification summary",
        description="Return grouped notification counts for therapist dashboard cards and notification tabs.",
        responses={
            200: OpenApiResponse(
                description='Notification summary',
                response={
                    'type': 'object',
                    'properties': {
                        'total_notifications': {'type': 'integer'},
                        'unread_notifications': {'type': 'integer'},
                        'session_notifications': {'type': 'integer'},
                        'session_unread_notifications': {'type': 'integer'},
                        'mood_notifications': {'type': 'integer'},
                        'mood_unread_notifications': {'type': 'integer'},
                        'mood_alert_patients': {'type': 'integer'},
                        'other_notifications': {'type': 'integer'},
                    },
                }
            )
        }
    )
    def get(self, request):
        queryset = Notification.objects.filter(patient=request.user)
        return Response(build_therapist_notification_summary(queryset))


@extend_schema(tags=['Therapist Notifications'])
class TherapistUnreadNotificationCountView(APIView):
    """Get unread notification count for therapist"""
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    @extend_schema(
        summary="Get therapist unread notification count",
        description="Get the count of unread notifications for the authenticated therapist",
        responses={
            200: OpenApiResponse(
                description='Unread count',
                response={'type': 'object', 'properties': {'unread_count': {'type': 'integer'}}}
            )
        }
    )
    def get(self, request):
        unread_count = Notification.objects.filter(
            patient=request.user,
            is_read=False
        ).count()

        return Response({'unread_count': unread_count})


@extend_schema(tags=['Therapist Notifications'])
class TherapistMarkNotificationReadView(APIView):
    """Mark a therapist notification as read"""
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    @extend_schema(
        summary="Mark therapist notification as read",
        description="Mark a specific therapist notification as read",
        responses={
            200: NotificationSerializer,
            404: OpenApiResponse(description='Notification not found')
        }
    )
    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                patient=request.user
            )
            notification.mark_as_read()
            serializer = NotificationSerializer(notification)
            return Response(serializer.data)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(tags=['Therapist Notifications'])
class TherapistMarkAllNotificationsReadView(APIView):
    """Mark all therapist notifications as read"""
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    @extend_schema(
        summary="Mark all therapist notifications as read",
        description="Mark all unread notifications as read for the authenticated therapist",
        responses={
            200: OpenApiResponse(
                description='All marked as read',
                response={'type': 'object', 'properties': {'marked_count': {'type': 'integer'}}}
            )
        }
    )
    def post(self, request):
        updated = Notification.objects.filter(
            patient=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())

        return Response({'marked_count': updated})


@extend_schema(tags=['Therapist Notifications'])
class TherapistDeleteNotificationView(generics.DestroyAPIView):
    """Delete a therapist notification"""
    permission_classes = [permissions.IsAuthenticated, IsTherapist]

    def get_queryset(self):
        return Notification.objects.filter(patient=self.request.user)

    @extend_schema(
        summary="Delete therapist notification",
        description="Delete a specific therapist notification",
        responses={
            204: OpenApiResponse(description='Notification deleted'),
            404: OpenApiResponse(description='Notification not found')
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
