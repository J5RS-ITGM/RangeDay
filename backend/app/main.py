import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import emailer, phone as phone_mod, settings as settings_mod
from .db import Base, engine, get_db
from .models import ROLES, AccountRequest, AppSetting, PasswordReset, PhoneCode, User
from .security import (
    INVITE_TTL,
    hash_password,
    hash_reset_token,
    make_access_token,
    make_phone_token,
    make_reset_token,
    read_access_token,
    read_phone_token,
    verify_password,
)

logging.basicConfig(level=logging.INFO)

APP_ORIGIN = os.environ.get("APP_ORIGIN", "https://range.jwbegroup.com")
# Admin-editable settings, stored in app_settings; the env var of the same
# purpose is the fallback default when no DB value has been saved.
SETTING_KEYS = ("signup_mode", "phone_verification", "twilio_account_sid", "twilio_auth_token", "twilio_verify_sid")
_ENV_DEFAULTS = {
    "signup_mode": os.environ.get("SIGNUP_MODE", "open").lower(),
    "phone_verification": os.environ.get("PHONE_VERIFICATION", "off").lower(),
    "twilio_account_sid": os.environ.get("TWILIO_ACCOUNT_SID", ""),
    "twilio_auth_token": os.environ.get("TWILIO_AUTH_TOKEN", ""),
    "twilio_verify_sid": os.environ.get("TWILIO_VERIFY_SID", ""),
}


def get_setting(db: Session, key: str) -> str:
    row = db.get(AppSetting, key)
    return row.value if row and row.value != "" else _ENV_DEFAULTS.get(key, "")


def signup_mode(db: Session) -> str:
    return get_setting(db, "signup_mode") or "open"


def phone_verification_required(db: Session) -> bool:
    return get_setting(db, "phone_verification") == "required"


def twilio_creds(db: Session) -> phone_mod.TwilioCreds:
    return phone_mod.TwilioCreds(
        get_setting(db, "twilio_account_sid"),
        get_setting(db, "twilio_auth_token"),
        get_setting(db, "twilio_verify_sid"),
    )

app = FastAPI(title="Range Day API", docs_url=None, redoc_url=None)

# Production is same-origin behind Caddy; CORS exists for local dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[APP_ORIGIN, "http://localhost:8081", "http://localhost:8090"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Additive mini-migrations for tables that already exist in production.
# Postgres only; idempotent via IF NOT EXISTS. (SQLite dev DBs are throwaway.)
if engine.dialect.name == "postgresql":
    from sqlalchemy import text as _text
    with engine.begin() as _conn:
        _conn.execute(_text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT ''"))
        _conn.execute(_text("ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT ''"))

bearer = HTTPBearer(auto_error=False)


# ---------- Schemas ----------
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=25)
    verification_token: str = Field(default="", max_length=1000)


class VerifyStartIn(BaseModel):
    phone: str = Field(max_length=25)


class VerifyCheckIn(BaseModel):
    phone: str = Field(max_length=25)
    code: str = Field(min_length=4, max_length=10)


class ResetByPhoneIn(BaseModel):
    verification_token: str = Field(max_length=1000)
    new_password: str = Field(min_length=8, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class RequestAccountIn(BaseModel):
    email: EmailStr
    display_name: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=25)
    note: str = Field(default="", max_length=500)


class AccountRequestOut(BaseModel):
    id: str
    email: str
    display_name: str
    phone: str
    note: str
    created_at: datetime


class AdminCreateIn(BaseModel):
    email: EmailStr
    display_name: str = Field(default="", max_length=120)
    role: str = Field(default="shooter")
    phone: str = Field(default="", max_length=25)  # if set: stored + invite texted


class UserPatch(BaseModel):
    role: str | None = None
    disabled: bool | None = None
    phone: str | None = None  # "" clears; otherwise normalized + unique


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    phone: str
    role: str
    disabled: bool
    created_at: datetime


class AuthOut(BaseModel):
    access_token: str
    user: UserOut


def to_out(u: User) -> UserOut:
    return UserOut(
        id=u.id, email=u.email, display_name=u.display_name, phone=u.phone,
        role=u.role, disabled=u.disabled, created_at=u.created_at,
    )


# ---------- Dependencies ----------
def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = read_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer exists")
    if user.disabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


# ---------- Auth ----------
@app.get("/api/config")
def config(db: Session = Depends(get_db)):
    # First-run is always open so the bootstrap admin can be created.
    first = db.scalar(select(User).limit(1)) is None
    return {
        "signup_open": signup_mode(db) == "open" or first,
        "phone_verification": phone_verification_required(db) and not first,
    }


@app.post("/api/auth/verify/start")
def verify_start(body: VerifyStartIn, db: Session = Depends(get_db)):
    normalized = phone_mod.normalize_phone(body.phone)
    if not normalized:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter a valid phone number")
    dev_hash = phone_mod.start_verification(normalized, twilio_creds(db))
    if dev_hash is not None:  # Twilio absent: store the logged dev code
        row = db.get(PhoneCode, normalized)
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        if row:
            row.code_hash, row.expires_at, row.attempts = dev_hash, expires, 0
        else:
            db.add(PhoneCode(phone=normalized, code_hash=dev_hash, expires_at=expires, attempts=0))
        db.commit()
    return {"ok": True, "phone": normalized}


@app.post("/api/auth/verify/check")
def verify_check(body: VerifyCheckIn, db: Session = Depends(get_db)):
    normalized = phone_mod.normalize_phone(body.phone)
    if not normalized:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter a valid phone number")
    creds = twilio_creds(db)
    if creds.configured:
        ok = phone_mod.check_with_twilio(normalized, body.code.strip(), creds)
    else:
        row = db.get(PhoneCode, normalized)
        expired = bool(row) and row.expires_at.replace(tzinfo=row.expires_at.tzinfo or timezone.utc) < datetime.now(timezone.utc)
        if not row or expired or row.attempts >= 5:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code expired - request a new one")
        row.attempts += 1
        ok = row.code_hash == phone_mod.dev_code_hash(normalized, body.code.strip())
        if ok:
            db.delete(row)
        db.commit()
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That code is not right - check and try again")
    return {"verification_token": make_phone_token(normalized)}


@app.post("/api/auth/reset-by-phone")
def reset_by_phone(body: ResetByPhoneIn, db: Session = Depends(get_db)):
    # SMS reset: a fresh phone token proves control of the number.
    normalized = read_phone_token(body.verification_token)
    if not normalized:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification expired - start over")
    user = db.scalar(select(User).where(User.phone == normalized))
    if not user or user.disabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No account uses that phone number")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@app.post("/api/auth/signup", response_model=AuthOut)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    first_check = db.scalar(select(User).limit(1)) is None
    if signup_mode(db) != "open" and not first_check:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed — ask an admin for an invite")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")

    normalized = ""
    if phone_verification_required(db) and not first_check:
        normalized = phone_mod.normalize_phone(body.phone) or ""
        token_phone = read_phone_token(body.verification_token)
        if not normalized or token_phone != normalized:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Verify your phone number first")
        if db.scalar(select(User).where(User.phone == normalized)):
            raise HTTPException(status.HTTP_409_CONFLICT, "An account already uses that phone number")

    # Bootstrap: the very first account becomes admin so the panel is
    # reachable without any out-of-band database surgery.
    user = User(
        email=email,
        display_name=body.display_name.strip() or email.split("@")[0],
        password_hash=hash_password(body.password),
        phone=normalized,
        role="admin" if first_check else "shooter",
    )
    db.add(user)
    db.commit()
    return AuthOut(access_token=make_access_token(user.id), user=to_out(user))


@app.post("/api/auth/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if user.disabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    return AuthOut(access_token=make_access_token(user.id), user=to_out(user))


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return to_out(user)


@app.post("/api/auth/forgot")
def forgot(body: ForgotIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Always 200: never reveal whether an email has an account.
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user and not user.disabled:
        raw, token_hash, expires = make_reset_token()
        db.add(PasswordReset(user_id=user.id, token_hash=token_hash, expires_at=expires))
        db.commit()
        link = f"{APP_ORIGIN}/reset-password?token={raw}"
        tasks.add_task(emailer.send_reset_email, user.email, link, settings_mod.smtp_cfg(db))
    return {"ok": True}


@app.post("/api/auth/reset")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    pr = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == hash_reset_token(body.token)))
    expired = pr and pr.expires_at.replace(tzinfo=pr.expires_at.tzinfo or timezone.utc) < datetime.now(timezone.utc)
    if not pr or pr.used or expired:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired — request a new one")
    user = db.get(User, pr.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Account no longer exists")
    user.password_hash = hash_password(body.new_password)
    pr.used = True
    db.commit()
    return {"ok": True}


# ---------- Admin ----------
@app.get("/api/admin/users", response_model=list[UserOut])
def list_users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [to_out(u) for u in db.scalars(select(User).order_by(User.created_at)).all()]


class SettingsOut(BaseModel):
    signup_mode: str
    phone_verification: str
    twilio_account_sid: str
    twilio_verify_sid: str
    twilio_sms_from: str
    twilio_auth_token_set: bool
    twilio_configured: bool
    sms_sender_configured: bool
    smtp_host: str
    smtp_port: str
    smtp_user: str
    smtp_from: str
    smtp_password_set: bool
    email_configured: bool


class SettingsPatch(BaseModel):
    signup_mode: str | None = None
    phone_verification: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_verify_sid: str | None = None
    twilio_sms_from: str | None = None
    smtp_host: str | None = None
    smtp_port: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None


class InviteOut(BaseModel):
    user: UserOut
    invite_link: str
    sms_sent: bool = False


def _sms_invite(db: Session, phone: str, link: str) -> bool:
    body = f"You're invited to Range Day. Set your password here (link expires in 24h): {link}"
    return phone_mod.send_sms(phone, body, settings_mod.messaging_cfg(db))


def _create_invited_user(db: Session, email: str, display_name: str, role: str, phone: str = "") -> tuple[User, str]:
    """Create an account with an unknowable password and a one-time invite
    link (password-reset token) through which the person sets their own."""
    import secrets as _secrets
    user = User(
        email=email,
        display_name=display_name.strip() or email.split("@")[0],
        password_hash=hash_password(_secrets.token_urlsafe(24)),
        phone=phone,
        role=role,
    )
    db.add(user)
    db.flush()
    raw, token_hash, expires = make_reset_token(INVITE_TTL)
    db.add(PasswordReset(user_id=user.id, token_hash=token_hash, expires_at=expires))
    db.commit()
    return user, f"{APP_ORIGIN}/reset-password?token={raw}"


@app.post("/api/auth/request-account")
def request_account(body: RequestAccountIn, db: Session = Depends(get_db)):
    """Public: ask an admin for an account. Response never reveals whether
    the email already has an account or a pending request."""
    email = body.email.lower()
    exists_user = db.scalar(select(User).where(User.email == email))
    existing = db.scalar(select(AccountRequest).where(AccountRequest.email == email))
    if not exists_user:
        if existing:
            existing.display_name = body.display_name.strip() or existing.display_name
            existing.note = body.note.strip() or existing.note
        else:
            req_phone = phone_mod.normalize_phone(body.phone) if body.phone.strip() else None
            db.add(AccountRequest(email=email, display_name=body.display_name.strip(), phone=req_phone or "", note=body.note.strip()))
        db.commit()
    return {"ok": True}


@app.get("/api/admin/requests", response_model=list[AccountRequestOut])
def list_requests(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(AccountRequest).order_by(AccountRequest.created_at)).all()
    return [AccountRequestOut(id=r.id, email=r.email, display_name=r.display_name, phone=r.phone, note=r.note, created_at=r.created_at) for r in rows]


@app.post("/api/admin/requests/{request_id}/approve", response_model=InviteOut)
def approve_request(request_id: str, tasks: BackgroundTasks, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    req = db.get(AccountRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such request")
    if db.scalar(select(User).where(User.email == req.email)):
        db.delete(req)
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    req_phone = req.phone if req.phone and not db.scalar(select(User).where(User.phone == req.phone)) else ""
    user, link = _create_invited_user(db, req.email, req.display_name, "shooter", req_phone)
    db.delete(req)
    db.commit()
    tasks.add_task(emailer.send_reset_email, user.email, link, settings_mod.smtp_cfg(db))
    sms_sent = _sms_invite(db, req_phone, link) if req_phone else False
    return InviteOut(user=to_out(user), invite_link=link, sms_sent=sms_sent)


@app.delete("/api/admin/requests/{request_id}")
def reject_request(request_id: str, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    req = db.get(AccountRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such request")
    db.delete(req)
    db.commit()
    return {"ok": True}


class SettingsOut(BaseModel):
    signup_mode: str
    phone_verification: str
    twilio_account_sid: str
    twilio_verify_sid: str
    twilio_sms_from: str
    twilio_auth_token_set: bool
    twilio_configured: bool
    sms_sender_configured: bool
    smtp_host: str
    smtp_port: str
    smtp_user: str
    smtp_from: str
    smtp_password_set: bool
    email_configured: bool


class SettingsPatch(BaseModel):
    signup_mode: str | None = None
    phone_verification: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_verify_sid: str | None = None
    twilio_sms_from: str | None = None
    smtp_host: str | None = None
    smtp_port: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None


def _settings_out(db: Session) -> SettingsOut:
    creds = twilio_creds(db)
    return SettingsOut(
        signup_mode=signup_mode(db),
        phone_verification="required" if phone_verification_required(db) else "off",
        twilio_account_sid=creds.account_sid,
        twilio_verify_sid=creds.verify_sid,
        twilio_auth_token_set=bool(creds.auth_token),
        twilio_configured=creds.configured,
    )


@app.get("/api/admin/settings", response_model=SettingsOut)
def get_settings(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return _settings_out(db)


@app.put("/api/admin/settings", response_model=SettingsOut)
def put_settings(body: SettingsPatch, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    if body.signup_mode is not None and body.signup_mode not in ("open", "closed"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "signup_mode must be open or closed")
    if body.phone_verification is not None and body.phone_verification not in ("off", "required"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "phone_verification must be off or required")
    for key in SETTING_KEYS:
        val = getattr(body, key, None)
        if val is None:
            continue  # not being changed
        row = db.get(AppSetting, key)
        if row:
            row.value = val.strip()
        else:
            db.add(AppSetting(key=key, value=val.strip()))
    db.commit()
    return _settings_out(db)


def _settings_out(db: Session) -> SettingsOut:
    return SettingsOut(
        signup_mode=settings_mod.signup_mode(db),
        phone_verification="required" if settings_mod.verification_required(db) else "off",
        twilio_account_sid=settings_mod.get_setting(db, "twilio_account_sid"),
        twilio_verify_sid=settings_mod.get_setting(db, "twilio_verify_sid"),
        twilio_sms_from=settings_mod.get_setting(db, "twilio_sms_from"),
        twilio_auth_token_set=bool(settings_mod.get_setting(db, "twilio_auth_token")),
        twilio_configured=settings_mod.twilio_cfg(db) is not None,
        sms_sender_configured=settings_mod.messaging_cfg(db) is not None,
        smtp_host=settings_mod.get_setting(db, "smtp_host"),
        smtp_port=settings_mod.get_setting(db, "smtp_port"),
        smtp_user=settings_mod.get_setting(db, "smtp_user"),
        smtp_from=settings_mod.get_setting(db, "smtp_from"),
        smtp_password_set=bool(settings_mod.get_setting(db, "smtp_password")),
        email_configured=settings_mod.smtp_cfg(db) is not None,
    )


@app.get("/api/admin/settings", response_model=SettingsOut)
def get_settings(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    # The auth token itself is never returned - only whether one is saved.
    return _settings_out(db)


@app.patch("/api/admin/settings", response_model=SettingsOut)
def patch_settings(body: SettingsPatch, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    if body.signup_mode is not None:
        if body.signup_mode.lower() not in ("open", "closed"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "signup_mode must be open or closed")
        settings_mod.set_setting(db, "signup_mode", body.signup_mode.lower())
    if body.phone_verification is not None:
        if body.phone_verification.lower() not in ("required", "off"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "phone_verification must be required or off")
        settings_mod.set_setting(db, "phone_verification", body.phone_verification.lower())
    if body.twilio_account_sid is not None:
        settings_mod.set_setting(db, "twilio_account_sid", body.twilio_account_sid)
    if body.twilio_auth_token is not None:
        settings_mod.set_setting(db, "twilio_auth_token", body.twilio_auth_token)
    if body.twilio_verify_sid is not None:
        settings_mod.set_setting(db, "twilio_verify_sid", body.twilio_verify_sid)
    if body.twilio_sms_from is not None:
        settings_mod.set_setting(db, "twilio_sms_from", body.twilio_sms_from)
    if body.smtp_port is not None and body.smtp_port.strip() and not body.smtp_port.strip().isdigit():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "SMTP port must be a number")
    for k in ("smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"):
        v = getattr(body, k)
        if v is not None:
            settings_mod.set_setting(db, k, v)
    db.commit()
    return _settings_out(db)


@app.post("/api/admin/users", response_model=InviteOut)
def admin_create_user(body: AdminCreateIn, tasks: BackgroundTasks, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    if body.role not in ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown role")
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    normalized = ""
    if body.phone.strip():
        normalized = phone_mod.normalize_phone(body.phone) or ""
        if not normalized:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter a valid phone number")
        if db.scalar(select(User).where(User.phone == normalized)):
            raise HTTPException(status.HTTP_409_CONFLICT, "An account already uses that phone number")
    user, link = _create_invited_user(db, email, body.display_name, body.role, normalized)
    tasks.add_task(emailer.send_reset_email, user.email, link, settings_mod.smtp_cfg(db))
    sms_sent = _sms_invite(db, normalized, link) if normalized else False
    return InviteOut(user=to_out(user), invite_link=link, sms_sent=sms_sent)


@app.patch("/api/admin/users/{user_id}", response_model=UserOut)
def patch_user(user_id: str, body: UserPatch, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such account")
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown role")
        if user.id == admin.id and body.role != "admin":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own admin role")
        user.role = body.role
    if body.disabled is not None:
        if user.id == admin.id and body.disabled:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot disable your own account")
        user.disabled = body.disabled
    if body.phone is not None:
        if body.phone.strip() == "":
            user.phone = ""
        else:
            normalized = phone_mod.normalize_phone(body.phone)
            if not normalized:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter a valid phone number")
            other = db.scalar(select(User).where(User.phone == normalized, User.id != user.id))
            if other:
                raise HTTPException(status.HTTP_409_CONFLICT, "Another account already uses that phone number")
            user.phone = normalized
    db.commit()
    return to_out(user)


@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: str, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such account")
    db.delete(user)
    db.commit()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}
