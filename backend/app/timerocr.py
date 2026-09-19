"""Shot-timer photo OCR — reads the time off a timer's LED/LCD display.

Behind a small interface so the backend (Tesseract now, a cloud vision
API later) swaps without touching call sites — same pattern as storage.py.

Seven-segment displays are hard for general OCR: we preprocess hard
(grayscale, threshold, invert red-on-black) and try a few variants,
then pull the most time-like number out. The result is always a
SUGGESTION the shooter confirms — never trusted blindly.
"""
import io
import logging
import os
import re

log = logging.getLogger("rangeday.timerocr")

OCR_ENGINE = os.environ.get("TIMER_OCR_ENGINE", "tesseract").lower()

try:
    import pytesseract
    from PIL import Image, ImageOps, ImageFilter
    _OK = True
except Exception:  # pragma: no cover
    _OK = False

# A plausible shot-timer time: 1-3 digits, a dot, 2 digits (e.g. 2.34, 12.07)
_TIME_RE = re.compile(r"(\d{1,3})[.,](\d{2})")


def available() -> bool:
    if not _OK:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _variants(raw: bytes):
    img = Image.open(io.BytesIO(raw)).convert("L")  # grayscale
    # upscale small crops — helps segmented digits
    if max(img.size) < 900:
        scale = 900 / max(img.size)
        img = img.resize((int(img.width * scale), int(img.height * scale)))
    base = ImageOps.autocontrast(img)
    yield base
    # binary threshold both polarities (LED is usually light-on-dark)
    thresh = base.point(lambda p: 255 if p > 128 else 0)
    yield thresh
    yield ImageOps.invert(thresh)
    yield base.filter(ImageFilter.SHARPEN)


def read_time(raw: bytes) -> dict:
    """Return {candidates: [float,...], best: float|None, raw_text: str}.
    candidates are all time-like numbers found, most confident first."""
    if not available():
        return {"candidates": [], "best": None, "raw_text": "", "engine": "unavailable"}

    # digits + separators only; single line
    config = "--psm 7 -c tessedit_char_whitelist=0123456789.,: "
    seen: list[float] = []
    all_text = []
    for im in _variants(raw):
        try:
            txt = pytesseract.image_to_string(im, config=config)
        except Exception:
            continue
        all_text.append(txt.strip())
        for m in _TIME_RE.finditer(txt.replace(" ", "")):
            whole, frac = m.group(1), m.group(2)
            try:
                val = float(f"{whole}.{frac}")
            except ValueError:
                continue
            # sane range for a shot-timer total or split
            if 0.05 <= val <= 600 and val not in seen:
                seen.append(val)
    return {
        "candidates": seen[:5],
        "best": seen[0] if seen else None,
        "raw_text": " | ".join(t for t in all_text if t)[:200],
        "engine": "tesseract",
    }
