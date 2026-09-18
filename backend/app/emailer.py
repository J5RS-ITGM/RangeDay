import logging
import smtplib
from email.message import EmailMessage

log = logging.getLogger("rangeday.email")

# cfg = (host, port, user, password, from_addr) or None when unconfigured.


def send_reset_email(to: str, link: str, cfg: tuple[str, int, str, str, str] | None = None) -> None:
    """Email the reset/invite link; without SMTP config, log it so testing
    works before email is wired up (visible via `docker logs rangeday-api`)."""
    if not cfg:
        log.warning("SMTP not configured - password reset link for %s: %s", to, link)
        return
    host, port, user, password, from_addr = cfg
    msg = EmailMessage()
    msg["Subject"] = "Range Day - set your password"
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(
        "A password link was requested for your Range Day account.\n\n"
        f"Open this link to set your password:\n{link}\n\n"
        "If you didn't request this, you can ignore this email."
    )
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.starttls()
            if user:
                s.login(user, password)
            s.send_message(msg)
    except Exception:
        log.exception("SMTP send failed for %s - link: %s", to, link)
