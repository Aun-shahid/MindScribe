# Time-Based Session Notification System

## Overview

This document describes the improved time-based session notification system that has been implemented to replace the previous fixed-window approach. The new system sends tailored notifications at specific points in the session lifecycle to maximize engagement and minimize notification fatigue.

## Architecture

### Core Components

1. **Session Status Classification** (`therapy_sessions/session_status.py`)
   - Provides dynamic session categorization based on current date/time
   - Categories: UPCOMING, TOMORROW_SOON, TODAY, ONGOING, COMPLETED, CANCELLED, NO_SHOW
   - Helper functions for common time-based checks

2. **Time-Based Notification Service** (`patients/services/time_based_notifications.py`)
   - New module implementing intelligent notification triggering
   - Two main functions:
     - `send_time_based_session_reminders()`: For patients
     - `send_time_based_therapist_reminders()`: For therapists

3. **Integration Points**
   - `reminder_scheduler.py`: Updated to call new functions
   - `run_notification_scheduler.py`: Management command updated
   - `tests.py`: New comprehensive test suite

## Notification Logic

### For Patients

**24-Hour Reminder** (`session_reminder_24h`)
- Sent when session is within 24 hours AND hasn't been notified yet
- Message: "Your therapy session with Dr. [Name] is scheduled for [DateTime]. Please be prepared and join on time."
- Includes session metadata and direct link to session details

**Same-Day Reminder** (`session_reminder_same_day`)
- Sent when session is scheduled for today AND hasn't been notified yet
- Message: "Your therapy session with Dr. [Name] is today at [Time]. Please join a few minutes early."
- May be sent in addition to 24-hour reminder if both conditions apply

**Conditions**
- Patient must have `session_reminders_enabled=True` in NotificationPreference
- Session must have status in: UPCOMING, RESCHEDULED, REQUESTED
- Each notification type sent maximum once per session
- Deduplication via Notification model tracking

### For Therapists

**24-Hour Reminder** (`session_reminder_24h`)
- Sent when session is within 24 hours
- Message: "You have a session with [PatientName] scheduled for [DateTime]. Please review prior notes."
- Allows therapist to prepare in advance

**Same-Day Reminder** (`session_reminder_same_day`)
- Sent when session is scheduled for today
- Message: "You have a session with [PatientName] today at [Time]. Get ready to begin shortly."
- Time-sensitive alert for immediate preparation

## Key Features

### Intelligent Deduplication

The system prevents redundant notifications through:

1. **Per-Type Tracking**: Each notification type is tracked separately
   - `session_reminder_24h` is sent once per session
   - `session_reminder_same_day` is sent once per session

2. **Delivery Status Checking**: Only counts notifications with `delivery_status='sent'`

3. **Session State Validation**: 
   - Only considers sessions in active statuses
   - Prevents notifications for sessions outside the relevant time window

### Graceful Degradation

- Notifications wrapped in try-except blocks
- Failures logged but don't prevent other notifications
- Service continues processing remaining sessions on errors

### Timezone-Aware

- All time calculations use `timezone.localtime()` for user's local time
- Session classification respects user's timezone

## Database Considerations

### Notification Model Fields

```python
Notification:
  - patient (FK to User): Recipient
  - notification_type (str): 'session_reminder_24h', 'session_reminder_same_day', etc.
  - session_id (str): Associated session ID
  - delivery_status (str): 'sent', 'pending', 'failed'
  - title (str): Display title
  - message (str): Display message
  - metadata (JSON): Additional data (hours_until, status_category, etc.)
```

### Query Efficiency

The service optimizes queries by:
- Using `select_related()` for patient and therapist associations
- Filtering by status upfront to reduce dataset
- Checking existence before creating new Notification records

## Configuration

### Environment Variables

- `IN_APP_REMINDER_SCHEDULER_INTERVAL_SECONDS` (default: 10)
- `DISABLE_IN_APP_REMINDER_SCHEDULER` (default: false)

### Django Settings

Via NotificationPreference model:
- `session_reminders_enabled`: Toggle reminders on/off
- `session_reminder_time`: Hours before session to remind (legacy, not used in new system)

## Migration from Old System

### Breaking Changes

1. **Notification Type Constants**: 
   - Old: `'session_reminder'`
   - New: `'session_reminder_24h'`, `'session_reminder_same_day'`

2. **Return Values**: Functions return `int` (total count) instead of dict

3. **Function Names**:
   - Old: `send_session_reminder_notifications()` → New: `send_time_based_session_reminders()`
   - Old: `send_therapist_upcoming_session_notifications()` → New: `send_time_based_therapist_reminders()`

### Old Functions

The old functions are still defined in `notification_service.py` but are **NO LONGER USED** by the scheduler. They may be deprecated in future releases.

### Testing Migration

Updated test in `patients/tests.py`:
- Tests now use new functions
- Expectations updated for new notification types
- Added comprehensive test suite covering edge cases

## Implementation Details

### Session Status Classification

```python
classify_session_status(session) → SessionStatusCategory
```

Returns one of:
- `UPCOMING`: Session is more than 24 hours away
- `TOMORROW_SOON`: Session is 16-24 hours away (deprecated classification)
- `TODAY`: Session is on current date
- `ONGOING`: Session is currently in progress
- `COMPLETED`: Session has finished
- `CANCELLED`: Session was cancelled
- `NO_SHOW`: Session was not attended

### Helper Functions

```python
is_session_within_24_hours(session) → bool
is_session_today(session) → bool
is_session_tomorrow_or_soon(session) → bool
get_hours_until_session(session) → float | None
```

## Performance

### Recommended Scheduler Interval

- **Development**: 60 seconds (allows testing multiple cycles)
- **Production**: 300-600 seconds (5-10 minutes)
- **Railway Deployment**: 60 seconds (typical setting)

### Query Load

For N patients and M upcoming sessions:
- Worst case: O(N + M) database queries
- Typical case: 2-3 queries per run
- Uses database indices on `scheduled_date` and `status` fields

## Logging

All operations are logged at appropriate levels:

- `logger.info()`: Reminder totals sent per category
- `logger.exception()`: Failed individual notifications
- `logger.debug()`: Full tick completion summaries

Log messages include:
```
Patient session reminders sent: 24h=3, same_day=2, total=5
Therapist session reminders sent: 24h=4, same_day=1, total=5
Reminder tick complete (session=5 therapist_session=5 goal=2 mood=1 journal=1)
```

## Future Enhancements

1. **Customizable Time Windows**: Allow patients to choose when they want reminders
2. **Escalation Alerts**: Multiple reminders for missed sessions
3. **Session Type Reminders**: Different message templates for different session types
4. **Therapist Preferences**: Per-therapist notification settings
5. **Analytics**: Track notification delivery and engagement metrics
6. **SMS Integration**: SMS reminders for critical alerts

## Troubleshooting

### No Notifications Being Sent

1. Check `NotificationPreference.session_reminders_enabled` is True
2. Verify session status is in: UPCOMING, RESCHEDULED, REQUESTED
3. Confirm `DISABLE_IN_APP_REMINDER_SCHEDULER` is not set to true
4. Check scheduler is running: Look for "reminder tick" log messages

### Duplicate Notifications

1. Check if notification types are different (24h vs same-day)
2. Verify `delivery_status` is 'sent' in Notification records
3. Review recent ticket history for manual notification sending

### Scheduler Not Running

1. Verify not running with `PROCESS_TYPE=worker` or `PROCESS_TYPE=beat`
2. Check `DISABLE_IN_APP_REMINDER_SCHEDULER` environment variable
3. Ensure Django app is fully initialized
4. Look for "In-app reminder scheduler started" in logs

## API Reference

### Main Functions

```python
# Send reminders to patients
send_time_based_session_reminders() → int
  Returns: Total number of notifications sent
  
# Send reminders to therapists  
send_time_based_therapist_reminders() → int
  Returns: Total number of notifications sent
```

### Supporting Functions

```python
_has_notification_been_sent(session, notification_type) → bool
_format_session_datetime(value, fmt="%B %d at %I:%M %p") → str
```

## Related Files

- Session Status Module: `therapy_sessions/session_status.py`
- Time-Based Notifications: `patients/services/time_based_notifications.py`
- Scheduler: `patients/services/reminder_scheduler.py`
- Management Command: `patients/management/commands/run_notification_scheduler.py`
- Tests: `patients/tests.py` (TimeBasedSessionRemindersTests class)
- Old Notification Service: `patients/services/notification_service.py` (deprecated for session reminders)

## Version History

- **v2.0** (Current): Time-based notification system with 24h and same-day tiers
- **v1.0** (Deprecated): Fixed-window notification system
