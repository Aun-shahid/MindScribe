import json
with open('scripts/out.json', encoding='utf-8') as f:
    data = json.load(f)
segs = data['segments']
print('=== First 12 segments with roles ===')
for s in segs[:12]:
    role = s['speaker']
    audio = s.get('emotion_audio_raw', '?')
    final = s.get('final_emotion', '?')
    text = s['translated'][:70]
    print(f"  [{s['start']:.1f}s] {role:10s} | audio={audio:8s} | final={final:8s} | {text}")
print()
therapist = [s for s in segs if s['speaker'] == 'THERAPIST']
patient = [s for s in segs if s['speaker'] == 'PATIENT']
print(f'Total: {len(therapist)} THERAPIST, {len(patient)} PATIENT segments')
print()
# Check field structure of first segment
print('=== First segment fields ===')
print(json.dumps(segs[0], ensure_ascii=False, indent=2))
