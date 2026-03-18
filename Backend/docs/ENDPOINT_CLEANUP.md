# API Endpoint Cleanup - March 17, 2026

## Summary
Removed duplicate, deprecated, and unsupported patient session-creation endpoints to streamline the API and avoid confusion.

## Removed Endpoints

### 1. Duplicate Patient Dashboard
Removed: `/api/therapy_sessions/dashboard/patient/`
- Reason: Duplicate of `/api/patients/dashboard/`
- Replacement: Use `/api/patients/dashboard/` instead
- Why: The patients app dashboard is the primary patient dashboard and already includes session information

### 2. Deprecated Patient Session Request
Removed: `/api/therapy_sessions/sessions/request/`
- Reason: Patient-initiated session creation is no longer supported
- Replacement: Patients must contact their therapist; therapists create and schedule sessions
- Why: Session creation is therapist-managed only

### 3. Patient Booking Endpoint
Removed: `/api/therapy_sessions/booking/book/`
- Reason: Patients should not be able to add or request sessions
- Replacement: No direct patient replacement endpoint
- Why: Session creation is therapist-managed only

### 4. Patient Emergency Booking Endpoint
Removed: `/api/therapy_sessions/booking/emergency/`
- Reason: Patients should not be able to emergency-request sessions
- Replacement: No direct patient replacement endpoint
- Why: Session creation is therapist-managed only

## Current Endpoint Structure

### Patient Endpoints (`/api/patients/`)
- `GET /dashboard/` - Primary patient dashboard
- `GET,POST /mood/` - Mood tracking
- `GET,POST /journal/` - Journal entries
- `GET,POST /emotions/` - Emotional insights
- `GET,POST /goals/` - Therapy goals
- `GET /relaxation/content/` - Relaxation content
- `GET,POST /relaxation/sessions/` - Relaxation sessions
- `GET /inspiration/` - Daily inspiration
- `GET,PATCH /notifications/preferences/` - Notification settings
- `GET /notifications/` - Notification list

### Session Endpoints (`/api/therapy_sessions/`)
- `GET /sessions/upcoming/` - Upcoming sessions
- `GET /sessions/past/` - Past sessions
- `GET /sessions/my/` - All my sessions
- `GET /sessions/<uuid>/` - Session detail
- `POST /sessions/<uuid>/start/` - Start session
- `POST /sessions/<uuid>/end/` - End session
- `GET,PATCH /sessions/<uuid>/summary/` - Session summary

### Availability Endpoints (`/api/therapy_sessions/booking/`)
- `GET /slots/` - Available time slots
- `GET /dates/` - Available dates

### Dashboard Endpoints
- `GET /api/patients/dashboard/` - Patient dashboard
- `GET /api/therapy_sessions/dashboard/therapist/` - Therapist dashboard

## Changes Made

### File: `therapy_sessions/urls.py`

Removed imports:
```python
SessionRequestView
PatientBookSessionView
EmergencySessionRequestView
```

Removed URL patterns:
```python
path('sessions/request/', ...)
path('booking/book/', ...)
path('booking/emergency/', ...)
```

Retained URL patterns:
```python
path('booking/slots/', ...)
path('booking/dates/', ...)
```

### File: `therapy_sessions/views.py`

Removed views:
```python
SessionRequestView
PatientBookSessionView
EmergencySessionRequestView
```

## Frontend Migration Checklist

- [ ] Remove any calls to `/api/therapy_sessions/sessions/request/`
- [ ] Remove any calls to `/api/therapy_sessions/booking/book/`
- [ ] Remove any calls to `/api/therapy_sessions/booking/emergency/`
- [ ] Keep patient session listing and detail views working
- [ ] Update API documentation if applicable

## Benefits

1. Single source of truth for patient dashboard data
2. Clear permissions: only therapists create and schedule sessions
3. Cleaner API with fewer unsupported paths
4. Availability lookup can remain exposed without allowing patient-created sessions

## Notes

- Therapist-managed scheduling remains available.
- Patient session listing and session detail access remain available.
- Availability lookup endpoints still exist unless you want those removed too.

## Endpoint Count

Before cleanup: 36 endpoints (therapy_sessions) + 24 endpoints (patients) = 60 total
After cleanup: 32 endpoints (therapy_sessions) + 24 endpoints (patients) = 56 total
Reduction: 4 redundant or unsupported endpoints removed
