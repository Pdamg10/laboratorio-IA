import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class DiagnosisLog(Base):
    __tablename__ = "auditorias_ia"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_proyecto = Column(UUID(as_uuid=True), ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo_falla = Column(String(50), nullable=False)
    descripcion_tecnica = Column(Text, nullable=False)
    json_metadata = Column(JSON, nullable=False, default=dict)
    confidence = Column(Float, default=0.0, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id_auditoria": str(self.id),
            "id_proyecto": str(self.id_proyecto),
            "codigo_falla": self.codigo_falla,
            "descripcion_tecnica": self.descripcion_tecnica,
            "json_metadata": self.json_metadata,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }