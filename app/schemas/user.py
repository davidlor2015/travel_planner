from pydantic import BaseModel, EmailStr, field_validator

class UserBase(BaseModel):
    email: EmailStr
    display_name: str | None = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    display_name: str | None = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 80:
                raise ValueError("Display name must be 80 characters or fewer.")
            return v or None
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    email_verified: bool

    class DictConfig:
        from_attributes = True
