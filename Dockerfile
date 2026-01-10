# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY Backend/requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend code
# Note: We copy the contents of Backend/app into /app
COPY Backend/app /app/
# Also copy start.sh from Backend/
COPY Backend/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose the port (Railway uses PORT env var, but 8000 is a good default)
EXPOSE 8000

# Run the start script
CMD ["/app/start.sh"]
