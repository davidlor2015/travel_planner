# Path: app/core/security.py
# Summary: Implements security functionality.

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import hashlib
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_BCRYPT_MAX_BYTES = 72


def _normalize_for_bcrypt(password: str) -> str:
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) <= _BCRYPT_MAX_BYTES:
        return password
    return hashlib.sha256(pw_bytes).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_normalize_for_bcrypt(plain_password), hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_normalize_for_bcrypt(password))


def _create_signed_token(
    data: dict[str, Any],
    *,
    token_type: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": now,
        "type": token_type,
        "jti": secrets.token_urlsafe(16),
    })
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    return _create_signed_token(data, token_type="access", expires_delta=expires_delta)


def create_refresh_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    return _create_signed_token(
        data,
        token_type="refresh",
        expires_delta=expires_delta if expires_delta else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_password_reset_token(email: str, password_fingerprint: str) -> str:
    return _create_signed_token(
        {"sub": email, "pwh": password_fingerprint},
        token_type="password_reset",
        expires_delta=timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )


def create_email_verification_token(email: str, password_fingerprint: str) -> str:
    return _create_signed_token(
        {"sub": email, "pwh": password_fingerprint},
        token_type="email_verification",
        expires_delta=timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS),
    )


def decode_token(token: str, *, expected_type: str | None = None) -> dict[str, Any]:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    token_type = payload.get("type")
    if expected_type is not None and token_type != expected_type:
        raise JWTError(f"Unexpected token type: {token_type!r}")
    return payload


def password_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()[:16]


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
