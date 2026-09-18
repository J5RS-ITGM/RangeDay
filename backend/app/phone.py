"""Phone verification: Twilio Verify when configured, logged dev codes when not.

Twilio Verify (not raw SMS) is deliberate: raw application SMS from a
US number requires A2P 10DLC campaign registration before carriers will
deliver it reliably; Verify uses Twilio's own registered senders and
works immediately. Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
TWILIO_VERIFY_SID (a Verify Service SID, starts with "VA").
"""
import hashlib
import logging
import os
import re
import secrets

import requests as http

log = logging.getLogger("rangeday.phone")

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFY_SID = os.environ.get("TWILIO_VERIFY_SID", "")

# "required" gates public signup behind a verified phone; anything else = off.
PHONE_VERIFICATION = os.environ.get("PHONE_VERIFICATION", "off").lower()

twilio_configured = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SID)
verification_required = PHONE_VERIFICATION == "required"

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(raw: str) -> str | None:
    """Accept common US formats; return E.164 or None."""
    p = re.sub(r"[\s().-]", "", raw.strip())
    if re.fullmatch(r"\d{10}", p):
        p = "+1" + p
    elif re.fullmatch(r"1\d{10}", p):
        p = "+" + p
    return p if _E164.fullmatch(p) else None


def start_verification(phone: str) -> str | None:
    """Send a code. Returns a dev code hash to store when Twilio is absent,
    or None when Twilio handled delivery (nothing for us to store)."""
    if twilio_configured:
        r = http.post(
            f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SID}/Verifications",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"To": phone, "Channel": "sms"},
            timeout=15,
        )
        r.raise_for_status()
        return None
    code = f"{secrets.randbelow(1000000):06d}"
    log.warning("Twilio not configured — verification code for %s: %s", phone, code)
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()


def check_with_twilio(phone: str, code: str) -> bool:
    r = http.post(
        f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SID}/VerificationCheck",
        auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
        data={"To": phone, "Code": code},
        timeout=15,
    )
    if r.status_code == 404:
        return False  # expired or never started
    r.raise_for_status()
    return r.json().get("status") == "approved"


def dev_code_hash(phone: str, code: str) -> str:
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()
