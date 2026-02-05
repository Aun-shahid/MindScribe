import os
import torch
import numpy as np
from fastapi import FastAPI, Request
from transformers import Wav2Vec2Processor, Wav2Vec2ForSequenceClassification

app = FastAPI()

# Vertex AI mounts your GCS bucket to /gcs/
# Your path: gs://mindscribe-141/fine_tuned_wav2vec2
GCS_BUCKET_PATH = os.environ.get("AIP_STORAGE_URI", "gs://mindscribe-141/fine_tuned_wav2vec2")
LOCAL_PATH = GCS_BUCKET_PATH.replace("gs://", "/gcs/")

device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading Wav2Vec2 model from {LOCAL_PATH}...")
# Note: Wav2Vec2ForSequenceClassification is used for emotion/classification tasks
processor = Wav2Vec2Processor.from_pretrained(LOCAL_PATH)
model = Wav2Vec2ForSequenceClassification.from_pretrained(LOCAL_PATH).to(device)
model.eval()

@app.post("/predict")
async def predict(request: Request):
    body = await request.json()
    
    # Vertex AI sends data in an 'instances' list
    # Expected input: {"instances": [[0.01, -0.02, ...]]} (raw audio float array)
    instances = body.get("instances", [])
    if not instances:
        return {"error": "No audio data provided"}

    # Process the first instance (standard for real-time)
    audio_input = np.array(instances[0], dtype=np.float32)
    
    # Wav2Vec2 expects 16kHz sampling rate
    inputs = processor(audio_input, sampling_rate=16000, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
    
    probabilities = torch.nn.functional.softmax(logits, dim=-1)
    confidence, predicted_class = torch.max(probabilities, dim=-1)

    return {
        "predictions": [
            {
                "class_id": predicted_class.item(),
                "confidence": confidence.item(),
                # If your config.json has an id2label mapping, you can use:
                # "label": model.config.id2label[predicted_class.item()]
            }
        ]
    }

@app.get("/health")
def health():
    return {"status": "healthy"}