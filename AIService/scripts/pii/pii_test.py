import os
import site
from pathlib import Path

# Add nvidia CUDA dlls to path so ctranslate2 can find cublas64_12.dll
try:
    for site_pkg in site.getsitepackages() + [site.getusersitepackages()]:
        nvidia_path = Path(site_pkg) / "nvidia"
        if nvidia_path.exists():
            for bin_dir in nvidia_path.rglob("bin"):
                os.add_dll_directory(str(bin_dir))
                os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ["PATH"]
except Exception:
    pass

from audio_redaction import AudioPrivacyGuard

def main():
    script_dir = Path(__file__).resolve().parent
    input_wav = script_dir / "Pii-test.wav"
    output_txt = script_dir / "pii_output.txt"
    redacted_wav = script_dir / "redacted_audio.wav"
    
    if not input_wav.exists():
        print(f"Error: {input_wav} not found.")
        return

    print("Initializing AudioPrivacyGuard...")
    # Using CPU for production parity
    guard = AudioPrivacyGuard(model_size="small", device="cpu", compute_type="int8")
    
    print(f"Extracting PII segments from {input_wav.name}...")
    segments = guard.get_pii_segments(str(input_wav))
    
    print(f"Saving PII segments to {output_txt.name}...")
    with open(output_txt, "w", encoding="utf-8") as f:
        if not segments:
            msg = "No PII segments detected.\n"
            f.write(msg)
            print(msg.strip())
        for seg in segments:
            line = f"Start: {seg.start:.2f}s, End: {seg.end:.2f}s, Type: {seg.entity_type}, Text: {seg.text}\n"
            f.write(line)
            print(line.strip())
            
    print(f"Redacting audio and saving to {redacted_wav.name}...")
    guard.redact_audio_file(str(input_wav), str(redacted_wav))
    
    print("Test completed successfully.")

if __name__ == "__main__":
    main()