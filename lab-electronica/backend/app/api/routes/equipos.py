from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.equipo import Equipo, Componente
from app.api.routes.auth import get_current_user, require_role
from pydantic import BaseModel

router = APIRouter()

# --- Schemas ---
class EquipoCreate(BaseModel):
    codigo: str
    nombre: str
    categoria: str
    estado: str = "Disponible"

class ComponenteCreate(BaseModel):
    nombre: str
    categoria: str
    stock: int
    ubicacion: str

# --- Equipos ---
@router.get("", response_model=List[dict])
def read_equipos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Ver todos los equipos (todos los roles)"""
    equipos = db.query(Equipo).all()
    return [{"id": e.id, "codigo": e.codigo, "nombre": e.nombre, "categoria": e.categoria, "estado": e.estado} for e in equipos]

@router.post("", dependencies=[Depends(require_role(["ADMIN"]))])
def create_equipo(
    item: EquipoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Crear equipo (solo ADMIN)"""
    db_item = Equipo(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"message": "Equipo creado", "id": db_item.id}

@router.put("/{equipo_id}/estado", dependencies=[Depends(require_role(["ADMIN", "DOCENTE"]))])
def update_estado_equipo(
    equipo_id: uuid.UUID,
    estado: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Actualizar estado de un equipo"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    equipo.estado = estado
    db.commit()
    return {"message": "Estado actualizado", "estado": estado}

# --- Componentes ---
@router.get("/componentes", response_model=List[dict])
def read_componentes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    componentes = db.query(Componente).all()
    return [{"id": c.id, "nombre": c.nombre, "categoria": c.categoria, "stock": c.stock, "stock_minimo": c.stock_minimo, "ubicacion": c.ubicacion} for c in componentes]

@router.post("/componentes", dependencies=[Depends(require_role(["ADMIN"]))])
def create_componente(
    item: ComponenteCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    db_item = Componente(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Inteligencia de Alarmas
    if db_item.stock <= db_item.stock_minimo:
        from app.services.alarm_service import trigger_alarm
        from app.models.alarma import TipoAlarma
        trigger_alarm(
            db=db,
            tipo=TipoAlarma.CRITICA,
            titulo=f"Stock de componente por debajo del mínimo",
            descripcion=f"El componente {db_item.nombre} tiene stock ({db_item.stock}) menor o igual al mínimo ({db_item.stock_minimo}).",
            entidad="Componente",
            entidad_id=db_item.id,
            rol_destino="ADMIN",
            accion_recomendada="Solicitar reabastecimiento"
        )
        
    return {"message": "Componente creado", "id": db_item.id}
