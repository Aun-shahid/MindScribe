from django.urls import path
from .views import (
    # Mood Tracking
    MoodEntryListCreateView, MoodEntryDetailView, TodayMoodView, MoodAnalyticsView, WeeklyMoodTrendView,
    
    # Journal
    JournalEntryListCreateView, JournalEntryDetailView, JournalAnalyticsView,
    TodayJournalPromptView, JournalPromptsListView,
    
    # Emotional Exploration
    EmotionalInsightListCreateView, EmotionalInsightDetailView, EmotionalAnalyticsView,
    
    # Relaxation
    RelaxationContentListView, RelaxationContentDetailView,
    RelaxationSessionListCreateView, RelaxationSessionDetailView, RelaxationAnalyticsView,
    RelaxationTipsListView,
    
    # Goals
    PatientGoalListCreateView, PatientGoalDetailView,

    # Activities
    ActivityLogListCreateView, ActivityLogDetailView, ActivityAnalyticsView,
    
    # Inspiration
    DailyInspirationView,
    
    # Dashboard
    PatientDashboardView,
    
    # Notifications
    NotificationPreferenceView, NotificationListView, UnreadNotificationCountView,
    MarkNotificationReadView, MarkAllNotificationsReadView, DeleteNotificationView,
    DevicePushTokenView, PushDiagnosticsView,
    TherapistNotificationListView, TherapistUnreadNotificationCountView,
    TherapistMarkNotificationReadView, TherapistMarkAllNotificationsReadView,
    TherapistDeleteNotificationView, TherapistNotificationSummaryView,
    InternalSessionAiReadyNotificationView
)


app_name = 'patients'

urlpatterns = [
    # Dashboard
    path('dashboard/', PatientDashboardView.as_view(), name='dashboard'),
    
    # Mood Tracking
    path('mood/today/', TodayMoodView.as_view(), name='mood-today'),
    path('mood/analytics/', MoodAnalyticsView.as_view(), name='mood-analytics'),
    path('mood/weekly-trend/', WeeklyMoodTrendView.as_view(), name='mood-weekly-trend'),
    path('mood/', MoodEntryListCreateView.as_view(), name='mood-list'),
    path('mood/<uuid:pk>/', MoodEntryDetailView.as_view(), name='mood-detail'),
    
    # Journal
    path('journal/prompt/today/', TodayJournalPromptView.as_view(), name='journal-prompt-today'),
    path('journal/prompts/', JournalPromptsListView.as_view(), name='journal-prompts-list'),
    path('journal/analytics/', JournalAnalyticsView.as_view(), name='journal-analytics'),
    path('journal/', JournalEntryListCreateView.as_view(), name='journal-list'),
    path('journal/<uuid:pk>/', JournalEntryDetailView.as_view(), name='journal-detail'),
    
    # Emotional Exploration
    path('emotions/analytics/', EmotionalAnalyticsView.as_view(), name='emotions-analytics'),
    path('emotions/', EmotionalInsightListCreateView.as_view(), name='emotions-list'),
    path('emotions/<uuid:pk>/', EmotionalInsightDetailView.as_view(), name='emotions-detail'),
    
    # Relaxation
    path('relaxation/content/', RelaxationContentListView.as_view(), name='relaxation-content-list'),
    path('relaxation/content/<uuid:pk>/', RelaxationContentDetailView.as_view(), name='relaxation-content-detail'),
    path('relaxation/tips/', RelaxationTipsListView.as_view(), name='relaxation-tips'),
    path('relaxation/sessions/analytics/', RelaxationAnalyticsView.as_view(), name='relaxation-analytics'),
    path('relaxation/sessions/', RelaxationSessionListCreateView.as_view(), name='relaxation-sessions-list'),
    path('relaxation/sessions/<uuid:pk>/', RelaxationSessionDetailView.as_view(), name='relaxation-sessions-detail'),
    
    # Goals
    path('goals/', PatientGoalListCreateView.as_view(), name='goals-list'),
    path('goals/<uuid:pk>/', PatientGoalDetailView.as_view(), name='goals-detail'),
  
  # Activities
    path('activities/', ActivityLogListCreateView.as_view(), name='activities-list'),
    path('activities/<uuid:pk>/', ActivityLogDetailView.as_view(), name='activities-detail'),
    path('activities/analytics/', ActivityAnalyticsView.as_view(), name='activities-analytics'),
     

    
    # Daily Inspiration
    path('inspiration/', DailyInspirationView.as_view(), name='daily-inspiration'),
    
    # Notifications
    path('notifications/device-token/', DevicePushTokenView.as_view(), name='notification-device-token'),
    path('notifications/push-diagnostics/', PushDiagnosticsView.as_view(), name='notification-push-diagnostics'),
    path('notifications/preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('notifications/unread-count/', UnreadNotificationCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-read/', MarkAllNotificationsReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/<uuid:notification_id>/read/', MarkNotificationReadView.as_view(), name='notification-mark-read'),
    path('notifications/<uuid:pk>/', DeleteNotificationView.as_view(), name='notification-delete'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),

    # Therapist notifications
    path('therapist/notifications/summary/', TherapistNotificationSummaryView.as_view(), name='therapist-notification-summary'),
    path('therapist/notifications/unread-count/', TherapistUnreadNotificationCountView.as_view(), name='therapist-notification-unread-count'),
    path('therapist/notifications/mark-all-read/', TherapistMarkAllNotificationsReadView.as_view(), name='therapist-notification-mark-all-read'),
    path('therapist/notifications/<uuid:notification_id>/read/', TherapistMarkNotificationReadView.as_view(), name='therapist-notification-mark-read'),
    path('therapist/notifications/<uuid:pk>/', TherapistDeleteNotificationView.as_view(), name='therapist-notification-delete'),
    path('therapist/notifications/', TherapistNotificationListView.as_view(), name='therapist-notification-list'),

    # Internal AI callbacks
    path('internal/session-ai-ready/', InternalSessionAiReadyNotificationView.as_view(), name='internal-session-ai-ready'),
]
