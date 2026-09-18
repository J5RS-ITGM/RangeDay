"""Runtime app settings: DB-backed, admin-editable, env as fallback.

A non-empty value in app_settings wins; otherwise the environment
variable applies. This lets the admin panel manage Twilio credentials
and signup behavior without SSH, while .env still seeds sane defaults.
"""
import os

from sqlalchemy.orm import Session

from .models import AppSetting

KEYS = (
    "signup_mode",          # open | closed
    "phone_verification",   # required | off
    "twilio_account_sid",
    "twilio_auth_token",    # secret: never echoed back by the API
    "twilio_verify_sid",
    "twilio_sms_from",      # phone number or Messaging Service SID (MG...)
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",        # secret: never echoed back by the API
    "smtp_from",
)

_ENV = {
    "signup_mode": ("SIGNUP_MODE", "open"),
    "phone_verification": ("PHONE_VERIFICATION", "off"),
    "twilio_account_sid": ("TWILIO_ACCOUNT_SID", ""),
    "twilio_auth_token": ("TWILIO_AUTH_TOKEN", ""),
    "twilio_verify_sid": ("TWILIO_VERIFY_SID", ""),
    "twilio_sms_from": ("TWILIO_SMS_FROM", ""),
    "smtp_host": ("SMTP_HOST", ""),
    "smtp_port": ("SMTP_PORT", "587"),
    "smtp_user": ("SMTP_USER", ""),
    "smtp_password": ("SMTP_PASS", ""),
    "smtp_from": ("SMTP_FROM", ""),
}


def get_setting(db: Session, key: str) -> str:
    row = db.get(AppSetting, key)
    if row and row.value.strip():
        return row.value.strip()
    env_key, default = _ENV[key]
    return os.environ.get(env_key, default).strip() or default


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.get(AppSetting, key)
    if row:
        row.value = value.strip()
    else:
        db.add(AppSetting(key=key, value=value.strip()))


def signup_mode(db: Session) -> str:
    return get_setting(db, "signup_mode").lower()


def verification_required(db: Session) -> bool:
    return get_setting(db, "phone_verification").lower() == "required"


def messaging_cfg(db: Session) -> tuple[str, str, str] | None:
    sid = get_setting(db, "twilio_account_sid")
    tok = get_setting(db, "twilio_auth_token")
    sender = get_setting(db, "twilio_sms_from")
    return (sid, tok, sender) if sid and tok and sender else None


def smtp_cfg(db: Session) -> tuple[str, int, str, str, str] | None:
    host = get_setting(db, "smtp_host")
    if not host:
        return None
    try:
        port = int(get_setting(db, "smtp_port") or "587")
    except ValueError:
        port = 587
    user = get_setting(db, "smtp_user")
    password = get_setting(db, "smtp_password")
    from_addr = get_setting(db, "smtp_from") or user or "rangeday@localhost"
    return (host, port, user, password, from_addr)


def twilio_cfg(db: Session) -> tuple[str, str, str] | None:
    sid = get_setting(db, "twilio_account_sid")
    tok = get_setting(db, "twilio_auth_token")
    ver = get_setting(db, "twilio_verify_sid")
    return (sid, tok, ver) if sid and tok and ver else None
