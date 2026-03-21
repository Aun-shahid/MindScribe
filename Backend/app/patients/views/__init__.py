"""
Patient Views Module

This module contains all views for the patient app, organized by feature.
"""

from .permissions import IsPatient, IsTherapist
from .mood import MoodEntryListCreateView, MoodEntryDetailView, TodayMoodView, MoodAnalyticsView, WeeklyMoodTrendView
from .journal import (
    JournalEntryListCreateView, JournalEntryDetailView, JournalAnalyticsView,
    TodayJournalPromptView, JournalPromptsListView
)
from .emotional_insights import (
    EmotionalInsightListCreateView, EmotionalInsightDetailView, EmotionalAnalyticsView
)
from .relaxation import (
    RelaxationContentListView, RelaxationContentDetailView,
    RelaxationSessionListCreateView, RelaxationSessionDetailView,
    RelaxationAnalyticsView, RelaxationTipsListView
)
from .goals import PatientGoalListCreateView, PatientGoalDetailView
from .inspiration import DailyInspirationView
from .dashboard import PatientDashboardView
from .activities import ActivityLogListCreateView, ActivityLogDetailView, ActivityAnalyticsView

from .notifications import (
    NotificationPreferenceView, NotificationListView, UnreadNotificationCountView,
    MarkNotificationReadView, MarkAllNotificationsReadView, DeleteNotificationView,
    DevicePushTokenView, PushDiagnosticsView,
    TherapistNotificationListView, TherapistUnreadNotificationCountView,
    TherapistMarkNotificationReadView, TherapistMarkAllNotificationsReadView,
    TherapistDeleteNotificationView, TherapistNotificationSummaryView
)

__all__ = [
    'IsPatient',
    'IsTherapist',
    # Mood views
    'MoodEntryListCreateView',
    'MoodEntryDetailView',
    'TodayMoodView',
    'MoodAnalyticsView',
    'WeeklyMoodTrendView',
    # Journal views
    'JournalEntryListCreateView',
    'JournalEntryDetailView',
    'JournalAnalyticsView',
    'TodayJournalPromptView',
    'JournalPromptsListView',
    # Emotional insights views
    'EmotionalInsightListCreateView',
    'EmotionalInsightDetailView',
    'EmotionalAnalyticsView',
    # Relaxation views
    'RelaxationContentListView',
    'RelaxationContentDetailView',
    'RelaxationSessionListCreateView',
    'RelaxationSessionDetailView',
    'RelaxationAnalyticsView',
    'RelaxationTipsListView',
    # Goals views
    'PatientGoalListCreateView',
    'PatientGoalDetailView',
     # Activity views
    'ActivityLogListCreateView',
    'ActivityLogDetailView',
    'ActivityAnalyticsView',
    # Inspiration views
    'DailyInspirationView',
    # Dashboard views
    'PatientDashboardView',
    # Notification views
    'NotificationPreferenceView',
    'NotificationListView',
    'UnreadNotificationCountView',
    'MarkNotificationReadView',
    'MarkAllNotificationsReadView',
    'DeleteNotificationView',
    'DevicePushTokenView',
    'PushDiagnosticsView',
    'TherapistNotificationListView',
    'TherapistUnreadNotificationCountView',
    'TherapistMarkNotificationReadView',
    'TherapistMarkAllNotificationsReadView',
    'TherapistDeleteNotificationView',
    'TherapistNotificationSummaryView',
]
