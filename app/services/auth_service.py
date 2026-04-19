from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from jose import JWTError

from app.core import security
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.auth import PasswordResetTokenStatus, Token


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def register(self, user_in: UserCreate) -> User:
        if self.repo.get_by_email(user_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        new_user = User(
            email=user_in.email,
            hashed_password=security.get_password_hash(user_in.password),
        )
        return self.repo.add(new_user)

    def login(self, email: str, password: str) -> str:
        user = self.repo.get_by_email(email)
        if not user or not security.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return self._issue_session_tokens(user)

    def refresh(self, refresh_token: str) -> Token:
        try:
            payload = security.decode_token(refresh_token, expected_type="refresh")
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            ) from exc

        email = payload.get("sub")
        if not isinstance(email, str):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = self.repo.get_by_email(email)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        return self._issue_session_tokens(user)

    def create_password_reset(self, email: str) -> str | None:
        user = self.repo.get_by_email(email.lower())
        if user is None:
            return None

        token = security.create_password_reset_token(
            user.email,
            security.password_fingerprint(user.hashed_password),
        )
        return f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?token={token}"

    def validate_password_reset_token(self, token: str) -> PasswordResetTokenStatus:
        try:
            payload = security.decode_token(token, expected_type="password_reset")
        except JWTError:
            return PasswordResetTokenStatus(valid=False)

        email = payload.get("sub")
        fingerprint = payload.get("pwh")
        if not isinstance(email, str) or not isinstance(fingerprint, str):
            return PasswordResetTokenStatus(valid=False)

        user = self.repo.get_by_email(email.lower())
        if user is None:
            return PasswordResetTokenStatus(valid=False)

        if fingerprint != security.password_fingerprint(user.hashed_password):
            return PasswordResetTokenStatus(valid=False)

        return PasswordResetTokenStatus(valid=True, email=user.email)

    def reset_password(self, token: str, password: str) -> None:
        status_info = self.validate_password_reset_token(token)
        if not status_info.valid or status_info.email is None:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset token")

        user = self.repo.get_by_email(status_info.email)
        if user is None:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset token")

        user.hashed_password = security.get_password_hash(password)
        self.db.commit()

    def _issue_session_tokens(self, user: User) -> Token:
        expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(data={"sub": user.email}, expires_delta=expires)
        refresh_token = security.create_refresh_token(data={"sub": user.email})
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in_seconds=int(expires.total_seconds()),
        )
