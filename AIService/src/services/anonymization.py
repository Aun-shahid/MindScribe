"""
Rule-based text anonymization for privacy-safe LLM calls.

This module focuses on masking common therapy-session PII in both English and Urdu
before any external model request is made.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Iterable

_ENABLE_ANONYMIZATION = os.getenv("ENABLE_PII_ANONYMIZATION", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}


class PrivacyAnonymizer:
    """Bilingual (English/Urdu) PII anonymizer for therapy transcripts."""

    _URDU_DIGIT_WORDS = [
        "صفر", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "چہ", "سات", "آٹھ", "اٹھ", "نو",
        "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس",
        "بیس", "تیس", "چالیس", "پچاس", "ساٹھ", "ستر", "اسی", "نوے", "سو", "ہزار", "لاکھ",
    ]

    _LOCATION_WORDS = [
        "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
        "Peshawar", "Quetta", "Gulberg", "DHA", "Bahria", "Clifton", "Saddar",
        "لاہور", "کراچی", "اسلام آباد", "راولپنڈی", "فیصل آباد", "ملتان", "پشاور", "کوئٹہ",
    ]

    _COMMON_URDU_NAMES = {
        "احمد", "محمد", "علی", "حسن", "حسین", "فاطمہ", "عائشہ", "مریم", "زینب", "نازیہ",
        "کامران", "سلمان", "حمزہ", "عبداللہ", "رضا", "رحمان", "نادیہ", "عمر", "یاسر", "یوسف",
        "خان", "ملک", "چوہدری", "قریشی", "شیخ", "انصاری", "سید", "اعوان", "راجپوت", "بٹ",
    }

    _COMMON_EN_NAMES = {
        "ahmed", "muhammad", "ali", "hassan", "hussain", "fatima", "ayesha", "maryam", "zainab", "nazia",
        "kamran", "salman", "hamza", "abdullah", "raza", "rahman", "nadia", "umar", "yasir", "yousuf",
        "khan", "malik", "chaudhry", "qureshi", "sheikh", "ansari", "syed", "awan", "rajput", "butt",
    }

    _URDU_MONTHS = {
        "جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"
    }

    _NAME_TITLES = {
        "dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "doctor", "prof", "prof.", "professor",
        "ڈاکٹر", "پروفیسر", "مسٹر", "مس", "محترم", "محترمہ", "جناب",
    }

    @staticmethod
    def _load_external_names() -> set[str]:
        """Load optional external name lexicon (JSON list or newline text)."""
        path = os.getenv("PII_NAME_LEXICON_PATH", "").strip()
        if not path:
            return set()
        if not os.path.exists(path):
            return set()
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = f.read().strip()
            if not raw:
                return set()
            if raw.startswith("["):
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return {str(x).strip() for x in parsed if str(x).strip()}
                return set()
            return {line.strip() for line in raw.splitlines() if line.strip()}
        except Exception:
            return set()

    _NAME_CONTEXT_EN = re.compile(
        r"\b(?:my\s+name\s+is|i\s+am|this\s+is|patient\s+name\s+is|therapist\s+name\s+is)\s+"
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})",
        re.IGNORECASE,
    )

    _NAME_CONTEXT_UR = re.compile(
        r"(?:میرا\s+نام\s+ہے|نام\s+ہے|ان\s+کا\s+نام\s+ہے)\s+([\u0600-\u06FF]{2,}(?:\s+[\u0600-\u06FF]{2,}){0,2})"
    )

    def __init__(self) -> None:
        digit = r"[0-9\u06F0-\u06F9]"
        urdu_digit_word = r"(?:صفر|ایک|دو|تین|چار|پانچ|چھ|چہ|سات|آٹھ|اٹھ|نو|دس|گیارہ|بارہ|تیرہ|چودہ|پندرہ|سولہ|سترہ|اٹھارہ|انیس|بیس|تیس|چالیس|پچاس|ساٹھ|ستر|اسی|نوے|سو|ہزار|لاکھ)"

        self.email_re = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
        self.cnic_re = re.compile(
            rf"(?<![A-Za-z0-9\u06F0-\u06F9]){digit}{{5}}[-\s]?{digit}{{7}}[-\s]?{digit}(?![A-Za-z0-9\u06F0-\u06F9])"
        )
        self.phone_re = re.compile(
            rf"(?<![A-Za-z0-9\u06F0-\u06F9])(?:\+?{digit}{{2}}[-\s]?)?[0\u06F0][3\u06F3]{digit}{{2}}[-\s]?{digit}{{7}}(?![A-Za-z0-9\u06F0-\u06F9])"
        )
        self.date_re = re.compile(
            rf"(?<![0-9\u06F0-\u06F9])(?:{digit}{{1,2}}[/\-.]{digit}{{1,2}}[/\-.]{digit}{{2,4}}|{digit}{{4}}[/\-.]{digit}{{1,2}}[/\-.]{digit}{{1,2}})(?![0-9\u06F0-\u06F9])",
            re.IGNORECASE,
        )
        self.age_re = re.compile(rf"{digit}{{1,3}}\s*(?:years?\s*old|yrs?|سال|عمر)", re.IGNORECASE)
        self.address_re = re.compile(
            r"\b(?:house|flat|plot|street|st\.?|road|rd\.?|lane|avenue|ave|block|sector)\s*(?:no\.?|number|#)?\s*[A-Za-z]?[-/]?\d+[A-Za-z]?\b",
            re.IGNORECASE,
        )

        urdu_words_alt = "|".join(sorted(self._URDU_DIGIT_WORDS, key=len, reverse=True))
        self.urdu_number_sequence_re = re.compile(
            rf"(?:^|[\s،۔؟])(({urdu_words_alt})(?:[\s،\-]+(?:{urdu_words_alt})){{6,18}})(?=[\s،۔؟]|$)"
        )
        self.urdu_cnic_word_re = re.compile(
            rf"(?:^|[\s،۔؟])(({urdu_digit_word})(?:[\s،\-]+(?:{urdu_digit_word})){{12,15}})(?=[\s،۔؟]|$)"
        )
        self.urdu_date_word_re = re.compile(
            rf"({urdu_digit_word}(?:\s+{urdu_digit_word}){{0,2}}\s+(?:{'|'.join(re.escape(m) for m in sorted(self._URDU_MONTHS, key=len, reverse=True))})\s+{urdu_digit_word}(?:\s+{urdu_digit_word}){{0,4}})",
            re.IGNORECASE,
        )
        self.cnic_context_re = re.compile(r"(?:cnic|شناختی\s*کارڈ|identity\s*card|id\s*card)", re.IGNORECASE)
        self.name_title_re = re.compile(
            r"\b(?:dr\.?|mr\.?|mrs\.?|ms\.?|doctor|prof\.?|professor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b",
            re.IGNORECASE,
        )
        self.name_title_ur_re = re.compile(r"(?:ڈاکٹر|پروفیسر|مسٹر|محترم|محترمہ|جناب)\s+([\u0600-\u06FF]{2,}(?:\s+[\u0600-\u06FF]{2,}){0,2})")

        external_names = self._load_external_names()
        external_en = {n.lower() for n in external_names if re.search(r"[A-Za-z]", n)}
        external_ur = {n for n in external_names if re.search(r"[\u0600-\u06FF]", n)}

        self.en_name_word_re = self._build_word_set_regex(self._COMMON_EN_NAMES | external_en, case_insensitive=True)
        self.ur_name_word_re = self._build_word_set_regex(self._COMMON_URDU_NAMES | external_ur, case_insensitive=False)

        self.location_re = re.compile(
            "\\b(?:" + "|".join(re.escape(loc) for loc in self._LOCATION_WORDS if re.search(r"[A-Za-z]", loc)) + ")\\b",
            re.IGNORECASE,
        )

        ur_locations = [loc for loc in self._LOCATION_WORDS if not re.search(r"[A-Za-z]", loc)]
        self.location_ur_re = re.compile("(?:" + "|".join(re.escape(loc) for loc in ur_locations) + ")") if ur_locations else None

    @staticmethod
    def _build_word_set_regex(words: Iterable[str], case_insensitive: bool) -> re.Pattern:
        vals = sorted({w.strip() for w in words if w and w.strip()}, key=len, reverse=True)
        if not vals:
            return re.compile(r"a^")
        pattern = r"\b(?:" + "|".join(re.escape(w) for w in vals) + r")\b"
        return re.compile(pattern, re.IGNORECASE if case_insensitive else 0)

    def anonymize_text(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return text

        out = text
        out = self.email_re.sub("[EMAIL]", out)
        out = self.cnic_re.sub("[CNIC]", out)
        out = self.phone_re.sub("[PHONE]", out)
        out = self.date_re.sub("[DATE]", out)
        out = self.urdu_date_word_re.sub("[DATE]", out)
        out = self.age_re.sub("[AGE]", out)
        out = self.address_re.sub("[ADDRESS]", out)

        out = self._NAME_CONTEXT_EN.sub(lambda m: m.group(0).replace(m.group(1), "[NAME]"), out)
        out = self._NAME_CONTEXT_UR.sub(lambda m: m.group(0).replace(m.group(1), "[NAME]"), out)
        out = self.name_title_re.sub(lambda m: m.group(0).replace(m.group(1), "[NAME]"), out)
        out = self.name_title_ur_re.sub(lambda m: m.group(0).replace(m.group(1), "[NAME]"), out)

        out = self.en_name_word_re.sub("[NAME]", out)
        out = self.ur_name_word_re.sub("[NAME]", out)

        out = self.location_re.sub("[LOCATION]", out)
        if self.location_ur_re:
            out = self.location_ur_re.sub("[LOCATION]", out)

        # Treat long Urdu digit-word sequences as CNIC when context indicates identity card, else phone.
        def _replace_urdu_number_block(m: re.Match) -> str:
            full = m.group(0)
            text_inner = m.group(1)
            before = out[max(0, m.start() - 80):m.start()]
            if self.cnic_context_re.search(before):
                return full.replace(text_inner, "[CNIC]")
            return full.replace(text_inner, "[PHONE]")

        out = self.urdu_cnic_word_re.sub(_replace_urdu_number_block, out)
        out = self.urdu_number_sequence_re.sub(lambda m: m.group(0).replace(m.group(1), "[PHONE]"), out)

        return out


_ANONYMIZER = PrivacyAnonymizer()


def anonymize_text_for_privacy(text: str) -> str:
    """Anonymize a text blob before external model calls."""
    if not _ENABLE_ANONYMIZATION:
        return text
    return _ANONYMIZER.anonymize_text(text)


def anonymize_payload_for_privacy(value: Any) -> Any:
    """Recursively anonymize string values inside dict/list payloads."""
    if not _ENABLE_ANONYMIZATION:
        return value

    if isinstance(value, str):
        return anonymize_text_for_privacy(value)
    if isinstance(value, list):
        return [anonymize_payload_for_privacy(v) for v in value]
    if isinstance(value, tuple):
        return tuple(anonymize_payload_for_privacy(v) for v in value)
    if isinstance(value, dict):
        return {k: anonymize_payload_for_privacy(v) for k, v in value.items()}
    return value
