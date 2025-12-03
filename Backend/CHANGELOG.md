# Changelog

## [Unreleased] - 2024-12-03

### Added

#### Connection Request System
- **ConnectionRequest model** (`users/models.py`) - New model for patient-therapist connection workflow
  - Status choices: `pending`, `accepted`, `merged`, `rejected`
  - Optional `expires_at` field for request expiration
  - `merged_with_patient` FK for merging with existing patients
  - Unique constraint on pending requests per patient-therapist pair

- **Connection Request Endpoints** (`users/views.py`, `users/urls.py`)
  - `POST /api/users/connect-therapist/` - Patient sends connection request to therapist
  - `GET /api/users/connection-requests/` - Therapist lists pending connection requests
  - `POST /api/users/connection-requests/<uuid>/action/` - Therapist accepts/merges/rejects request
    - `accept` - Creates new patient profile linked to user
    - `merge` - Merges request with existing patient (requires `merge_with_patient_id`)
    - `reject` - Rejects the connection request

#### Therapist Availability System
- **TherapistAvailability model** (`therapy_sessions/models.py`) - Weekly recurring availability
  - `day_of_week` (0=Monday to 6=Sunday)
  - `start_time`, `end_time` for working hours
  - `is_day_off` flag for non-working days
  - `break_start_time`, `break_end_time` for lunch/breaks
  - `buffer_between_sessions` (minutes between appointments)
  - `slot_duration_minutes` (default 50 minutes)

- **TherapistDateOverride model** (`therapy_sessions/models.py`) - Specific date exceptions
  - Override availability for specific dates (holidays, special hours)
  - `is_blocked` flag to completely block a date
  - Custom `start_time`, `end_time` for that date

- **AvailabilityService** (`therapy_sessions/services.py`) - Scheduling logic
  - `get_available_slots(therapist, date)` - Returns available time slots
  - `check_slot_availability(therapist, start, end)` - Validates slot is bookable
  - `create_recurring_sessions()` - Creates recurring session instances
  - `validate_booking()` - Robust conflict detection (no double-booking allowed)

- **Availability Endpoints** (`therapy_sessions/views.py`, `therapy_sessions/urls.py`)
  - `GET/POST /api/sessions/availability/` - Therapist manages weekly availability
  - `GET /api/sessions/availability/?date=YYYY-MM-DD` - Get slots for specific date
  - `GET/POST /api/sessions/availability/overrides/` - Manage date-specific overrides

#### Recurring Sessions
- **Session model updates** (`therapy_sessions/models.py`)
  - `is_recurring` - Flag for recurring session series
  - `recurring_weeks` - Number of weeks to repeat (e.g., 4, 8, 12)
  - `recurrence_parent` - Self-FK linking recurring instances to parent

- **Recurring Session Creation** (`therapy_sessions/serializers.py`)
  - When `recurring_weeks` > 0, automatically creates future session instances
  - All recurring sessions linked via `recurrence_parent`

#### Patient Booking System
- **PatientBookSessionView** (`therapy_sessions/views.py`)
  - `POST /api/sessions/book-session/` - Patient books available slot
  - Validates slot against therapist availability
  - Prevents booking conflicts

#### Emergency Session Requests
- **EmergencySessionRequestView** (`therapy_sessions/views.py`)
  - `POST /api/sessions/emergency-request/` - Patient requests emergency session
  - `is_emergency` flag on Session model
  - Creates pending request for therapist review

#### Dummy Transcription Simulation
- **StartDummyTranscriptionView** (`transcription/views.py`)
  - `POST /api/transcription/sessions/<uuid>/realtime/start-dummy/` - Start simulation
  - 5-minute realistic therapy session simulation
  - 30 segments at 10-second intervals
  - Alternating patient/therapist dialogue with emotions

- **StopDummyTranscriptionView** (`transcription/views.py`)
  - `POST /api/transcription/sessions/<uuid>/realtime/stop-dummy/` - Stop simulation

#### Webhook Authentication
- **Shared Secret Auth** (`transcription/views.py`)
  - `X-Transcription-Key` header authentication
  - `TRANSCRIPTION_WEBHOOK_SECRET` environment variable
  - Applied to `RealtimeWebhookView`

### Changed

#### Session Model
- **Removed** `is_quick_session` field - All sessions now require `patient_id`
- **Removed** `quick_session_patient_name` field
- Sessions must reference an existing Patient record

#### User Profiles
- **Removed** `pairing_code` from TherapistProfile - Replaced by connection request system
- **Removed** `history_id` from PatientProfile - Unused field cleanup

#### Serializers
- **SessionCreateSerializer** (`therapy_sessions/serializers.py`)
  - `patient_id` now required (was optional for quick sessions)
  - Added `recurring_weeks` field
  - Added `is_emergency` field
  - Removed quick session name handling

- **ConnectionRequestSerializer** (`users/serializers.py`) - New serializer for requests
- **ConnectionRequestActionSerializer** (`users/serializers.py`) - For accept/merge/reject

### Database Migrations Required

Run the following migrations after updating:

```bash
python manage.py makemigrations users
python manage.py makemigrations therapy_sessions
python manage.py migrate
```

### Environment Variables

New environment variable for webhook authentication:

```bash
TRANSCRIPTION_WEBHOOK_SECRET=your-secure-secret-key
```

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/connect-therapist/` | Patient requests connection |
| GET | `/api/users/connection-requests/` | List pending requests (therapist) |
| POST | `/api/users/connection-requests/<uuid>/action/` | Accept/merge/reject request |
| GET/POST | `/api/sessions/availability/` | Manage weekly availability |
| GET/POST | `/api/sessions/availability/overrides/` | Manage date overrides |
| POST | `/api/sessions/book-session/` | Patient books session |
| POST | `/api/sessions/emergency-request/` | Request emergency session |
| POST | `/api/transcription/sessions/<uuid>/realtime/start-dummy/` | Start dummy transcription |
| POST | `/api/transcription/sessions/<uuid>/realtime/stop-dummy/` | Stop dummy transcription |
