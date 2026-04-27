from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import torch

class NLLBTranslator:
    """
    Service for high-quality translation using Meta's NLLB-200 model.
    Handles 200+ languages including high-quality Urdu (urd_Arab) support.
    """
    def __init__(self, model_name="facebook/nllb-200-3.3B", device=None):
        self.device = device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading NLLB model {model_name} on {self.device}...")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        # Using float16 for 3.3B model to save VRAM if on GPU
        torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            model_name, 
            torch_dtype=torch_dtype
        ).to(self.device)
        print("Model loaded successfully.")

    def translate(self, text, src_lang="urd_Arab", tgt_lang="eng_Latn", max_length=512):
        """
        Translates text from source language to target language.
        Common codes:
        - Urdu: urd_Arab
        - English: eng_Latn
        """
        if not text:
            return ""

        # Set source language for tokenizer
        self.tokenizer.src_lang = src_lang
        
        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)
        
        # Generate translation
        # Note: forced_bos_token_id is crucial for NLLB to specify the target language
        translated_tokens = self.model.generate(
            **inputs, 
            forced_bos_token_id=self.tokenizer.lang_code_to_id[tgt_lang], 
            max_length=max_length,
            num_beams=4,
            early_stopping=True
        )
        
        result = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
        return result

# Initialized instance (could be used as a singleton)
translator = NLLBTranslator()
