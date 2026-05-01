#!/bin/bash
set -e

PROCESS_TYPE=${PROCESS_TYPE:-web}

echo "Starting process type: ${PROCESS_TYPE}"

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
exec daphne -b 0.0.0.0 -p ${PORT:-8080} app.asgi:application
