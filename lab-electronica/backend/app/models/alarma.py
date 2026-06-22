import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class TipoAlarma(str, enum.Enum):
    CRITICA = "CRITICA"
    OPERATIVA = "OPERATIVA"
    INFORMATIVA = "INFORMATIVA"

class EstadoAlarma(str, enum.Enum):
    NUEVA = "NUEVA"
    VISTA = "VISTA"
    EN_PROCESO = "EN_PROCESO"
    RESUELTA = "RESUELTA"
    IGNORADA = "IGNORADA"
    ESCALADA = "ESCALADA"

class Alarma(Base):
    __tablename__ = "alarmas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(50), default=TipoAlarma.INFORMATIVA.value, nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    
    entidad = Column(String(50), nullable=True) # Ej: Equipo, Componente, Diagnostico
    entidad_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Usuario que recibe la notificación (puede ser nulo si es para un rol completo, ej: todos los ADMIN)
    id_usuario_destino = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'), nullable=True)
    # Rol que debe recibirla si no hay un usuario específico
    rol_destino = Column(String(50), nullable=True)
    
    estado = Column(String(50), default=EstadoAlarma.NUEVA.value, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    accion_recomendada = Column(String(255), nullable=True)
