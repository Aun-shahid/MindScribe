"""
Speaker Correction Service - Uses GPT-4o to correct speaker labels based on conversation context.
Identifies THERAPIST vs PATIENT in therapeutic dialogue using conversational pattern analysis.
"""
import json
import logging
from typing import List, Dict, Optional, Tuple
from openai import AsyncOpenAI, OpenAI

logger = logging.getLogger(__name__)


def build_gpt_correction_prompt(segments: List[Dict]) -> Tuple[str, str]:
    """
    Build a sophisticated GPT prompt for speaker correction.
    
    Returns:
        Tuple of (prompt, conversation_text)
    """
    # Build conversation for analysis
    conversation_lines = []
    detected_languages = set()
    
    for idx, seg in enumerate(segments, 1):
        speaker = seg.get('speaker', 'UNKNOWN')
        text = seg.get('urdu', '') or seg.get('text', '')
        text = text.strip() or '[No text]'
        lang = seg.get('language', 'Urdu')
        
        if lang in ['English', 'Urdu']:
            detected_languages.add(lang)
        
        time_str = f"{seg.get('start', 0):.1f}s-{seg.get('end', 0):.1f}s"
        conversation_lines.append(f"Line {idx} [{speaker}] ({time_str}): {text}")
    
    conversation_text = "\n".join(conversation_lines)
    
    # Create language note
    if detected_languages:
        lang_list = sorted(list(detected_languages))
        language_note = f"\n**NOTE: This conversation contains {' and '.join(lang_list)} language(s).**\n"
    else:
        language_note = "\n**NOTE: This conversation is in Urdu or English.**\n"
    
    # Sophisticated GPT prompt with therapeutic patterns
    prompt = f"""You are an expert in analyzing therapeutic conversations between a therapist and a patient.
{language_note}
You will receive a diarized conversation with speaker labels (SPEAKER_00, SPEAKER_01, etc.) that may be INCORRECT.
Your task is to correct these labels to THERAPIST and PATIENT based on conversational patterns.

**CRITICAL PATTERNS:**

**THERAPIST characteristics:**
- Asks open-ended questions: "آپ کیسا محسوس کر رہے ہیں؟" (How are you feeling?)
- Uses reflective listening: "میں سمجھتا ہوں" (I understand)
- Probes for details: "کیا آپ مجھے بتا سکتے ہیں..." (Can you tell me...)
- Provides guidance and reassurance
- Maintains professional, calm tone
- Typically initiates/first speaker
- Asks "when", "why", "how" questions

**PATIENT characteristics:**
- Answers questions directly
- Shares personal experiences: "مجھے بہت پریشانی ہے" (I'm very worried)
- Describes symptoms, feelings, problems
- Expresses distress, confusion, uncertainty
- Responds to therapist's prompts
- Uses first-person narratives ("I feel", "I can't")

**EXAMPLE CONVERSATION (LEARN THESE PATTERNS):**

**Urdu Example:**
Line 1 [SPEAKER_00]: السلام علیکم، آج آپ کیسا محسوس کر رہے ہیں؟
Line 2 [SPEAKER_01]: وعلیکم السلام، میں بہت پریشان ہوں
Line 3 [SPEAKER_00]: کیا آپ مجھے بتا سکتے ہیں کہ کیا ہوا؟
Line 4 [SPEAKER_01]: میری نوکری چلی گئی اور مجھے نیند نہیں آتی
Line 5 [SPEAKER_00]: یہ واقعی مشکل وقت ہے۔ آپ کو یہ احساس کب سے ہو رہا ہے؟
Line 6 [SPEAKER_01]: پچھلے دو ہفتوں سے

**CORRECTED:**
{{"1": "THERAPIST", "2": "PATIENT", "3": "THERAPIST", "4": "PATIENT", "5": "THERAPIST", "6": "PATIENT"}}

---

**ANALYZE THIS CONVERSATION:**

{conversation_text}

**INSTRUCTIONS:**
1. Analyze each line's content and conversational role
2. Identify who asks questions (THERAPIST) vs who answers (PATIENT)
3. Look for professional guidance vs personal sharing
4. Return ONLY a JSON object with corrected labels
5. Format: {{"1": "THERAPIST", "2": "PATIENT", ...}}
6. Every line MUST have "THERAPIST" or "PATIENT"
7. NO explanations, just JSON
"""
    
    return prompt, conversation_text


async def correct_speakers_with_gpt_async(
    segments: List[Dict],
    openai_client: AsyncOpenAI
) -> List[Dict]:
    """
    Use GPT-4o to correct speaker labels based on conversation context.
    Async version for FastAPI.
    
    Args:
        segments: List of diarization segments with text
        openai_client: AsyncOpenAI client
        
    Returns:
        Segments with corrected speaker labels
    """
    if not segments or len(segments) == 0:
        return segments
    
    try:
        prompt, conversation_text = build_gpt_correction_prompt(segments)
        
        logger.info("Sending conversation to GPT-4o for speaker correction...")
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert conversational analyst specializing in therapeutic dialogue. "
                               "You identify therapist vs patient roles with high accuracy by analyzing "
                               "question-answer patterns, professional tone, and emotional disclosure."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        correction_text = response.choices[0].message.content.strip()
        
        # Parse JSON from response
        if "```json" in correction_text:
            correction_text = correction_text.split("```json")[1].split("```")[0].strip()
        elif "```" in correction_text:
            correction_text = correction_text.split("```")[1].split("```")[0].strip()
        
        corrections = json.loads(correction_text)
        
        # Apply corrections
        corrected_segments = []
        for idx, seg in enumerate(segments, 1):
            new_seg = seg.copy()
            if str(idx) in corrections:
                new_seg['speaker'] = corrections[str(idx)]
                new_seg['original_speaker'] = seg.get('speaker')
            corrected_segments.append(new_seg)
        
        changes = sum(
            1 for i, seg in enumerate(segments)
            if seg.get('speaker') != corrected_segments[i].get('speaker')
        )
        
        logger.info(f"GPT-4o corrected {changes} speaker labels")
        
        return corrected_segments
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse GPT response as JSON: {e}")
        # Return original segments if parsing fails
        return segments
    except Exception as e:
        logger.error(f"Speaker correction error: {e}")
        return segments


def correct_speakers_with_gpt_sync(
    segments: List[Dict],
    openai_client: OpenAI
) -> List[Dict]:
    """
    Synchronous version of speaker correction for use in thread pools.
    
    Args:
        segments: List of diarization segments with text
        openai_client: Sync OpenAI client
        
    Returns:
        Segments with corrected speaker labels
    """
    if not segments or len(segments) == 0:
        return segments
    
    try:
        prompt, _ = build_gpt_correction_prompt(segments)
        
        logger.info("Sending conversation to GPT-4o for speaker correction (sync)...")
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert conversational analyst specializing in therapeutic dialogue. "
                               "You identify therapist vs patient roles with high accuracy by analyzing "
                               "question-answer patterns, professional tone, and emotional disclosure."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        correction_text = response.choices[0].message.content.strip()
        
        # Parse JSON from response
        if "```json" in correction_text:
            correction_text = correction_text.split("```json")[1].split("```")[0].strip()
        elif "```" in correction_text:
            correction_text = correction_text.split("```")[1].split("```")[0].strip()
        
        corrections = json.loads(correction_text)
        
        # Apply corrections
        corrected_segments = []
        for idx, seg in enumerate(segments, 1):
            new_seg = seg.copy()
            if str(idx) in corrections:
                new_seg['speaker'] = corrections[str(idx)]
                new_seg['original_speaker'] = seg.get('speaker')
            corrected_segments.append(new_seg)
        
        return corrected_segments
        
    except Exception as e:
        logger.error(f"Speaker correction sync error: {e}")
        return segments
