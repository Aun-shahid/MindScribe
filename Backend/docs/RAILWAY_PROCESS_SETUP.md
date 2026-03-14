# Railway Process Setup (Web + Celery Worker + Celery Beat)

This project uses one image/start script with a role switch via `PROCESS_TYPE`.

## What changed

`Backend/start.sh` now supports:
- `PROCESS_TYPE=web` → runs collectstatic, migrate, then Daphne
- `PROCESS_TYPE=worker` → runs `celery -A app worker -l info`
- `PROCESS_TYPE=beat` → runs `celery -A app beat -l info`

Default is `web`.

## Required Railway services

Create **3 services** from the same repo/image:

1. **Web service**
   - `PROCESS_TYPE=web`
   - Healthcheck path: `/api/authenticator/health/`

2. **Worker service**
   - `PROCESS_TYPE=worker`

3. **Beat service**
   - `PROCESS_TYPE=beat`

## Required environment variables (all services)

- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`

Usually both point to your Redis instance URL.

## Optional / recommended

- Keep timezone aligned with app setting (`TIME_ZONE = "Asia/Karachi"`) so reminder minute-window matching behaves as expected.
- Configure Firebase credentials if backend push delivery is expected:
  - `FIREBASE_CREDENTIALS_PATH`

## Why this fixes the issue

Without separate worker+beat processes, periodic reminder tasks never execute, so no in-app reminder notifications are created. This setup ensures Celery Beat schedules tasks and Celery Worker runs them.
