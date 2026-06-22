from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.alarma import Alarma
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[dict])
def list_alarmas(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """Obtiene las alarmas del usuario actual (por su ID o por su Rol)."""
    user_id = current_user.id
    user_rol = current_user.rol
    
    alarmas = db.query(Alarma).filter(
        (Alarma.id_usuario_destino == user_id) | 
        (Alarma.rol_destino == user_rol)
    ).order_by(Alarma.fecha.desc()).all()
    
    return [
        {
            "id": a.id,
            "tipo": a.tipo,
            "titulo": a.titulo,
            "descripcion": a.descripcion,
            "entidad": a.entidad,
            "entidad_id": a.entidad_id,
            "estado": a.estado,
            "fecha": a.fecha,
            "accion_recomendada": a.accion_recomendada
        } for a in alarmas
    ]

@router.put("/{alarma_id}/estado")
def update_alarma_estado(
    alarma_id: uuid.UUID,
    estado: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Actualiza el estado de una alarma (Ej: VISTA, RESUELTA, IGNORADA)"""
    alarma = db.query(Alarma).filter(Alarma.id == alarma_id).first()
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
        
    # TODO: Validación estricta de permisos aquí (solo si el usuario destino coincide o rol)
    
    alarma.estado = estado
    db.commit()
    return {"message": "Estado actualizado", "estado": estado}
