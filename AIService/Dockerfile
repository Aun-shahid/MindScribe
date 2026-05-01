# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for audio processing and ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    git \
    libsndfile1 \
    ffmpeg \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for model cache
RUN mkdir -p /app/models_cache

# Expose port (Railway will override this, but 8080 is a good default)
EXPOSE 8080

# Run the application with uvicorn
# We use a shell-form CMD to allow environment variable expansion
CMD uvicorn src.main:app --host 0.0.0.0 --port 8000
