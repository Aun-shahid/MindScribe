"""
Session status classification utility module.

Provides dynamic session status classification based on current date/time
and time-based notification logic.
"""

from django.utils import timezone
from datetime import timedelta
from enum import Enum


class SessionStatusCategory(str, Enum):
    """Session status categories based on scheduling."""
    UPCOMING = "upcoming"           # More than 24 hours away
    TOMORROW_SOON = "tomorrow_soon" # Within 24 hours (but not today)
    TODAY = "today"                 # On the current day
    ONGOING = "ongoing"             # Currently in progress
    COMPLETED = "completed"         # Finished
    CANCELLED = "cancelled"         # Cancelled
    NO_SHOW = "no_show"             # Did not show up


def classify_session_status(session):
    """
    Classify a session's status based on current date/time and session attributes.
    
    Args:
        session: A Session object with scheduled_date and status fields
        
    Returns:
        SessionStatusCategory enum value representing the session status
    """
    # Handle terminal states first
    if session.status == 'CANCELLED':
        return SessionStatusCategory.CANCELLED
    if session.status == 'NO_SHOW':
        return SessionStatusCategory.NO_SHOW
    if session.status == 'COMPLETED':
        return SessionStatusCategory.COMPLETED
    
    # Handle sessions in progress
    if session.status == 'IN_PROGRESS':
        return SessionStatusCategory.ONGOING
    
    # Classification based on scheduled_date
    now = timezone.now()
    session_time = session.scheduled_date
    
    if not session_time:
        # If no scheduled time, treat as upcoming
        return SessionStatusCategory.UPCOMING
    
    # Calculate time difference
    time_until_session = session_time - now
    hours_until = time_until_session.total_seconds() / 3600
    
    # Get local timezone date boundaries
    now_local = timezone.localtime(now)
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    session_local = timezone.localtime(session_time)
    session_start = session_local.replace(hour=0, minute=0, second=0, microsecond=0)
    session_end = session_start + timedelta(days=1)
    
    # Check if session is today
    if today_start <= session_local < today_end:
        return SessionStatusCategory.TODAY
    
    # Check if session is within 24 hours but not today (tomorrow/upcoming soon)
    if 0 < hours_until <= 24 and not (today_start <= session_local < today_end):
        return SessionStatusCategory.TOMORROW_SOON
    
    # Session is more than 24 hours away
    if hours_until > 24:
        return SessionStatusCategory.UPCOMING
    
    # Fallback for edge cases
    return SessionStatusCategory.UPCOMING


def get_hours_until_session(session):
    """
    Calculate hours remaining until session starts.
    
    Args:
        session: A Session object with scheduled_date field
        
    Returns:
        float: Number of hours until session, or None if session time is not set
    """
    if not session.scheduled_date:
        return None
    
    now = timezone.now()
    time_until = session.scheduled_date - now
    return time_until.total_seconds() / 3600


def is_session_today(session):
    """Check if session is scheduled for today."""
    return classify_session_status(session) == SessionStatusCategory.TODAY


def is_session_tomorrow_or_soon(session):
    """Check if session is within next 24 hours but not today."""
    return classify_session_status(session) == SessionStatusCategory.TOMORROW_SOON


def is_session_within_24_hours(session):
    """Check if session is within the next 24 hours (includes today and tomorrow)."""
    status = classify_session_status(session)
    return status in (SessionStatusCategory.TODAY, SessionStatusCategory.TOMORROW_SOON)


def is_session_upcoming(session):
    """Check if session is more than 24 hours away."""
    return classify_session_status(session) == SessionStatusCategory.UPCOMING
