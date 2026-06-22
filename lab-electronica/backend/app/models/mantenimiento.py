import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text

from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Falla(Base):
    __tablename__ = "fallas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(100), nullable=False)
    severidad = Column(String(50), nullable=False) # Baja, Media, Alta, Critica
    descripcion = Column(Text, nullable=True)

class Diagnostico(Base):
    __tablename__ = "diagnosticos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    descripcion = Column(Text, nullable=False)
    nivel_confianza = Column(Float, nullable=True) # 0.0 - 1.0
    id_equipo = Column(UUID(as_uuid=True), ForeignKey("equipos.id", ondelete="CASCADE"), nullable=False)
    id_estudiante = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    id_falla_sugerida = Column(UUID(as_uuid=True), ForeignKey("fallas.id", ondelete="SET NULL"), nullable=True)
    estado = Column(String(50), default="Pendiente", nullable=False) # Pendiente, Validado, Rechazado

class Medicion(Base):
    __tablename__ = "mediciones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_diagnostico = Column(UUID(as_uuid=True), ForeignKey("diagnosticos.id", ondelete="CASCADE"), nullable=False)
    voltaje = Column(Float, nullable=True)
    corriente = Column(Float, nullable=True)
    resistencia = Column(Float, nullable=True)
    temperatura = Column(Float, nullable=True)
    observaciones = Column(Text, nullable=True)

class Reporte(Base):
    __tablename__ = "reportes_mantenimiento"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_equipo = Column(UUID(as_uuid=True), ForeignKey("equipos.id", ondelete="CASCADE"), nullable=False)
    id_diagnostico = Column(UUID(as_uuid=True), ForeignKey("diagnosticos.id", ondelete="SET NULL"), nullable=True)
    id_docente_validador = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    id_admin_aprobador = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    estado = Column(String(50), default="Pendiente", nullable=False) # Pendiente, Aprobado, Reparado
    accion_tomada = Column(Text, nullable=True)
    fecha_reporte = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)

class Bitacora(Base):
    __tablename__ = "bitacora_eventos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_equipo = Column(UUID(as_uuid=True), ForeignKey("equipos.id", ondelete="CASCADE"), nullable=False)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    evento = Column(String(255), nullable=False) # ej: "Cambio de estado a En uso"
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
