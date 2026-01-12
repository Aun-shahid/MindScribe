#!/bin/bash

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
daphne -b 0.0.0.0 -p ${PORT:-8000} app.asgi:application
