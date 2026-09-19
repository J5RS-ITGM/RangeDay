"""Email delivery with branded HTML templates.

Config is passed per-call (resolved from DB settings at request time):
cfg = (host, port, user, password, from_addr) or None. Without config,
the message is logged so flows work before SMTP is wired up.
"""
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

log = logging.getLogger("rangeday.email")

BRAND = "Range Day"
ACCENT = "#3D7DDB"
INK = "#1E2226"
MUTED = "#6E7681"
BG = "#F2F3F5"
CARD = "#FFFFFF"
LINE = "#D3D8DE"


def _shell(title: str, intro: str, body_html: str, cta_label: str | None, cta_url: str | None, footer: str) -> str:
    """Shared responsive email shell. Table-based for email-client support."""
    button = ""
    if cta_label and cta_url:
        button = f"""
        <tr><td style="padding:8px 0 4px;">
          <a href="{cta_url}" style="display:inline-block;background:{ACCENT};color:#ffffff;
             text-decoration:none;font-weight:700;font-size:16px;padding:13px 28px;border-radius:6px;
             font-family:Arial,Helvetica,sans-serif;letter-spacing:.3px;">{cta_label}</a>
        </td></tr>
        <tr><td style="padding:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{MUTED};">
          Or paste this link into your browser:<br>
          <a href="{cta_url}" style="color:{ACCENT};word-break:break-all;">{cta_url}</a>
        </td></tr>"""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:{CARD};border:1px solid {LINE};border-radius:10px;overflow:hidden;">
    <tr><td style="background:{INK};padding:18px 26px;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:1px;">RANGE<span style="color:{ACCENT};">·</span>DAY</span>
    </td></tr>
    <tr><td style="padding:28px 26px 8px;">
      <h1 style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:21px;color:{INK};">{title}</h1>
      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:{INK};">{intro}</p>
    </td></tr>
    <tr><td style="padding:0 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        {body_html}
        {button}
      </table>
    </td></tr>
    <tr><td style="padding:24px 26px 26px;">
      <hr style="border:none;border-top:1px solid {LINE};margin:0 0 14px;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:{MUTED};">{footer}</p>
    </td></tr>
  </table>
  <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{MUTED};">{BRAND} · shooting sports training</p>
</td></tr>
</table></body></html>"""


def _send(cfg, to: str, subject: str, html: str, text: str) -> None:
    if not cfg:
        log.warning("SMTP not configured - email to %s (%s). Text:\n%s", to, subject, text)
        return
    host, port, user, password, from_addr = cfg
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((BRAND, from_addr))
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.starttls()
            if user:
                s.login(user, password)
            s.send_message(msg)
    except Exception:
        log.exception("SMTP send failed for %s", to)


# ---- Templates ----

def send_reset_email(to: str, link: str, cfg=None) -> None:
    html = _shell(
        "Set your password",
        "A password link was requested for your Range Day account. Use the button below to choose a new password.",
        "", "Set password", link,
        "If you didn't request this, you can safely ignore this email. The link expires after a short time.",
    )
    text = f"Set your Range Day password:\n{link}\n\nIf you didn't request this, ignore this email."
    _send(cfg, to, "Range Day - set your password", html, text)


def send_invite_email(to: str, link: str, inviter: str | None, cfg=None) -> None:
    who = f"{inviter} invited you to " if inviter else "You've been invited to "
    html = _shell(
        "You're invited to Range Day",
        f"{who}<strong>Range Day</strong>, a training companion for competitive and duty shooters. "
        "Set your password to activate your account and start logging drills.",
        """<tr><td style="padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E2226;line-height:1.6;">
             Track drills and stages, score runs on a tap-to-score target, plan range sessions, and review your analytics over time.
           </td></tr>""",
        "Activate my account", link,
        "This invitation link expires in 24 hours. If you weren't expecting it, no action is needed.",
    )
    text = f"{who}Range Day. Activate your account and set your password:\n{link}\n\nThis link expires in 24 hours."
    _send(cfg, to, "You're invited to Range Day", html, text)


def send_connection_request_email(to: str, requester_name: str, accept_link: str, cfg=None) -> None:
    html = _shell(
        "New connection request",
        f"<strong>{requester_name}</strong> wants to connect with you on Range Day. "
        "Connected shooters can compare runs and share sessions.",
        f"""<tr><td style="padding:4px 0 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#F2F3F5;border:1px solid #D3D8DE;border-radius:8px;width:100%;">
                <tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E2226;">
                  <span style="display:inline-block;width:34px;height:34px;background:{ACCENT};border-radius:50%;color:#fff;
                        text-align:center;line-height:34px;font-weight:800;font-size:15px;margin-right:10px;">{requester_name[:1].upper()}</span>
                  {requester_name}
                </td></tr>
              </table>
            </td></tr>""",
        "Review & accept", accept_link,
        "You can also accept or decline from the Contacts screen in the app. If you don't recognize this person, just ignore this email.",
    )
    text = f"{requester_name} wants to connect with you on Range Day.\nReview and accept:\n{accept_link}\n\nOr open the Contacts screen in the app."
    _send(cfg, to, f"{requester_name} wants to connect on Range Day", html, text)


def send_connection_accepted_email(to: str, accepter_name: str, app_link: str, cfg=None) -> None:
    html = _shell(
        "You're connected",
        f"<strong>{accepter_name}</strong> accepted your connection request. You're now connected on Range Day.",
        "", "Open Range Day", app_link,
        "You'll be able to compare runs and share sessions with your contacts as those features roll out.",
    )
    text = f"{accepter_name} accepted your connection request on Range Day.\nOpen the app:\n{app_link}"
    _send(cfg, to, f"{accepter_name} accepted your connection request", html, text)
