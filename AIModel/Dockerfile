FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir fastapi uvicorn transformers numpy

# Copy the script
COPY main.py .

# Expose Vertex AI default port
EXPOSE 8080

# Start the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]