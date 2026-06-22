import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Circuit(Base):
    __tablename__ = "proyectos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    data_netlist_json = Column(JSON, nullable=False, default=dict)
    estado_simulacion = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id_proyecto": str(self.id),
            "id_usuario": str(self.id_usuario),
            "titulo": self.titulo,
            "data_netlist_json": self.data_netlist_json,
            "estado_simulacion": self.estado_simulacion,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }