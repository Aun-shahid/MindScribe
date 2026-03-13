# Patient Notification System

## Overview
The notification system allows patients to receive various types of notifications about their therapy sessions, daily wellness reminders, and other important updates. Patients can customize which notifications they receive through their notification preferences.

## Central Notification Service

All new notifications should now be created through a single utility in `patients/services/notification_center.py`:

- `create_notification(...)` for creating/storing a notification and optionally sending real-time updates
- `build_notification_payload(...)` for constructing the detailed notification object
- `push_notification_to_websocket(...)` for direct live delivery

This centralizes notification creation similar to logging patterns, so each event source can call one utility instead of directly writing notification records.

## Live WebSocket Notifications

- **WebSocket URL**: `ws/notifications/`
- **Authentication**: Uses Django Channels `AuthMiddlewareStack` (user must be authenticated)
- **Group format**: `notifications_user_<user_id>`
- **Event sent to frontend**: `notification.created`

Example payload:

```json
{
  "event": "notification.created",
  "event_id": "uuid",
  "created_at": "2026-03-03T12:00:00Z",
  "createdAt": "2026-03-03T12:00:00Z",
  "recipientId": "uuid",
  "recipient": {
    "id": "uuid",
    "name": "Dr. Therapist",
    "user_type": "therapist"
  },
  "notification": {
    "id": "uuid",
    "notification_type": "therapist_message",
    "type": "alert",
    "title": "Mood trend alert: Patient Name",
    "message": "Patient Name has a downward mood trend (4.0 → 2.8).",
    "relatedEntityId": "<patient_id>",
    "read": false,
    "action_url": "/therapist/patients/<patient_id>/mood",
    "priority": "high",
    "source_event": "mood.trend.downward",
    "metadata": {
      "patient_id": "uuid"
    }
  }
}
```

## Mood Downward Trend Alerts

When a patient logs mood, the backend now checks recent daily mood intensity trend. If the trend is downward beyond threshold, it creates therapist alerts through the central utility and pushes them live to connected therapist WebSocket clients.

## Three Bad Moods Alert Rule

In addition to trend-based alerts, the backend now also sends a therapist alert when the patient's last 3 distinct mood days are all bad moods.

Bad moods used by this rule:
- sad
- angry
- anxious
- overwhelmed
- stressed

This rule is implemented in `patients/views/mood.py` and uses the same centralized `create_notification(...)` flow for persistence + realtime delivery.

## Features

### Notification Types
1. **Session Reminders** - Configurable reminders before upcoming therapy sessions
2. **Session Summary** - Notification when therapist completes session summary
3. **Session Approved** - Notification when session request is approved
4. **Session Cancelled** - Notification when session is cancelled
5. **Mood Reminder** - Daily reminder to log mood (default 8:00 PM)
6. **Journal Reminder** - Daily reminder to write journal entry (default 9:00 PM)
7. **Goal Reminder** - Reminders about therapy goals
8. **Therapist Message** - Messages from therapist
9. **General** - General notifications

### Notification Preferences
Patients can enable/disable each notification type and customize:
- **Session Reminder Time**: How many hours before session to receive reminder (1-168 hours, default 24)
- **Mood Reminder Time**: What time to receive daily mood reminder (default 20:00)
- **Journal Reminder Time**: What time to receive daily journal reminder (default 21:00)
- **Push Notifications**: Store push token and device type for mobile push notifications

## API Endpoints

### Get/Update Notification Preferences
```
GET /api/patients/notifications/preferences/
PATCH /api/patients/notifications/preferences/
```

**Response:**
```json
{
  "id": "uuid",
  "patient": 1,
  "session_reminders_enabled": true,
  "session_reminder_time": 24,
  "session_summary_enabled": true,
  "session_approved_enabled": true,
  "session_cancelled_enabled": true,
  "mood_reminder_enabled": true,
  "mood_reminder_time": "20:00:00",
  "journal_reminder_enabled": true,
  "journal_reminder_time": "21:00:00",
  "goal_reminders_enabled": true,
  "therapist_messages_enabled": true,
  "push_token": null,
  "device_type": null,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Update Example:**
```json
PATCH /api/patients/notifications/preferences/
{
  "session_reminders_enabled": false,
  "mood_reminder_time": "18:00:00"
}
```

### List Notifications
```
GET /api/patients/notifications/
GET /api/patients/notifications/?is_read=false  // Filter unread only
```

**Response:**
```json
[
  {
    "id": "uuid",
    "patient": 1,
    "notification_type": "session_reminder",
    "title": "Upcoming Session Reminder",
    "message": "Your therapy session with Dr. Smith is in 24 hours.",
    "session_id": "uuid",
    "goal_id": null,
    "action_url": "/sessions/uuid",
    "is_read": false,
    "read_at": null,
    "sent_at": "2025-01-15T10:00:00Z",
    "time_ago": "2 hours ago"
  }
]
```

### Get Unread Count
```
GET /api/patients/notifications/unread-count/
```

**Response:**
```json
{
  "unread_count": 5
}
```

### Mark Notification as Read
```
POST /api/patients/notifications/<uuid>/read/
```

**Response:**
```json
{
  "id": "uuid",
  "is_read": true,
  "read_at": "2025-01-15T12:00:00Z",
  ...
}
```

### Mark All Notifications as Read
```
POST /api/patients/notifications/mark-all-read/
```

**Response:**
```json
{
  "marked_count": 5
}
```

### Delete Notification
```
DELETE /api/patients/notifications/<uuid>/
```

**Response:** 204 No Content

### Therapist Notification Endpoints

Therapists can fetch and manage notification history with these endpoints:

```
GET /api/patients/therapist/notifications/
GET /api/patients/therapist/notifications/?is_read=false
GET /api/patients/therapist/notifications/unread-count/
POST /api/patients/therapist/notifications/<uuid>/read/
POST /api/patients/therapist/notifications/mark-all-read/
DELETE /api/patients/therapist/notifications/<uuid>/
```

These endpoints are therapist-only and complement live updates from `ws/notifications/`.

## Database Models

### NotificationPreference
- **patient**: OneToOne relationship with User
- **Session Preferences**:
  - session_reminders_enabled (default: True)
  - session_reminder_time (hours before, default: 24)
  - session_summary_enabled (default: True)
  - session_approved_enabled (default: True)
  - session_cancelled_enabled (default: True)
- **Daily Reminders**:
  - mood_reminder_enabled (default: True)
  - mood_reminder_time (default: 20:00)
  - journal_reminder_enabled (default: True)
  - journal_reminder_time (default: 21:00)
- **Other**:
  - goal_reminders_enabled (default: True)
  - therapist_messages_enabled (default: True)
- **Push Notifications**:
  - push_token (max 500 characters)
  - device_type (ios/android/web)

### Notification
- **patient**: ForeignKey to User
- **notification_type**: Choice field (9 types)
- **title**: CharField(max_length=200)
- **message**: TextField
- **session_id**: UUIDField (optional, for session-related notifications)
- **goal_id**: UUIDField (optional, for goal-related notifications)
- **action_url**: CharField(max_length=500, optional) - Deep link URL
- **is_read**: BooleanField (default: False)
- **read_at**: DateTimeField (auto-set when marked read)
- **push_sent**: BooleanField (default: False)
- **push_sent_at**: DateTimeField (auto-set when push sent)
- **push_error**: TextField (stores push notification errors)
- **sent_at**: DateTimeField (auto-set on creation)

## Notification Service

### Automated Functions (in `patients/services/notification_service.py`)

1. **send_session_reminder_notifications()**
   - Checks for upcoming sessions based on patient preferences
   - Sends reminders according to configured time before session
   - Should be called hourly via Celery task

2. **send_session_summary_notification(session)**
   - Called when therapist completes session summary
   - Notifies patient that summary is available

3. **send_session_approved_notification(session)**
   - Called when therapist approves session request
   - Notifies patient of approval with session details

4. **send_session_cancelled_notification(session, cancelled_by)**
   - Called when session is cancelled
   - Notifies patient of cancellation

5. **send_mood_reminder_notifications()**
   - Sends daily mood tracking reminders
   - Only sends if patient hasn't logged mood today
   - Should be called at configured times via Celery task

6. **send_journal_reminder_notifications()**
   - Sends daily journal writing reminders
   - Only sends if patient hasn't written journal entry today
   - Should be called at configured times via Celery task

### Push Notification Integration

The `send_push_notification(preference, notification)` function is a placeholder for actual push notification implementation. To integrate:

1. **Install Firebase Admin SDK**:
   ```bash
   pip install firebase-admin
   ```

2. **Configure Firebase** in settings.py:
   ```python
   import firebase_admin
   from firebase_admin import credentials
   
   cred = credentials.Certificate('path/to/serviceAccountKey.json')
   firebase_admin.initialize_app(cred)
   ```

3. **Implement push notification sending**:
   ```python
   from firebase_admin import messaging
   
   def send_push_notification(preference, notification):
       message = messaging.Message(
           notification=messaging.Notification(
               title=notification.title,
               body=notification.message,
           ),
           data={
               'notification_id': str(notification.id),
               'type': notification.notification_type,
               'action_url': notification.action_url or '',
           },
           token=preference.push_token,
       )
       
       response = messaging.send(message)
       
       notification.push_sent = True
       notification.push_sent_at = timezone.now()
       notification.save()
       
       return response
   ```

## Mobile App Integration

### Storing Push Token
```javascript
// When user logs in or grants notification permission
const pushToken = await getPushToken(); // Get from FCM/APNS

PATCH /api/patients/notifications/preferences/
{
  "push_token": pushToken,
  "device_type": "ios" // or "android" or "web"
}
```

### Handling Deep Links
When notification is tapped, use the `action_url` field to navigate:
```javascript
{
  "action_url": "/sessions/uuid" // Navigate to session detail
  "action_url": "/sessions/uuid/summary" // Navigate to session summary
  "action_url": "/mood" // Navigate to mood tracking
  "action_url": "/journal" // Navigate to journal
}
```

## Admin Interface

Notification preferences and notifications can be managed in Django Admin:
- **Notification Preferences**: View/edit patient notification settings
- **Notifications**: View all notifications, filter by type/status, see push notification status

## Future Enhancements

1. **Celery Tasks**: Set up periodic tasks for automated notifications
2. **Push Notification Service**: Integrate Firebase Cloud Messaging or similar
3. **Email Notifications**: Add email fallback option
4. **SMS Notifications**: Add SMS option for critical notifications
5. **Notification Templates**: Create reusable templates for common notifications
6. **Notification Analytics**: Track open rates, engagement metrics
7. **Rich Notifications**: Support images, actions, custom UI
8. **Notification Grouping**: Group related notifications
9. **Do Not Disturb**: Respect quiet hours settings
10. **Notification History Archive**: Auto-delete old notifications after X days

## Testing

Test notification flow:
1. Enable session reminders for a patient
2. Create a scheduled session 24 hours in future
3. Call `send_session_reminder_notifications()`
4. Verify notification was created
5. Check notification appears in patient's notification list
6. Mark notification as read
7. Verify read status updated

## Usage Example

```python
from patients.services.notification_service import (
    send_session_summary_notification,
    send_session_approved_notification
)

# When therapist completes session summary
session = Session.objects.get(id=session_id)
send_session_summary_notification(session)

# When therapist approves session request
session = Session.objects.get(id=session_id)
session.status = 'scheduled'
session.save()
send_session_approved_notification(session)
```
