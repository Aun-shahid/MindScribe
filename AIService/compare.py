import json
import sys

def compare():
    try:
        with open('scripts/out.json', 'r', encoding='utf-8') as f:
            out1 = json.load(f)
        with open('scripts/out2.json', 'r', encoding='utf-8') as f:
            out2 = json.load(f)
    except Exception as e:
        print(f"Error loading files: {e}")
        return

    print("=== Comparison: out.json (ElevenLabs) vs out2.json (OpenAI) ===\n")
    
    seg1 = out1.get('segments', [])
    seg2 = out2.get('segments', [])
    
    print(f"Segment Count: ElevenLabs = {len(seg1)} | OpenAI = {len(seg2)}\n")
    
    print("--- First 5 Segments from ElevenLabs ---")
    for s in seg1[:5]:
        print(f"[{s.get('start', 0):.1f}-{s.get('end', 0):.1f}] {s.get('speaker', '?')}: {s.get('text', '')}")
        print(f"    Emotion: {s.get('final_emotion', 'N/A')} (conf: {s.get('final_emotion_confidence', 'N/A')})\n")

    print("--- First 5 Segments from OpenAI ---")
    for s in seg2[:5]:
        print(f"[{s.get('start', 0):.1f}-{s.get('end', 0):.1f}] {s.get('speaker', '?')}: {s.get('text', '')}")
        print(f"    Emotion: {s.get('final_emotion', 'N/A')} (conf: {s.get('final_emotion_confidence', 'N/A')})\n")
        
if __name__ == '__main__':
    compare()
