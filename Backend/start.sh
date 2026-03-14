#!/bin/bash
set -e

PROCESS_TYPE=${PROCESS_TYPE:-web}

echo "Starting process type: ${PROCESS_TYPE}"

if [ "${PROCESS_TYPE}" = "worker" ]; then
	echo "Starting Celery worker..."
	exec celery -A app worker -l info
fi

if [ "${PROCESS_TYPE}" = "beat" ]; then
	echo "Starting Celery beat..."
	exec celery -A app beat -l info
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Start server
echo "Starting server..."
# Use Daphne for ASGI (Channels support)
# Railway provides the PORT environment variable
exec daphne -b 0.0.0.0 -p ${PORT:-8000} app.asgi:application
