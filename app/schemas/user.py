from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    display_name: str | None = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    email_verified: bool

    class DictConfig:
        from_attributes = True
