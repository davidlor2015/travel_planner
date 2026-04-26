from typing import Annotated
from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import CurrentUser
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.auth import (
    EmailVerificationConfirmRequest,
    EmailVerificationRequest,
    EmailVerificationRequestResponse,
    EmailVerificationTokenStatus,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    PasswordResetRequestResponse,
    PasswordResetTokenStatus,
    RefreshTokenRequest,
    Token,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    return AuthService(db).register(user_in)


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    return AuthService(db).login(form_data.username, form_data.password)


@router.post("/refresh", response_model=Token)
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/password-reset/request", response_model=PasswordResetRequestResponse)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    reset_url = AuthService(db).create_password_reset(payload.email)
    return PasswordResetRequestResponse(reset_url=reset_url)


@router.post("/email-verification/request", response_model=EmailVerificationRequestResponse)
def request_email_verification(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    verification_url = AuthService(db).create_email_verification(payload.email)
    return EmailVerificationRequestResponse(verification_url=verification_url)


@router.get("/password-reset/validate", response_model=PasswordResetTokenStatus)
def validate_password_reset_token(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    return AuthService(db).validate_password_reset_token(token)


@router.get("/email-verification/validate", response_model=EmailVerificationTokenStatus)
def validate_email_verification_token(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    return AuthService(db).validate_email_verification_token(token)


@router.post("/password-reset/confirm", status_code=204)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
):
    AuthService(db).reset_password(payload.token, payload.password)


@router.post("/email-verification/confirm", status_code=204)
def confirm_email_verification(
    payload: EmailVerificationConfirmRequest,
    db: Session = Depends(get_db),
):
    AuthService(db).verify_email(payload.token)


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    for field in payload.model_fields_set:
        setattr(current_user, field, getattr(payload, field))
    db.commit()
    db.refresh(current_user)
    return current_user
