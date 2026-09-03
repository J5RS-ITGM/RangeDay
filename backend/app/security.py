import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

SECRET_KEY = os.environ.get("SECRET_KEY", "")
if not SECRET_KEY:
    # Random per-process key: fine for local smoke tests, useless in prod
    # (every restart invalidates sessions). Compose must set SECRET_KEY.
    SECRET_KEY = secrets.token_urlsafe(48)

JWT_ALG = "HS256"
ACCESS_TTL = timedelta(days=7)
RESET_TTL = timedelta(minutes=30)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def make_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + ACCESS_TTL}, SECRET_KEY, algorithm=JWT_ALG)


def read_access_token(token: str) -> str | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])["sub"]
    except jwt.PyJWTError:
        return None


def make_reset_token() -> tuple[str, str, datetime]:
    """Returns (raw token for the email link, sha256 hash for storage, expiry)."""
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode()).hexdigest(), datetime.now(timezone.utc) + RESET_TTL


def hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
