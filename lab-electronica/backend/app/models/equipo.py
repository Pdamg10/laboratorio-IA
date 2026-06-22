import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum

from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class EstadoEquipo(str, enum.Enum):
    DISPONIBLE = "Disponible"
    EN_USO = "En uso"
    EN_DIAGNOSTICO = "En diagnóstico"
    PENDIENTE_REPARACION = "Pendiente reparación"
    REPARADO = "Reparado"
    FUERA_DE_SERVICIO = "Fuera de servicio"
    RETIRADO = "Retirado"

class Equipo(Base):
    __tablename__ = "equipos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    estado = Column(String(50), default=EstadoEquipo.DISPONIBLE.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Componente(Base):
    __tablename__ = "componentes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    stock_minimo = Column(Integer, default=5, nullable=False)
    ubicacion = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
