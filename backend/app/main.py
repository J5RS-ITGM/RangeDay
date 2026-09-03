import logging
import os
from datetime import datetime, timezone

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import emailer
from .db import Base, engine, get_db
from .models import ROLES, PasswordReset, User
from .security import (
    hash_password,
    hash_reset_token,
    make_access_token,
    make_reset_token,
    read_access_token,
    verify_password,
)

logging.basicConfig(level=logging.INFO)

APP_ORIGIN = os.environ.get("APP_ORIGIN", "https://range.jwbegroup.com")

app = FastAPI(title="Range Day API", docs_url=None, redoc_url=None)

# Production is same-origin behind Caddy; CORS exists for local dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[APP_ORIGIN, "http://localhost:8081", "http://localhost:8090"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

bearer = HTTPBearer(auto_error=False)


# ---------- Schemas ----------
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class UserPatch(BaseModel):
    role: str | None = None
    disabled: bool | None = None


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    disabled: bool
    created_at: datetime


class AuthOut(BaseModel):
    access_token: str
    user: UserOut


def to_out(u: User) -> UserOut:
    return UserOut(
        id=u.id, email=u.email, display_name=u.display_name,
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
@app.post("/api/auth/signup", response_model=AuthOut)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    # Bootstrap: the very first account becomes admin so the panel is
    # reachable without any out-of-band database surgery.
    first = db.scalar(select(User).limit(1)) is None
    user = User(
        email=email,
        display_name=body.display_name.strip() or email.split("@")[0],
        password_hash=hash_password(body.password),
        role="admin" if first else "shooter",
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
        tasks.add_task(emailer.send_reset_email, user.email, link)
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
