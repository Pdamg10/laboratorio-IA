import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Lab(Base):
    __tablename__ = "laboratorios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    dificultad = Column(Integer, default=1, nullable=False)
    circuito_base_json = Column(JSON, nullable=False, default=dict)
    objetivos = Column(JSON, nullable=False, default=list)
    completado = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id_laboratorio": str(self.id),
            "titulo": self.titulo,
            "descripcion": self.descripcion,
            "dificultad": self.dificultad,
            "circuito_base_json": self.circuito_base_json,
            "objetivos": self.objetivos,
            "completado": self.completado,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }