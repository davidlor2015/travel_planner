from pydantic import BaseModel, ConfigDict, EmailStr

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in_seconds: int

class TokenData(BaseModel):
    email: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationConfirmRequest(BaseModel):
    token: str


class PasswordResetRequestResponse(BaseModel):
    ok: bool = True
    reset_url: str | None = None


class EmailVerificationRequestResponse(BaseModel):
    ok: bool = True
    verification_url: str | None = None


class PasswordResetTokenStatus(BaseModel):
    valid: bool
    email: EmailStr | None = None


class EmailVerificationTokenStatus(BaseModel):
    valid: bool
    email: EmailStr | None = None


class SessionInfo(BaseModel):
    email: EmailStr
    id: int

    model_config = ConfigDict(from_attributes=True)
