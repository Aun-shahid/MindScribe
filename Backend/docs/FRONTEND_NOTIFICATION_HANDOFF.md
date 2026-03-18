# Frontend Notification Handoff

This document reflects the current, simplified notification architecture.

## Current Architecture

- In-app reminders only (no push service, no Celery reminder worker/beat)
- Reminder jobs run via APScheduler in the backend web process
- Reminder checks create notifications in DB and publish live events on websocket
- Frontend consumes websocket events and shows in-app toasts/list updates

## Backend Runtime

Required:
- Web process running Django + Channels
- Notification scheduler enabled (default)

Config:
- `IN_APP_REMINDER_SCHEDULER_INTERVAL_SECONDS` (recommended `30`, valid `10-60`)
- `DAILY_REMINDER_WINDOW_MINUTES`
- `SESSION_REMINDER_WINDOW_MINUTES`
- `DISABLE_IN_APP_REMINDER_SCHEDULER=true` (optional override)

## API Endpoints (active)

Patient:
- `GET /api/patients/notifications/`
- `POST /api/patients/notifications/<uuid:notification_id>/read/`
- `POST /api/patients/notifications/mark-all-read/`
- `GET/PUT/PATCH /api/patients/notifications/preferences/`

Therapist:
- `GET /api/patients/therapist/notifications/`
- `GET /api/patients/therapist/notifications/summary/`
- `POST /api/patients/therapist/notifications/<uuid:notification_id>/read/`
- `POST /api/patients/therapist/notifications/mark-all-read/`

Realtime:
- `ws/notifications/`
- Event: `notification.created`

## Frontend Expectations

- Connect websocket with JWT token query param
- On `notification.created`, show in-app toast and optionally refresh list
- Use UUID-based `read` endpoints for mark-read actions
- Use `mark-all-read` (hyphenated route)

## Removed Legacy Pieces

- Celery reminder task wrappers and beat schedules
- Push/Firebase notification delivery flow
- Push retry/dead-letter logic
- Push fields in active notification API payloads
