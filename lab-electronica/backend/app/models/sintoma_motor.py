import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text

from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Sintoma(Base):
    __tablename__ = "motor_sintomas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    descripcion = Column(String(255), nullable=False, unique=True)
    categoria = Column(String(100), nullable=False)

class CausaProbable(Base):
    __tablename__ = "motor_causas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_sintoma = Column(UUID(as_uuid=True), ForeignKey("motor_sintomas.id", ondelete="CASCADE"), nullable=False)
    id_falla = Column(UUID(as_uuid=True), ForeignKey("fallas.id", ondelete="CASCADE"), nullable=False)
    probabilidad = Column(Float, nullable=False) # 0.0 - 1.0
    pruebas_sugeridas = Column(Text, nullable=True)
