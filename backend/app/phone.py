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

class TwilioCreds:
    def __init__(self, account_sid: str, auth_token: str, verify_sid: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.verify_sid = verify_sid

    @property
    def configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.verify_sid)

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(raw: str) -> str | None:
    """Accept common US formats; return E.164 or None."""
    p = re.sub(r"[\s().-]", "", raw.strip())
    if re.fullmatch(r"\d{10}", p):
        p = "+1" + p
    elif re.fullmatch(r"1\d{10}", p):
        p = "+" + p
    return p if _E164.fullmatch(p) else None


def start_verification(phone: str, creds: TwilioCreds) -> str | None:
    """Send a code. Returns a dev code hash to store when Twilio is absent,
    or None when Twilio handled delivery (nothing for us to store)."""
    if creds.configured:
        r = http.post(
            f"https://verify.twilio.com/v2/Services/{creds.verify_sid}/Verifications",
            auth=(creds.account_sid, creds.auth_token),
            data={"To": phone, "Channel": "sms"},
            timeout=15,
        )
        r.raise_for_status()
        return None
    code = f"{secrets.randbelow(1000000):06d}"
    log.warning("Twilio not configured — verification code for %s: %s", phone, code)
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()


def check_with_twilio(phone: str, code: str, creds: TwilioCreds) -> bool:
    r = http.post(
        f"https://verify.twilio.com/v2/Services/{creds.verify_sid}/VerificationCheck",
        auth=(creds.account_sid, creds.auth_token),
        data={"To": phone, "Code": code},
        timeout=15,
    )
    if r.status_code == 404:
        return False  # expired or never started
    r.raise_for_status()
    return r.json().get("status") == "approved"


def dev_code_hash(phone: str, code: str) -> str:
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()
