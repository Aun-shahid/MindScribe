# Frontend Notification Handoff

This document summarizes all backend changes completed for notification scheduling, therapist notification organization, dashboard counts, and frontend integration expectations.

## Status

Completed and pushed to `dev`.

Backend commit:
- `5608cae` — `Fix notification scheduling and therapist notification organization`

---

## 1. What Was Fixed

### Reminder scheduling
The backend now correctly uses each patient's saved reminder times for:
- mood reminders
- journal reminders

It performs minute-level matching with a tolerance window, instead of using a generic/global timing approach.

### Scheduler wiring
Celery and Celery Beat were wired so reminders and retries can run automatically in production.

### Push notifications
Push sending is no longer a fake placeholder. The backend now attempts real push delivery through Firebase Admin when configured, and stores:
- `push_sent`
- `push_sent_at`
- `push_error`

It also includes retry/dead-letter logic for failed push notifications.

### Therapist notifications reorganization
Therapist notifications now support grouping/filtering by category:
- `session`
- `mood`
- `other`

### Therapist dashboard counts
Therapist dashboard now includes notification summary stats so frontend can show counts and deep-link into the correct tab.

### Low-value therapist notifications removed
The following patient actions no longer notify the therapist:
- patient creates therapy goal
- patient creates journal entry
- patient creates emotional insight
- patient creates history entry
- patient starts relaxation session

---

## 2. New / Updated Backend Behavior

### Therapist notifications can be filtered by category
Frontend can request therapist notifications by tab category.

#### Endpoint
`GET /api/patients/therapist/notifications/`

#### Supported query params
- `category=session`
- `category=mood`
- `category=other`
- `is_read=true`
- `is_read=false`

#### Example
- Sessions tab:
  - `GET /api/patients/therapist/notifications/?category=session`
- Mood tab:
  - `GET /api/patients/therapist/notifications/?category=mood`
- All unread mood alerts:
  - `GET /api/patients/therapist/notifications/?category=mood&is_read=false`

### Notification objects now include `category`
Therapist notification responses now include a derived field:
- `category`

Possible values:
- `session`
- `mood`
- `other`

Frontend can either:
1. use server-side filtering with query params, or
2. use the returned `category` field for UI grouping

---

## 3. New Therapist Notification Summary Endpoint

### Endpoint
`GET /api/patients/therapist/notifications/summary/`

### Purpose
Use this for dashboard cards, badges, and summary counts.

### Example response shape
```json
{
  "total_notifications": 8,
  "unread_notifications": 4,
  "session_notifications": 3,
  "session_unread_notifications": 1,
  "mood_notifications": 5,
  "mood_unread_notifications": 3,
  "mood_alert_patients": 2,
  "other_notifications": 0,
  "tabs": {
    "session": { "category": "session" },
    "mood": { "category": "mood" }
  }
}
```

### Meaning of key fields
- `mood_notifications`: total mood-related notifications for therapist
- `mood_unread_notifications`: unread mood notifications
- `mood_alert_patients`: number of distinct patients contributing mood alerts
- `session_notifications`: total session-related notifications
- `session_unread_notifications`: unread session notifications

---

## 4. Therapist Dashboard Changes

### Existing endpoint extended
`GET /api/therapy-sessions/dashboard/therapist/`

### New field in dashboard response
- `notification_stats`

### Example response block
```json
{
  "notification_stats": {
    "total_notifications": 8,
    "unread_notifications": 4,
    "session_notifications": 3,
    "session_unread_notifications": 1,
    "mood_notifications": 5,
    "mood_unread_notifications": 3,
    "mood_alert_patients": 2,
    "other_notifications": 0,
    "tabs": {
      "session": { "category": "session" },
      "mood": { "category": "mood" }
    },
    "navigation": {
      "notifications_page": "/notifications",
      "mood_tab_query": "?category=mood",
      "session_tab_query": "?category=session"
    }
  }
}
```

### Frontend usage
If therapist clicks the dashboard mood count card:
- open notifications page
- route with `?category=mood`
- preselect Mood tab

If therapist clicks session count card:
- open notifications page
- route with `?category=session`
- preselect Sessions tab

---

## 5. Recommended Frontend UI Behavior

### Notifications page tabs
Recommended tabs:
- `Sessions`
- `Mood`
- optionally `All`

### Suggested implementation
#### Sessions tab
Call:
- `GET /api/patients/therapist/notifications/?category=session`

Show items like:
- session bookings
- emergency session requests
- session approved/cancelled/rescheduled notifications
- session-related therapist alerts

#### Mood tab
Call:
- `GET /api/patients/therapist/notifications/?category=mood`

Show items like:
- downward mood trend alerts
- 3 consecutive bad mood alerts
- any mood-related therapist notification

#### Optional All tab
Call:
- `GET /api/patients/therapist/notifications/`

---

## 6. Therapist Notification Triggers That Still Exist

These patient-driven actions still notify the therapist because they are considered useful:
- patient sends new connection request
- patient books a session
- patient requests an emergency session
- mood trend downward alert
- three consecutive bad mood alert

Removed notifications:
- goal created
- journal entry created
- emotional insight created
- history entry created
- relaxation session started

---

## 7. Frontend Team Checklist

After pulling latest backend-compatible frontend branch:

### Must do
1. Update therapist notifications page to use tabs.
2. Use `category=session` and `category=mood` filters.
3. Read `notification_stats` from therapist dashboard.
4. Make dashboard mood/session cards clickable.
5. Route to notifications page with correct query param.
6. Ensure page reads query param and preselects matching tab.

### Recommended query-param behavior
- `?category=mood` → open Mood tab
- `?category=session` → open Sessions tab

### Recommended fallback
If no query param is present:
- default to `Sessions`, or
- default to `All`

---

## 8. Example Frontend Flow

### Mood count click flow
1. Therapist opens dashboard.
2. Sees `notification_stats.mood_notifications` or `notification_stats.mood_alert_patients`.
3. Clicks mood card.
4. Frontend routes to:
   - `/notifications?category=mood`
5. Notifications page reads query param.
6. Mood tab becomes active.
7. Page requests:
   - `GET /api/patients/therapist/notifications/?category=mood`

### Session count click flow
1. Therapist clicks session card.
2. Frontend routes to:
   - `/notifications?category=session`
3. Notifications page requests:
   - `GET /api/patients/therapist/notifications/?category=session`

---

## 9. Backend Runtime Requirements

For reminder scheduling and background retries to work in non-local environments, backend runtime must have:
- Redis (or configured broker)
- Celery worker running
- Celery Beat running
- Firebase credentials if real push delivery is expected

### Relevant backend env variables
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `DAILY_REMINDER_WINDOW_MINUTES`
- `SESSION_REMINDER_WINDOW_MINUTES`
- `PUSH_RETRY_MAX_TO_PROCESS`
- `PUSH_DEAD_LETTER_AFTER_HOURS`
- `FIREBASE_CREDENTIALS_PATH`

---

## 10. Files Changed on Backend

### Scheduler / tasks
- `Backend/app/app/settings.py`
- `Backend/app/app/celery.py`
- `Backend/app/patients/tasks.py`
- `Backend/app/patients/management/commands/run_notification_scheduler.py`

### Reminder logic / push logic
- `Backend/app/patients/services/notification_service.py`
- `Backend/app/patients/services/notification_categories.py`

### Notification API / serializer
- `Backend/app/patients/views/notifications.py`
- `Backend/app/patients/serializers.py`
- `Backend/app/patients/urls.py`
- `Backend/app/patients/views/__init__.py`

### Therapist dashboard
- `Backend/app/therapy_sessions/views.py`

### Removed therapist notification triggers
- `Backend/app/patients/views/goals.py`
- `Backend/app/patients/views/journal.py`
- `Backend/app/patients/views/emotional_insights.py`
- `Backend/app/history/views.py`
- `Backend/app/patients/views/relaxation.py`

### Migration/database cleanup
- `Backend/app/authenticator/models.py`
- `Backend/app/authenticator/migrations/0035_alter_emailverificationtoken_expires_at.py`
- `Backend/app/patients/migrations/0012_rename_notificatio_deliver_a6a03e_idx_notificatio_deliver_4d5d19_idx.py`

---

## 11. Validation Already Completed

Backend checks already performed:
- Django system checks passed
- task wrappers executed successfully
- scheduler command executed successfully
- dashboard notification summary logic executed successfully
- migrations applied successfully
- migration state clean (`No changes detected`)

---

## 12. Final Frontend Integration Summary

Frontend team should now:
- pull latest code
- add therapist notification tabs
- use the `category` filter/query param
- use dashboard `notification_stats`
- deep-link dashboard cards to `/notifications?category=mood` or `/notifications?category=session`

That is the complete backend handoff for this work.
