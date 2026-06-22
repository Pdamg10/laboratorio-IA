from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt
import uuid
from uuid import uuid4

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

router = APIRouter(tags=["auth"])


class UserRegister(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: str = "ESTUDIANTE"


class UserResponse(BaseModel):
    id_usuario: str
    nombre: str
    email: str
    rol: str
    created_at: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token de acceso requerido")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sin sujeto")
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token con sujeto invalido")
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(
        id=uuid4(),
        nombre=data.nombre,
        email=data.email,
        password_hash=get_password_hash(data.password),
        rol=data.rol,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.post("/login", response_model=TokenPair)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    access_token = create_token(
        str(user.id), "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        str(user.id), "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/refresh", response_model=TokenPair)
def refresh(data: dict, db: Session = Depends(get_db)):
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token requerido")
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token requerido")
    user_id = payload.get("sub")
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Refresh token con sujeto invalido")
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    access_token = create_token(
        str(user.id), "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_token(
        str(user.id), "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta accion"
            )
        return current_user
    return role_checker


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user.to_dict()

@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_role(["ADMIN", "DOCENTE"]))])
def list_users(db: Session = Depends(get_db)):
    """Listar usuarios. DOCENTE puede ver ESTUDIANTEs. ADMIN puede ver todos."""
    users = db.query(User).all()
    return [u.to_dict() for u in users]