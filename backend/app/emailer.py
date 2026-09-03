import logging
import os
import smtplib
from email.message import EmailMessage

log = logging.getLogger("rangeday.email")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "rangeday@localhost")


def send_reset_email(to: str, link: str) -> None:
    """Email the reset link; without SMTP config, log it so testing
    works before email is wired up (visible via `docker logs rangeday-api`)."""
    if not SMTP_HOST:
        log.warning("SMTP not configured — password reset link for %s: %s", to, link)
        return
    msg = EmailMessage()
    msg["Subject"] = "Range Day — reset your password"
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.set_content(
        "A password reset was requested for your Range Day account.\n\n"
        f"Reset link (expires in 30 minutes):\n{link}\n\n"
        "If you didn't request this, you can ignore this email."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as s:
        s.starttls()
        if SMTP_USER:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)
