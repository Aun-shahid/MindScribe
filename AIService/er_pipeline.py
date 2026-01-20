

"""
Urdu to English Emotion Recognition Pipeline
A Streamlit app for therapist-patient conversation analysis

This app performs:
1. Audio file upload
2. Transcription using GPT-4o
3. Speaker diarization using PyAnnote
4. Audio resampling to 16kHz
5. Emotion recognition using Wav2Vec2
6. Translation to English with emotional context preservation
"""

# ============================================================================
# IMPORTS AND DEPENDENCIES
# ============================================================================
import streamlit as st
import torch
import librosa
import soundfile as sf
import numpy as np
import tempfile
import os
from pathlib import Path
from typing import List, Dict, Tuple
import io
import transformers
import nltk

# Ensure NLTK resources are available
for resource in ['punkt', 'punkt_tab']:
    try:
        nltk.data.find(f'tokenizers/{resource}')
    except LookupError:
        nltk.download(resource)


# Transformers for emotion recognition
from transformers import (
    Wav2Vec2ForSequenceClassification,
    Wav2Vec2FeatureExtractor,
    pipeline
)

# PyAnnote for speaker diarization
from pyannote.audio import Pipeline as DiarizationPipeline

# OpenAI for transcription and translation
from openai import OpenAI

# Audio processing
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

# Environment variables
from dotenv import load_dotenv
from huggingface_hub import login as hf_login

# NOTE: pydub requires ffmpeg installed on the host system (apt/brew/choco).
# Make sure ffmpeg is available in PATH before running the Streamlit app.


# ============================================================================
# CONFIGURATION AND SETUP
# ============================================================================
st.set_page_config(
    page_title="Urdu Emotion Recognition",
    page_icon="🎙️",
    layout="wide"
)

# Model names
# EMOTION_MODEL = "superb/wav2vec2-large-superb-er"
EMOTION_MODEL = "C:\\Users\\Radia\\Desktop\\model\\fine_tuned_wav2vec2"

DIARIZATION_MODEL = "pyannote/speaker-diarization-3.1"

# Target sample rate for emotion model
TARGET_SAMPLE_RATE = 16000


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# @st.cache_resource
# def load_emotion_model():
#     """Load the Wav2Vec2 emotion recognition model and feature extractor"""
#     try:
#         # Try the newer import first
#         from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
#         model = AutoModelForAudioClassification.from_pretrained(EMOTION_MODEL)
#         feature_extractor = AutoFeatureExtractor.from_pretrained(EMOTION_MODEL)
#     except ImportError:
#         # Fallback to older import
#         model = Wav2Vec2ForSequenceClassification.from_pretrained(EMOTION_MODEL)
#         feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(EMOTION_MODEL)
    
#     return model, feature_extractor

@st.cache_resource
def load_emotion_model():
    from transformers import Wav2Vec2ForSequenceClassification, AutoFeatureExtractor
    model = Wav2Vec2ForSequenceClassification.from_pretrained(EMOTION_MODEL)
    feature_extractor = AutoFeatureExtractor.from_pretrained(EMOTION_MODEL)
    return model, feature_extractor


@st.cache_resource
def load_diarization_pipeline(hf_token: str):
    """Load the PyAnnote speaker diarization pipeline"""
    # If a token is provided, login to the HuggingFace Hub first (replaces use_auth_token)
    if hf_token:
        try:
            hf_login(hf_token)
        except Exception as e:
            st.warning(f"⚠️ HuggingFace Hub login failed: {e}")
    else:
        # Informative note: some models (pyannote) require accepting model terms on HF.
        st.info("⚠️ No HF_TOKEN provided - private or gated models may fail to load if not public or unaccepted.")

    # Load the diarization pipeline without use_auth_token
    dia_pipeline = DiarizationPipeline.from_pretrained(DIARIZATION_MODEL)

    # Move to GPU if available
    if torch.cuda.is_available():
        dia_pipeline.to(torch.device("cuda"))

    return dia_pipeline


def get_openai_client(api_key: str):
    """Initialize OpenAI client"""
    return OpenAI(api_key=api_key)


# ============================================================================
# MODULE 1: AUDIO FILE UPLOAD AND VALIDATION
# ============================================================================

def upload_audio_file():
    """Handle audio file upload through Streamlit interface"""
    st.header("📁 Step 1: Upload Audio File")
    
    uploaded_file = st.file_uploader(
        "Upload your Urdu audio file (therapist-patient conversation)",
        type=['wav', 'mp3', 'm4a', 'flac', 'ogg'],
        help="Supported formats: WAV, MP3, M4A, FLAC, OGG"
    )
    
    if uploaded_file is not None:
        st.success(f"✅ File uploaded: {uploaded_file.name}")
        
        # Display audio player
        st.audio(uploaded_file, format=f"audio/{uploaded_file.name.split('.')[-1]}")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp_file:
            tmp_file.write(uploaded_file.read())
            tmp_path = tmp_file.name
        
        return tmp_path
    
    return None


# ============================================================================
# MODULE 2: TRANSCRIPTION USING GPT-4o
# ============================================================================

def transcribe_audio_gpt4o(audio_path: str, openai_client: OpenAI) -> str:
    """
    Transcribe Urdu audio using OpenAI GPT-4o Whisper API
    
    Args:
        audio_path: Path to audio file
        openai_client: OpenAI client instance
    
    Returns:
        Transcribed text in Urdu
    """
    st.header("🎤 Step 2: Transcribing Audio")
    
    with st.spinner("Transcribing audio using GPT-4o..."):
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ur",  # Urdu language code
                    response_format="text"
                )
            
            st.success("✅ Transcription complete!")
            
            # Display transcription
            with st.expander("📝 View Full Transcription", expanded=True):
                st.text_area("Urdu Transcription", transcript, height=150)
            
            return transcript
            
        except Exception as e:
            st.error(f"❌ Transcription failed: {str(e)}")
            return ""


# ============================================================================
# MODULE 3: SPEAKER DIARIZATION USING PYANNOTE
# ============================================================================

def perform_speaker_diarization(audio_path: str, diarization_pipeline, min_speakers: int = 0, max_speakers: int = 0) -> List[Dict]:
    """
    Perform speaker diarization to identify different speakers
    
    Args:
        audio_path: Path to audio file
        diarization_pipeline: PyAnnote diarization pipeline
    
    Returns:
        List of segments with speaker labels and timestamps
    """
    st.header("👥 Step 3: Speaker Diarization")
    

    with st.spinner("Identifying speakers in the conversation..."):
        try:
            # Run diarization. If the user provided speaker hints, try passing them as kwargs.
            try:
                kwargs = {}
                if min_speakers and min_speakers > 0:
                    kwargs['min_speakers'] = int(min_speakers)
                if max_speakers and max_speakers > 0:
                    kwargs['max_speakers'] = int(max_speakers)
                if kwargs:
                    diarization = diarization_pipeline(audio_path, **kwargs)
                else:
                    diarization = diarization_pipeline(audio_path)
            except TypeError:
                # Some pipeline versions may not accept min/max kwargs
                st.info("⚠️ Diarization pipeline did not accept min_speakers/max_speakers; running default diarization.")
                diarization = diarization_pipeline(audio_path)

            # Extract segments
            segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    'speaker': speaker,
                    'start': float(turn.start),
                    'end': float(turn.end),
                    'duration': float(turn.end - turn.start)
                })

            unique_speakers = sorted(list(set([s['speaker'] for s in segments])))
            st.success(f"✅ Found {len(unique_speakers)} unique speakers: {', '.join(unique_speakers)}")
            st.info(f"📊 Total segments: {len(segments)}")

            # Display summary and debug info
            with st.expander("👥 Speaker Summary & Debug"):
                from collections import Counter
                counts = Counter([s['speaker'] for s in segments])
                st.write("Speaker counts:")
                for sp, cnt in counts.items():
                    st.write(f"- {sp}: {cnt} segments")
                st.write("First 10 segments:")
                for s in segments[:10]:
                    st.write(f"- {s['speaker']}: {s['start']:.2f}s - {s['end']:.2f}s ({s['duration']:.2f}s)")

            return segments

        except Exception as e:
            # Known issue: PyAnnote sometimes raises errors related to AudioDecoder when ffmpeg is missing
            st.warning(f"⚠️ Diarization failed (pyannote): {str(e)}")
            st.info("Using silence-based fallback segmentation instead.")
            try:
                fallback_segments = fallback_silence_diarization(audio_path)
                st.success(f"✅ Fallback segmentation produced {len(fallback_segments)} segments")
                return fallback_segments
            except Exception as fe:
                st.error(f"❌ Fallback diarization also failed: {fe}")
                return []


def fallback_silence_diarization(audio_path: str, min_silence_len: int = 700, silence_thresh: int = -40, keep_silence: int = 200) -> List[Dict]:
    """
    Simple silence-based segmentation fallback when pyannote diarization fails.

    Args:
        audio_path: Path to audio file
        min_silence_len: Minimum length (ms) of a silence to be used for splitting
        silence_thresh: Silence threshold in dBFS
        keep_silence: Amount of silence to leave at the edges of each chunk (ms)

    Returns:
        List of segments with speaker='unknown' and start/end in seconds
    """
    audio = AudioSegment.from_file(audio_path)
    # detect_nonsilent returns list of [start_ms, end_ms]
    nonsilent_ranges = detect_nonsilent(audio, min_silence_len=min_silence_len, silence_thresh=silence_thresh)

    segments: List[Dict] = []
    for idx, (start_ms, end_ms) in enumerate(nonsilent_ranges):
        # expand by keep_silence but clamp to audio duration
        start_ms = max(0, start_ms - keep_silence)
        end_ms = min(len(audio), end_ms + keep_silence)
        start = start_ms / 1000.0
        end = end_ms / 1000.0
        segments.append({
            'speaker': f'unknown_{idx+1}',
            'start': start,
            'end': end,
            'duration': end - start
        })

    # If no nonsilent ranges found, fallback to whole-file single segment
    if not segments:
        duration = len(audio) / 1000.0
        segments.append({
            'speaker': 'unknown_1',
            'start': 0.0,
            'end': duration,
            'duration': duration
        })

    return segments


def merge_consecutive_speaker_turns(segments: List[Dict], max_pause: float = 0.7) -> List[Dict]:
    """
    Merge consecutive diarization segments for the same speaker into utterances.

    Splits a speaker's continuous segments into separate utterances when the internal
    silence/gap between consecutive same-speaker fragments exceeds `max_pause` seconds.
    """
    if not segments:
        return []

    segs = sorted(segments, key=lambda s: s['start'])
    merged = []
    current = dict(segs[0])

    for s in segs[1:]:
        if s['speaker'] == current['speaker']:
            # gap between last end and this start
            gap = s['start'] - current.get('end', s['start'])
            if gap <= max_pause:
                # extend current utterance
                current['end'] = max(current.get('end', 0.0), s.get('end', 0.0))
                current['duration'] = current['end'] - current.get('start', 0.0)
            else:
                # gap too long -> finalize current and start a new utterance
                merged.append(current)
                current = dict(s)
        else:
            # different speaker -> finalize current and start new
            merged.append(current)
            current = dict(s)

    merged.append(current)
    return merged


def collapse_speaker_labels(segments: List[Dict], target_n: int) -> List[Dict]:
    """
    Collapse/merge speaker labels down to target_n labels using an adjacency heuristic.

    Strategy:
    - Compute total speaking time per label.
    - While unique_labels > target_n:
      - Pick the smallest-duration label s.
      - Find label t that s most frequently appears adjacent to (in consecutive segments).
      - Reassign all segments with speaker==s to speaker==t.
    """
    if not segments:
        return segments

    segs = sorted(segments, key=lambda s: s['start'])
    # total time per label
    from collections import Counter, defaultdict
    total = Counter()
    for s in segs:
        total[s['speaker']] += s.get('duration', 0.0)

    def unique_labels_list():
        return sorted(list({s['speaker'] for s in segs}))

    # adjacency counts
    def adjacency_counts():
        adj = defaultdict(Counter)
        for a, b in zip(segs, segs[1:]):
            adj[a['speaker']][b['speaker']] += 1
            adj[b['speaker']][a['speaker']] += 1
        return adj

    adj = adjacency_counts()

    while len(unique_labels_list()) > target_n:
        # recompute totals and pick smallest label
        total = Counter()
        for s in segs:
            total[s['speaker']] += s.get('duration', 0.0)
        smallest, _ = min(total.items(), key=lambda x: x[1])

        # find best merge candidate by adjacency
        candidates = adj.get(smallest, {})
        if candidates:
            target, _ = candidates.most_common(1)[0]
        else:
            # fallback: merge into the largest label
            target = total.most_common(1)[0][0]

        # perform reassignment
        for s in segs:
            if s['speaker'] == smallest:
                s['speaker'] = target

        # rebuild adjacency
        adj = adjacency_counts()

    return segs


# ============================================================================
# MODULE 4: AUDIO RESAMPLING TO 16kHz
# ============================================================================

def resample_audio_to_16khz(audio_path: str) -> Tuple[np.ndarray, str]:
    """
    Resample audio to 16kHz for emotion detection model
    
    Args:
        audio_path: Path to original audio file
    
    Returns:
        Tuple of (resampled audio array, path to resampled file)
    """
    st.header("🔊 Step 4: Resampling Audio")
    
    with st.spinner("Resampling audio to 16kHz..."):
        try:
            # Load audio with librosa (automatically resamples to target rate)
            audio, sr = librosa.load(audio_path, sr=TARGET_SAMPLE_RATE, mono=True)
            
            # Always write a WAV (PCM) file to avoid decoder issues in downstream libs
            orig_stem = Path(audio_path).stem
            resampled_path = str(Path(tempfile.gettempdir()) / f"{orig_stem}_16khz.wav")
            sf.write(resampled_path, audio, TARGET_SAMPLE_RATE, subtype='PCM_16')
            
            st.success(f"✅ Audio resampled to {TARGET_SAMPLE_RATE}Hz (WAV)")
            st.info(f"📏 Audio length: {len(audio)/TARGET_SAMPLE_RATE:.2f} seconds")
            
            return audio, resampled_path
            
        except Exception as e:
            st.error(f"❌ Resampling failed: {str(e)}")
            return None, None


def extract_audio_segment(audio_array: np.ndarray, start: float, end: float, sr: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    """
    Extract a specific time segment from audio array
    
    Args:
        audio_array: Full audio numpy array
        start: Start time in seconds
        end: End time in seconds
        sr: Sample rate
    
    Returns:
        Audio segment as numpy array
    """
    start_sample = int(start * sr)
    end_sample = int(end * sr)
    return audio_array[start_sample:end_sample]


def normalize_emotion_label(label: str) -> str:
    """
    Map raw emotion labels to a canonical set:
    canonical tokens: 'joy', 'sadness', 'anger', 'neutral', 'disgust', 'fear', 'surprise', 'unknown'
    Also map common synonyms like 'happy'/'happiness' -> 'joy'.
    """
    try:
        s = str(label).strip().lower()
    except Exception:
        return 'unknown'

    if not s or s in {'nan', 'none', 'n/a', 'unknown'}:
        return 'unknown'

    if s in {'happiness', 'happy', 'joy'}:
        return 'joy'
    if s in {'sad', 'sadness'}:
        return 'sadness'
    if s in {'angry', 'anger'}:
        return 'anger'
    if s in {'neutral', 'none', 'neutrality'}:
        return 'neutral'
    if s in {'surprise', 'surprised'}:
        return 'surprise'
    if s in {'disgust'}:
        return 'disgust'
    if s in {'fear'}:
        return 'fear'

    return 'unknown'



# ============================================================================
# MODULE 5: EMOTION RECOGNITION USING WAV2VEC2
# ============================================================================

def detect_emotion(audio_segment: np.ndarray, model, feature_extractor) -> Dict:
    """
    Detect emotion in audio segment using Wav2Vec2
    
    Args:
        audio_segment: Audio segment as numpy array (16kHz)
        model: Wav2Vec2 emotion recognition model
        feature_extractor: Wav2Vec2 feature extractor
    
    Returns:
        Dictionary with emotion label and confidence scores
    """
    try:
        # Prepare input
        inputs = feature_extractor(
            audio_segment,
            sampling_rate=TARGET_SAMPLE_RATE,
            padding=True,
            return_tensors="pt"
        )
        
        # Get predictions
        with torch.no_grad():
            logits = model(**inputs).logits
        
        # Get probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)
        predicted_id = torch.argmax(logits, dim=-1).item()
        
        # Get label and confidence
        emotion_label = model.config.id2label[predicted_id]
        confidence = probs[0][predicted_id].item()
        
        # Get all emotion scores
        all_emotions = {
            model.config.id2label[i]: probs[0][i].item()
            for i in range(len(model.config.id2label))
        }
        
        return {
            'emotion': emotion_label,
            'confidence': confidence,
            'all_scores': all_emotions
        }
        
    except Exception as e:
        st.warning(f"⚠️ Emotion detection failed for segment: {str(e)}")
        return {
            'emotion': 'unknown',
            'confidence': 0.0,
            'all_scores': {}
        }


def analyze_emotions_for_segments(
    audio_array: np.ndarray,
    segments: List[Dict],
    model,
    feature_extractor
) -> List[Dict]:
    """
    Analyze emotions for all diarized segments
    
    Args:
        audio_array: Full resampled audio array
        segments: List of diarized segments
        model: Emotion recognition model
        feature_extractor: Feature extractor
    
    Returns:
        Segments with emotion data added
    """
    st.header("😊 Step 5: Emotion Recognition")
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    enriched_segments = []
    
    for idx, segment in enumerate(segments):
        status_text.text(f"Analyzing emotion for segment {idx + 1}/{len(segments)}...")
        
        # Extract audio segment
        audio_segment = extract_audio_segment(
            audio_array,
            segment['start'],
            segment['end']
        )
        
        # Detect emotion
        emotion_data = detect_emotion(audio_segment, model, feature_extractor)
        
        # Add emotion data to segment
        enriched_segment = {**segment, **emotion_data}
        enriched_segments.append(enriched_segment)
        
        # Update progress
        progress_bar.progress((idx + 1) / len(segments))
    
    status_text.empty()
    progress_bar.empty()
    st.success("✅ Emotion analysis complete!")
    
    return enriched_segments


# ============================================================================
# MODULE 6: TRANSLATION TO ENGLISH WITH CONTEXT PRESERVATION
# ============================================================================

def transcribe_and_translate_segment(
    audio_path: str,
    start: float,
    end: float,
    emotion: str,
    openai_client: OpenAI
) -> Dict[str, str]:
    """
    Transcribe and translate a specific audio segment with emotional context
    
    Args:
        audio_path: Path to audio file
        start: Start time in seconds
        end: End time in seconds
        emotion: Detected emotion for context
        openai_client: OpenAI client
    
    Returns:
        Dictionary with Urdu transcription and English translation
    """
    try:
        # Load and extract segment
        audio = AudioSegment.from_file(audio_path)
        segment = audio[int(start * 1000):int(end * 1000)]
        
        # Save segment to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            segment.export(tmp.name, format="wav")
            segment_path = tmp.name
        
        # Transcribe segment in Urdu
        with open(segment_path, "rb") as audio_file:
            urdu_text = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ur",
                response_format="text"
            )
        
        # Translate to English with emotional context preservation
        translation_prompt = f"""Translate the following Urdu text to English. 
This is from a therapist-patient conversation where the speaker is expressing {emotion} emotion.
Preserve the emotional tone, nuance, and therapeutic context in your translation.
Make sure the translation captures the original tension and emotional intent.

Urdu text: {urdu_text}

Provide only the English translation, maintaining the emotional context."""

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert translator specializing in Urdu to English translation for therapeutic contexts. You preserve emotional nuance and cultural context."},
                {"role": "user", "content": translation_prompt}
            ],
            temperature=0.3
        )
        
        english_text = response.choices[0].message.content.strip()
        
        # Clean up temp file
        os.unlink(segment_path)
        
        return {
            'urdu': urdu_text.strip(),
            'english': english_text
        }
        
    except Exception as e:
        st.warning(f"⚠️ Translation failed for segment: {str(e)}")
        return {
            'urdu': '',
            'english': ''
        }


def translate_all_segments(
    audio_path: str,
    segments: List[Dict],
    openai_client: OpenAI
) -> List[Dict]:
    """
    Translate all segments from Urdu to English
    
    Args:
        audio_path: Path to audio file
        segments: Enriched segments with emotion data
        openai_client: OpenAI client
    
    Returns:
        Segments with translations added
    """
    st.header("🌐 Step 6: Translation to English")
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    translated_segments = []
    
    for idx, segment in enumerate(segments):
        status_text.text(f"Translating segment {idx + 1}/{len(segments)}...")
        
        # Get transcription and translation
        translation_data = transcribe_and_translate_segment(
            audio_path,
            segment['start'],
            segment['end'],
            segment['emotion'],
            openai_client
        )
        
        # Add translation data to segment
        translated_segment = {**segment, **translation_data}
        translated_segments.append(translated_segment)
        
        # Update progress
        progress_bar.progress((idx + 1) / len(segments))
    
    status_text.empty()
    progress_bar.empty()
    st.success("✅ Translation complete!")
    
    return translated_segments


# ============================================================================
# MODULE 7: RESULTS DISPLAY
# ============================================================================

def display_results(segments: List[Dict]):
    """
    Display analysis results for all segments
    
    Args:
        segments: Complete analyzed segments with all data
    """
    st.header("📊 Analysis Results")
    
    if not segments:
        st.warning("No segments to display")
        return
    
    # Summary statistics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Segments", len(segments))
    
    with col2:
        unique_speakers = len(set([s['speaker'] for s in segments]))
        st.metric("Speakers", unique_speakers)
    
    with col3:
        emotions = [s['emotion'] for s in segments if s.get('emotion')]
        most_common_emotion = max(set(emotions), key=emotions.count) if emotions else "N/A"
        st.metric("Dominant Emotion", most_common_emotion)
    
    with col4:
        total_duration = sum([s['duration'] for s in segments])
        st.metric("Total Duration", f"{total_duration:.1f}s")
    
    st.divider()
    
    # Detailed segment view
    st.subheader("📝 Detailed Segment Analysis")
    
    for idx, segment in enumerate(segments, 1):
        with st.expander(
            f"Segment {idx}: {segment['speaker']} ({segment['start']:.1f}s - {segment['end']:.1f}s) - {segment.get('emotion', 'unknown').upper()}"
        ):
            # Create columns for organized display
            info_col, emotion_col = st.columns([2, 1])
            
            with info_col:
                st.write(f"**Speaker:** {segment['speaker']}")
                st.write(f"**Time:** {segment['start']:.2f}s - {segment['end']:.2f}s ({segment['duration']:.2f}s)")
                st.write(f"**Emotion:** {segment.get('emotion', 'unknown').title()} ({segment.get('confidence', 0)*100:.1f}% confidence)")
            
            with emotion_col:
                if segment.get('all_scores'):
                    st.write("**All Emotion Scores:**")
                    for emotion, score in sorted(segment['all_scores'].items(), key=lambda x: x[1], reverse=True):
                        st.write(f"{emotion}: {score*100:.1f}%")
            
            st.divider()
            
            # Transcription and translation
            col_urdu, col_english = st.columns(2)
            
            with col_urdu:
                st.markdown("**🇵🇰 Urdu (Original):**")
                st.info(segment.get('urdu', 'N/A'))
            
            with col_english:
                st.markdown("**🇬🇧 English (Translation):**")
                st.success(segment.get('english', 'N/A'))


                

# ============================================================================
# MODULE 8: TEXT-BASED EMOTION ANALYSIS (PATIENT SENTENCES)
# ============================================================================
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize

@st.cache_resource
def load_text_emotion_model():
    """Load the Hugging Face emotion text model"""
    model_name = "j-hartmann/emotion-english-distilroberta-base"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    return tokenizer, model

def predict_text_emotions(text_lines: List[str], tokenizer, model) -> List[Dict]:
    """Perform text-based emotion prediction for each line"""
    results = []
    for line in text_lines:
        if not line.strip():
            continue
        inputs = tokenizer(line, return_tensors="pt", truncation=True)
        with torch.no_grad():
            logits = model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)
        pred_id = torch.argmax(probs, dim=-1).item()
        emotion = model.config.id2label[pred_id]
        confidence = probs[0][pred_id].item()
        all_scores = {model.config.id2label[i]: probs[0][i].item() for i in range(len(model.config.id2label))}
        results.append({
            "text": line,
            "emotion": emotion,
            "confidence": confidence,
            "all_scores": all_scores
        })
    return results

def perform_patient_text_emotion_analysis(segments: List[Dict]):
    """Extract all patient (second speaker) translated text and analyze sentence-wise emotions"""
    st.header("💬 Step 7: Patient Text-Based Emotion Analysis")
    
    if not segments:
        st.warning("No segments found for emotion analysis.")
        return
    
    # Identify all unique speakers and assume 2nd speaker is the patient
    speakers = sorted(list(set([s['speaker'] for s in segments])))
    if len(speakers) < 2:
        st.warning("Less than two speakers found — cannot determine patient.")
        return
    
    patient_speaker = speakers[1]
    st.info(f"🧠 Assuming **{patient_speaker}** is the patient.")

    # Combine all English translated text from the patient
    patient_lines = [s.get("english", "").strip() for s in segments if s["speaker"] == patient_speaker and s.get("english")]
    combined_text = " ".join(patient_lines)
    
    if not combined_text.strip():
        st.warning("No translated text found for patient.")
        return
    
    # Display combined text
    st.subheader("📝 Combined Translated Transcript (Patient)")
    st.text_area("Full Transcript (Patient)", combined_text, height=200)
    
    # Sentence tokenization
    sentences = sent_tokenize(combined_text)
    st.write(f"✉️ Detected {len(sentences)} sentences for emotion analysis.")
    
    # Load model
    tokenizer, model = load_text_emotion_model()
    
    # Perform prediction
    with st.spinner("Analyzing text emotions..."):
        text_emotions = predict_text_emotions(sentences, tokenizer, model)
    
    # Display results
    st.subheader("📊 Sentence-wise Text Emotion Analysis")
    for idx, item in enumerate(text_emotions, 1):
        with st.expander(f"Sentence {idx}: {item['emotion'].upper()} ({item['confidence']*100:.1f}% confidence)"):
            st.write(f"**Text:** {item['text']}")
            st.write("**All Emotion Scores:**")
            for emo, score in sorted(item['all_scores'].items(), key=lambda x: x[1], reverse=True):
                st.write(f"{emo}: {score*100:.1f}%")


def build_combined_copy_paste_report(segments: List[Dict]) -> str:
    """
    Build a copy-paste friendly combined report for all segments.

    For each segment (utterance) include:
      - Segment number, speaker, time
      - Audio-emotion label and confidence
      - Text-emotion label and confidence (only for patient / second speaker)
      - Urdu transcription
      - English translation

    Returns a single string suitable for pasting into Word.
    """
    if not segments:
        return ""

    # Determine patient speaker (assume second speaker if available)
    speakers = sorted(list({s['speaker'] for s in segments}))
    patient_speaker = speakers[1] if len(speakers) > 1 else speakers[0]

    # Load text emotion model once
    try:
        tokenizer, text_model = load_text_emotion_model()
    except Exception:
        tokenizer = text_model = None

    blocks = []
    for idx, seg in enumerate(sorted(segments, key=lambda x: x['start']), 1):
        header = f"Segment {idx} — Speaker: {seg['speaker']} — {seg['start']:.2f}s - {seg['end']:.2f}s"
        audio_em = seg.get('emotion', 'unknown')
        audio_conf = seg.get('confidence', 0.0)
        audio_line = f"Audio Emotion: {audio_em} ({audio_conf*100:.1f}% confidence)"

        # Default text emotion placeholders
        text_em_line = "Text Emotion: N/A"

        # Only run text-emotion for patient speaker and if translation exists
        if seg.get('speaker') == patient_speaker and seg.get('english') and tokenizer and text_model:
            try:
                res = predict_text_emotions([seg.get('english')], tokenizer, text_model)
                if res and len(res) > 0:
                    titem = res[0]
                    text_em_line = f"Text Emotion: {titem['emotion']} ({titem['confidence']*100:.1f}% confidence)"
            except Exception:
                text_em_line = "Text Emotion: error"

        urdu = seg.get('urdu', '').strip() or 'N/A'
        english = seg.get('english', '').strip() or 'N/A'

        block = [header, audio_line, text_em_line, "", "Urdu Transcription:", urdu, "", "English Translation:", english]
        blocks.append("\n".join(block))

    combined = "\n\n---\n\n".join(blocks)
    # Add a short footer with patient identification
    combined = f"Combined Report (Patient speaker: {patient_speaker})\n\n" + combined
    return combined


def plot_patient_emotions(segments: List[Dict], patient_speaker: str, agg_mode: str = "Per utterance", window_size: int = 30, max_points: int = 300, min_conf: float = 0.0, agg_bins: int = 4):
    """
    Plot patient-level emotion comparisons (audio vs text).

    - segments: list of analyzed segments (with audio emotion and english translation)
    - patient_speaker: speaker id to filter
    - agg_mode: "Per utterance" | "Time window" | "Change-only"
    - window_size: seconds for time-window aggregation
    - max_points: maximum number of plotted points
    - min_conf: minimum confidence filter to include a point
    """
    try:
        import pandas as pd
    except Exception:
        st.warning("pandas is required for plotting. Please install pandas.")
        return

    try:
        import altair as alt
    except Exception:
        alt = None

    # Filter patient segments
    patient_segs = [s for s in segments if s.get('speaker') == patient_speaker]
    if not patient_segs:
        st.info("No segments for selected patient to plot.")
        return

    # Build DataFrame
    rows = []
    for s in sorted(patient_segs, key=lambda x: x.get('start', 0.0)):
        start = float(s.get('start', 0.0))
        end = float(s.get('end', start))
        mid = (start + end) / 2.0
        rows.append({
            'start': start,
            'end': end,
            'time': mid,
            'audio_emotion': s.get('emotion', 'unknown'),
            'audio_conf': float(s.get('confidence', 0.0)) if s.get('confidence') is not None else 0.0,
            'text_emotion': s.get('text_emotion', s.get('text_emotion', 'N/A')),
            'text_conf': float(s.get('text_confidence', s.get('text_confidence', 0.0)))
        })

    df = pd.DataFrame(rows)
    if df.empty:
        st.info("No patient data to plot.")
        return

    # Apply min confidence filter
    df = df[(df['audio_conf'] >= min_conf) | (df['text_conf'] >= min_conf)]
    if df.empty:
        st.info("No patient entries pass the confidence filter.")
        return

    # Aggregation modes
    if agg_mode == "Time window":
        # Bin by window and aggregate majority labels and mean confidence
        df['window'] = (df['time'] // window_size).astype(int)
        agg_rows = []
        for w, group in df.groupby('window'):
            t = group['time'].mean()
            # majority audio label
            audio_label = group['audio_emotion'].mode().iloc[0] if not group['audio_emotion'].mode().empty else 'unknown'
            text_label = group['text_emotion'].mode().iloc[0] if not group['text_emotion'].mode().empty else 'N/A'
            agg_rows.append({'time': t, 'audio_emotion': audio_label, 'text_emotion': text_label,
                             'audio_conf': group['audio_conf'].mean(), 'text_conf': group['text_conf'].mean(), 'count': len(group)})
        df_plot = pd.DataFrame(agg_rows)
    elif agg_mode == "Aggregate N segments":
        # Group patient segments into `agg_bins` approximately-equal bins
        n = max(1, int(agg_bins))
        df_plot = df.copy()
        if len(df_plot) <= n:
            # Not enough segments to aggregate; keep per-utterance view
            df_plot = df_plot
        else:
            groups = np.array_split(df_plot, n)
            agg_rows = []
            for group in groups:
                if group.empty:
                    continue
                t = group['time'].mean()
                audio_label = group['audio_emotion'].mode().iloc[0] if not group['audio_emotion'].mode().empty else 'unknown'
                text_label = group['text_emotion'].mode().iloc[0] if not group['text_emotion'].mode().empty else 'N/A'
                agg_rows.append({'time': t, 'audio_emotion': audio_label, 'text_emotion': text_label,
                                 'audio_conf': group['audio_conf'].mean(), 'text_conf': group['text_conf'].mean(), 'count': len(group)})
            df_plot = pd.DataFrame(agg_rows)
    elif agg_mode == "Change-only":
        # Keep only rows where either label changes from previous
        df_plot = df.copy()
        df_plot = df_plot.reset_index(drop=True)
        keep = [0]
        for i in range(1, len(df_plot)):
            prev = df_plot.loc[i-1]
            cur = df_plot.loc[i]
            if cur['audio_emotion'] != prev['audio_emotion'] or cur['text_emotion'] != prev['text_emotion']:
                keep.append(i)
        df_plot = df_plot.loc[keep]
    else:
        df_plot = df.copy()

    # Downsample if too many points
    if len(df_plot) > max_points:
        idxs = list(pd.Series(df_plot.index).astype(int).sample(n=max_points, random_state=42))
        df_plot = df_plot.loc[sorted(idxs)].reset_index(drop=True)

    # Map emotion labels to numeric indices (used for both Altair and fallback plotting)
    labels = sorted(list(set(df_plot['audio_emotion'].unique()).union(set(df_plot['text_emotion'].unique()))))
    label_to_idx = {label: i for i, label in enumerate(labels)}
    df_plot = df_plot.copy()
    df_plot['audio_idx'] = df_plot['audio_emotion'].map(label_to_idx)
    df_plot['text_idx'] = df_plot['text_emotion'].map(label_to_idx)

    # Ensure 'time' is numeric and has at least a simple index if identical
    try:
        df_plot['time'] = pd.to_numeric(df_plot['time'], errors='coerce')
    except Exception:
        pass
    if df_plot['time'].isna().all() or df_plot['time'].nunique() < 2:
        # Replace time with index to ensure Altair can plot
        df_plot = df_plot.reset_index(drop=True)
        df_plot['time'] = df_plot.index.astype(float)

    # Simple summary tables (normalize to canonical labels and ensure all canonical labels present)
    st.subheader("Summary: counts and co-occurrence (audio vs text)")
    try:
        df_norm = df.copy()
        df_norm['audio_canon'] = df_norm['audio_emotion'].apply(normalize_emotion_label)
        df_norm['text_canon'] = df_norm['text_emotion'].apply(normalize_emotion_label)

        canonical = ['joy', 'sadness', 'anger', 'neutral', 'disgust', 'fear', 'surprise']
        display_name = lambda x: 'Joy (Happiness)' if x == 'joy' else x.title()

        co = pd.crosstab(df_norm['audio_canon'].map(display_name), df_norm['text_canon'].map(display_name))
        # Ensure all canonical labels are present as rows/cols
        all_display = [display_name(x) for x in canonical]
        co = co.reindex(index=all_display, columns=all_display, fill_value=0)
        st.dataframe(co)
    except Exception:
        st.write("Could not compute co-occurrence table.")

    # Plotting: prefer Plotly for robust Streamlit rendering; fallback to Altair, then to streamlit.line_chart
    plotted = False
    try:
        import plotly.graph_objects as go

        # Build plotly figure with two lines (audio, text)
        fig = go.Figure()

        # Convert to canonical labels for plotting and hover
        df_plot['audio_canon'] = df_plot['audio_emotion'].apply(normalize_emotion_label)
        df_plot['text_canon'] = df_plot['text_emotion'].apply(normalize_emotion_label)

        canonical = ['joy', 'sadness', 'anger', 'neutral', 'disgust', 'fear', 'surprise']
        display_map = {c: ('Joy (Happiness)' if c == 'joy' else c.title()) for c in canonical}
        # ensure indices correspond to canonical order
        label_to_idx = {c: i for i, c in enumerate(canonical)}

        # audio and text indices
        audio_idx = [label_to_idx.get(x, len(canonical)) for x in df_plot['audio_canon']]
        text_idx = [label_to_idx.get(x, len(canonical)) for x in df_plot['text_canon']]

        # audio line
        fig.add_trace(go.Scatter(x=df_plot['time'].astype(float), y=audio_idx,
                             mode='lines+markers', name='audio', line=dict(color='steelblue')))
        # text line
        fig.add_trace(go.Scatter(x=df_plot['time'].astype(float), y=text_idx,
                             mode='lines+markers', name='text', line=dict(color='orange')))

        # y-axis ticks -> map numeric indices back to canonical display labels
        tickvals = list(range(len(canonical)))
        ticktext = [display_map[c] for c in canonical]
        # Force y-axis to cover the full canonical range so missing labels still display
        fig.update_layout(
            height=360,
            xaxis_title='Time (s)',
            yaxis=dict(
                tickmode='array',
                tickvals=tickvals,
                ticktext=ticktext,
                title='Emotion (labels)',
                range=[-0.5, float(len(canonical) - 0.5)],
                autorange=False
            )
        )

        # show confidence in hover
        hover_text_audio = [f"time: {t:.2f}s\nemotion: {display_map.get(normalize_emotion_label(e),'Unknown')}\nconf: {c:.2f}" for t, e, c in zip(df_plot['time'], df_plot['audio_emotion'], df_plot['audio_conf'])]
        hover_text_text = [f"time: {t:.2f}s\nemotion: {display_map.get(normalize_emotion_label(e),'Unknown')}\nconf: {c:.2f}" for t, e, c in zip(df_plot['time'], df_plot['text_emotion'], df_plot['text_conf'])]
        if len(fig.data) >= 1:
            fig.data[0].update(hovertext=hover_text_audio, hoverinfo='text')
        if len(fig.data) >= 2:
            fig.data[1].update(hovertext=hover_text_text, hoverinfo='text')

        with st.expander("Plot debug (df_plot)", expanded=False):
            st.dataframe(df_plot.head(40))

        st.plotly_chart(fig, use_container_width=True)
        plotted = True
    except Exception:
        # Plotly not available or failed; try Altair
        pass

    if not plotted and alt is not None:
        try:
            import json

            # create a consistent mapping from emotion label -> numeric index
            labels = sorted(list(set(df_plot['audio_emotion'].unique()).union(set(df_plot['text_emotion'].unique()))))
            label_to_idx = {label: i for i, label in enumerate(labels)}

            # map labels to numeric indices for plotting
            df_plot = df_plot.copy()
            df_plot['audio_idx'] = df_plot['audio_emotion'].map(label_to_idx)
            df_plot['text_idx'] = df_plot['text_emotion'].map(label_to_idx)

            # Melt to long format so we can plot both series on the same axes with a legend
            df_long = pd.DataFrame({
                'time': list(df_plot['time']) + list(df_plot['time']),
                'emotion_label': list(df_plot['audio_emotion']) + list(df_plot['text_emotion']),
                'emotion_idx': list(df_plot['audio_idx']) + list(df_plot['text_idx']),
                'confidence': list(df_plot['audio_conf']) + list(df_plot['text_conf']),
                'source': ['audio'] * len(df_plot) + ['text'] * len(df_plot)
            })

            # If only a single unique time exists, jitter slightly so lines/points render
            if df_long['time'].nunique() == 1 and len(df_long) > 1:
                jitter = np.linspace(-0.001, 0.001, num=len(df_long))
                df_long['time'] = df_long['time'].astype(float) + jitter

            # Debug info for cases where chart doesn't appear
            with st.expander("Plot debug (df_plot & df_long)", expanded=False):
                st.write("df_plot:")
                st.dataframe(df_plot.head(20))
                st.write("df_long:")
                st.dataframe(df_long.head(40))

            label_map_json = json.dumps({str(v): k for k, v in label_to_idx.items()})
            label_expr = f"({label_map_json})[String(datum.value)]"

            base_tooltip = ['time:Q', 'emotion_label:N', 'confidence:Q', 'source:N']

            chart = alt.Chart(df_long).mark_line(point=True).encode(
                x=alt.X('time:Q', title='Time (s)'),
                y=alt.Y('emotion_idx:Q', title='Emotion (labels)', axis=alt.Axis(tickCount=len(labels), labelExpr=label_expr)),
                color=alt.Color('source:N', title='Source', scale=alt.Scale(domain=['audio', 'text'], range=['steelblue', 'orange'])),
                tooltip=base_tooltip
            ).properties(height=320)

            st.altair_chart(chart, use_container_width=True)

            # Small legend and label mapping for clarity
            with st.expander("Legend & emotion labels", expanded=False):
                st.markdown("**Lines:** Blue = Audio emotion, Orange = Text emotion")
                for label, idx in label_to_idx.items():
                    st.write(f"{idx}: {label}")

            plotted = True

        except Exception as e:
            # If Altair exists but plotting fails, try the Streamlit fallback and show debug info
            st.warning(f"Altair plotting failed: {e}")
            try:
                st.write("Attempting fallback Streamlit line chart...")
                df_line = df_plot[['time', 'audio_idx', 'text_idx']].set_index('time').sort_index()
                st.line_chart(df_line)
                with st.expander("Plot debug info (Altair error)"):
                    st.write("Altair error:")
                    st.write(str(e))
                    st.write(f"Data points: {len(df_plot)}")
                    st.write(df_plot.head(10))
                plotted = True
            except Exception as fe:
                st.warning(f"Fallback line chart also failed: {fe}")
                st.write(df_plot[['time', 'audio_emotion', 'audio_conf', 'text_emotion', 'text_conf']])
                plotted = True

    # Also show a small bar summary of audio vs text counts
    try:
        st.subheader("Emotion counts (Audio vs Text)")
        audio_counts = df['audio_emotion'].value_counts()
        text_counts = df['text_emotion'].value_counts()
        summary_df = pd.DataFrame({'audio_count': audio_counts, 'text_count': text_counts}).fillna(0).astype(int)
        st.dataframe(summary_df)
    except Exception:
        pass

# ============================================================================
# MAIN APPLICATION
# ============================================================================

def main():
    """Main Streamlit application"""
    
    # Load environment variables
    load_dotenv()
    
    # Get API keys from environment
    openai_api_key = os.getenv("OPENAI_API_KEY")
    hf_token = os.getenv("HF_TOKEN")
    
    # Title and description
    st.title("🎙️ Urdu Audio Emotion Recognition & Translation")
    st.markdown("""
    **Therapist-Patient Conversation Analysis Tool**
    
    This application analyzes Urdu audio conversations and provides:
    - 🎤 Accurate transcription
    - 👥 Speaker identification (diarization)
    - 😊 Emotion recognition
    - 🌐 Context-aware English translation
    """)
    
    st.divider()
    
    # Sidebar for configuration and status
    with st.sidebar:
        st.header("⚙️ Configuration Status")
        
        # Show API key status
        if openai_api_key:
            st.success("✅ OpenAI API Key: Loaded")
        else:
            st.error("❌ OpenAI API Key: Missing")
            st.info("Set OPENAI_API_KEY in your .env file")
        
        if hf_token:
            st.success("✅ HuggingFace Token: Loaded")
        else:
            st.error("❌ HuggingFace Token: Missing")
            st.info("Set HF_TOKEN in your .env file")
        
        st.divider()
        
        st.markdown("""
        ### 📖 How to Use
        1. Upload an audio file
        2. Click 'Analyze Audio'
        3. Review the results
        
        ### 🔑 API Keys Setup
        Create a `.env` file in the project root with:
        ```
        OPENAI_API_KEY=your_openai_key_here
        HF_TOKEN=your_huggingface_token_here
        ```
        
        - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)
        - **HuggingFace**: Get from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
        
        ### 📝 Note
        Make sure to accept the PyAnnote model terms at:
        [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
        """)
        # Utterance merging setting moved to the sidebar so it's visible before analysis
        st.markdown("""
        ### 🧩 Utterance merging settings
        Use the slider below to control how long a silence inside a same-speaker run is
        allowed before we split it into a new utterance.
        """)
        max_pause = st.slider(
            "Max pause inside same-speaker utterance (s)",
            min_value=0.2,
            max_value=2.0,
            value=0.7,
            step=0.05,
            help="If the same speaker has a silence longer than this, split into a new utterance."
        )
        # Plot controls shown up-front so users can configure before running analysis
        st.markdown("""
        ### 📊 Plot Controls
        Adjust plotting / aggregation options before running analysis. Patient speaker selection
        will appear after analysis completes.
        """)
        agg_mode = st.selectbox("Aggregation mode", options=["Per utterance", "Time window", "Change-only", "Aggregate N segments"], index=0)
        window_size = st.slider("Window size for aggregation (s)", 10, 120, 30, 5)
        max_points = st.slider("Max points to display", 50, 1000, 300, 50)
        min_conf = st.slider("Min confidence filter (both audio/text)", 0.0, 1.0, 0.0, 0.05)
        # If using the "Aggregate N segments" mode, choose number of bins
        agg_bins = st.number_input(
            "Aggregate bins (N)",
            min_value=1,
            max_value=50,
            value=4,
            step=1,
            help="Number of aggregate bins when using 'Aggregate N segments' mode."
        )
        # Expected number of speakers: 0 = auto (no hint)
        expected_speakers = st.number_input(
            "Expected number of speakers (0 = auto)",
            min_value=0,
            max_value=10,
            value=0,
            step=1,
            help="If you know how many speakers are in the audio, set this to reduce over-segmentation."
        )
        st.markdown("""
        **Auto-collapse over-segmented labels**
        If diarization returns many small speaker labels, enable this to merge minor labels into the major speakers.
        """)
        auto_collapse = st.checkbox("Auto-collapse small labels into N speakers", value=False)
        collapse_target = st.number_input("Collapse target speakers (N)", min_value=1, max_value=10, value=2, step=1) if auto_collapse else 0
    
    # Check if API keys are provided
    if not openai_api_key or not hf_token:
        st.error("❌ Missing API keys. Please set OPENAI_API_KEY and HF_TOKEN in your .env file")
        st.info("Create a .env file in the project root with your API keys")
        return
    
    # Initialize clients and models
    try:
        with st.spinner("Loading models... (This may take a moment on first run)"):
            openai_client = get_openai_client(openai_api_key)
            emotion_model, feature_extractor = load_emotion_model()
            diarization_pipeline = load_diarization_pipeline(hf_token)
        st.success("✅ Models loaded successfully!")
    except Exception as e:
        st.error(f"❌ Failed to load models: {str(e)}")
        return
    
    # Upload audio file
    audio_path = upload_audio_file()
    
    if audio_path is None:
        st.info("👆 Please upload an audio file to begin analysis")
        return
    
    st.divider()
    
    # Process button
    if st.button("🚀 Analyze Audio", type="primary", use_container_width=True):
        
        # Step 0: Resample early to a clean 16k WAV to avoid decoder issues with pyannote
        audio_array, resampled_path = resample_audio_to_16khz(audio_path)
        if audio_array is None or resampled_path is None:
            st.error("❌ Audio resampling failed. Cannot continue.")
            return

        # Step 1: Speaker diarization (use the resampled WAV to avoid AudioDecoder issues)
        if expected_speakers and expected_speakers > 0:
            segments = perform_speaker_diarization(resampled_path, diarization_pipeline, min_speakers=expected_speakers, max_speakers=expected_speakers)
        else:
            segments = perform_speaker_diarization(resampled_path, diarization_pipeline)

        # If auto-collapse was selected, try collapsing labels to the requested target
        if auto_collapse:
            try:
                before = len(set([s['speaker'] for s in segments]))
                segments = collapse_speaker_labels(segments, target_n=collapse_target)
                after = len(set([s['speaker'] for s in segments]))
                st.info(f"Auto-collapsed speaker labels: {before} -> {after}")
            except Exception as e:
                st.warning(f"Auto-collapse failed: {e}")

        if not segments:
            st.error("❌ No segments found. Please try a different audio file.")
            return

        # Merge consecutive same-speaker turns into utterances, splitting on long pauses
        utterances = merge_consecutive_speaker_turns(segments, max_pause=max_pause)

        # Step 2: Emotion recognition (use the resampled audio array) on utterances
        segments_with_emotions = analyze_emotions_for_segments(
            audio_array,
            utterances,
            emotion_model,
            feature_extractor
        )
        
        # Step 3: Translation (use the resampled WAV for segment extraction/transcription)
        final_segments = translate_all_segments(
            resampled_path,
            segments_with_emotions,
            openai_client
        )

        # Allow explicit selection of which speaker is the patient (default: second speaker)
        speakers = sorted(list({s['speaker'] for s in final_segments}))
        default_patient = speakers[1] if len(speakers) > 1 else speakers[0]
        patient_speaker = st.selectbox("Select patient speaker (for text/audio plotting)", options=speakers, index=1 if len(speakers) > 1 else 0)

        # Compute per-utterance text-emotion for the chosen patient and attach to segments
        try:
            tokenizer_text, text_model = load_text_emotion_model()
        except Exception:
            tokenizer_text = text_model = None

        # Build a mapping of patient segments and predict text emotions for each utterance (if English text exists)
        patient_segments_indices = [i for i, s in enumerate(final_segments) if s['speaker'] == patient_speaker]
        patient_texts = [final_segments[i].get('english','').strip() or '' for i in patient_segments_indices]
        patient_text_emotions = []
        if tokenizer_text and text_model and any(t for t in patient_texts):
            try:
                patient_text_emotions = predict_text_emotions(patient_texts, tokenizer_text, text_model)
            except Exception:
                patient_text_emotions = []

        # Attach text emotion results back to final_segments
        for idx, seg_idx in enumerate(patient_segments_indices):
            if idx < len(patient_text_emotions):
                te = patient_text_emotions[idx]
                final_segments[seg_idx]['text_emotion'] = te.get('emotion')
                final_segments[seg_idx]['text_confidence'] = te.get('confidence')
            else:
                final_segments[seg_idx]['text_emotion'] = final_segments[seg_idx].get('text_emotion', 'N/A')
                final_segments[seg_idx]['text_confidence'] = final_segments[seg_idx].get('text_confidence', 0.0)

        # Step 4: Display results
        st.divider()
        display_results(final_segments)

        # Step 5: Text-based emotion analysis for patient (sentence-level view)
        st.divider()
        perform_patient_text_emotion_analysis(final_segments)

        # Step 6: Plot patient-level emotion timeline and summaries
        st.divider()
        st.header("📈 Patient Emotion Overview (Audio vs Text)")

        # Note: plotting controls are defined in the sidebar before analysis so they're
        # available to adjust prior to running. The patient speaker selectbox is shown
        # after analysis when speaker IDs are known.

        try:
            plot_patient_emotions(final_segments, patient_speaker, agg_mode=agg_mode, window_size=window_size, max_points=max_points, min_conf=min_conf, agg_bins=agg_bins)
        except Exception as e:
            st.warning(f"Plotting failed: {e}")

        # Step 6: Build a combined copy-paste-friendly report and offer download
        st.divider()
        st.header("📋 Combined Copy-Paste Report")
        combined_report = build_combined_copy_paste_report(final_segments)
        if combined_report:
            st.info("Below is a combined report you can copy-paste into Word. A download button is also available.")
            st.text_area("Combined Report (copy-paste)", combined_report, height=600)
            try:
                st.download_button("⬇️ Download Combined Report (TXT)", combined_report, file_name="combined_report.txt", mime="text/plain")
            except Exception:
                # Some Streamlit versions differ in signature; ignore if not available
                pass
        else:
            st.warning("No combined report generated.")

        # Cleanup
        try:
            os.unlink(audio_path)
            if resampled_path and os.path.exists(resampled_path):
                os.unlink(resampled_path)
        except:
            pass

    # If we have stored results in session_state from a previous analysis, show them
    if 'final_segments' in st.session_state:
        final_segments = st.session_state['final_segments']
        speakers = st.session_state.get('speakers', sorted(list({s['speaker'] for s in final_segments})))
        default_patient = speakers[1] if len(speakers) > 1 else speakers[0]
        # Use a stable key so selecting patient doesn't re-trigger analysis
        patient_speaker = st.selectbox("Select patient speaker (for text/audio plotting)", options=speakers, index=1 if len(speakers) > 1 else 0, key='patient_speaker')

        # Ensure text-emotion fields are present (they were computed during analysis when possible)
        for s in final_segments:
            s['text_emotion'] = s.get('text_emotion', s.get('text_emotion', 'N/A'))
            s['text_confidence'] = s.get('text_confidence', s.get('text_confidence', 0.0))

        # Display stored results and plotting without re-running heavy computations
        st.divider()
        display_results(final_segments)

        st.divider()
        perform_patient_text_emotion_analysis(final_segments)

        st.divider()
        st.header("📈 Patient Emotion Overview (Audio vs Text)")
        try:
            plot_patient_emotions(final_segments, patient_speaker, agg_mode=agg_mode, window_size=window_size, max_points=max_points, min_conf=min_conf, agg_bins=agg_bins)
        except Exception as e:
            st.warning(f"Plotting failed: {e}")

        # Option to clear stored analysis
        if st.button("Clear analysis and upload new file"):
            for k in ['final_segments', 'speakers', 'patient_speaker']:
                if k in st.session_state:
                    del st.session_state[k]

        # Persist results so UI interactions (like selecting patient speaker) don't force re-run
        try:
            st.session_state['final_segments'] = final_segments
            st.session_state['speakers'] = speakers
        except Exception:
            pass


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()

