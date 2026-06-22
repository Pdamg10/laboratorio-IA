from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.mantenimiento import Reporte, Diagnostico, Bitacora, Medicion
from app.models.equipo import Equipo
from app.api.routes.auth import get_current_user, require_role
from pydantic import BaseModel

router = APIRouter()

class DiagnosticoCreate(BaseModel):
    id_equipo: uuid.UUID
    descripcion: str
    id_falla_sugerida: uuid.UUID | None = None
    voltaje: float | None = None
    corriente: float | None = None

@router.post("/diagnostico", dependencies=[Depends(require_role(["ESTUDIANTE", "DOCENTE"]))])
def crear_diagnostico(
    item: DiagnosticoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Estudiante o Docente crea un diagnóstico y opcionalmente reporta una falla sugerida por el motor."""
    equipo = db.query(Equipo).filter(Equipo.id == item.id_equipo).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
    diag = Diagnostico(
        id_equipo=item.id_equipo,
        id_estudiante=current_user.id,
        descripcion=item.descripcion,
        id_falla_sugerida=item.id_falla_sugerida
    )
    db.add(diag)
    db.commit()
    db.refresh(diag)
    
    # Añadir mediciones si las hay
    if item.voltaje is not None or item.corriente is not None:
        medicion = Medicion(id_diagnostico=diag.id, voltaje=item.voltaje, corriente=item.corriente)
        db.add(medicion)
    
    # Crear un reporte de mantenimiento pendiente
    reporte = Reporte(id_equipo=item.id_equipo, id_diagnostico=diag.id)
    db.add(reporte)
    
    # Actualizar estado del equipo
    equipo.estado = "En diagnóstico"
    
    # Inteligencia de Alarmas
    from app.services.alarm_service import trigger_alarm
    from app.models.alarma import TipoAlarma
    
    es_peligro = item.voltaje is not None and item.voltaje > 10.0
    
    if es_peligro:
        # Alarma Crítica para el Docente
        trigger_alarm(
            db=db,
            tipo=TipoAlarma.CRITICA,
            titulo="Riesgo Detectado: Voltaje alto",
            descripcion=f"El estudiante ingresó un voltaje de {item.voltaje}V en el equipo {equipo.codigo}.",
            entidad="Equipo",
            entidad_id=equipo.id,
            rol_destino="DOCENTE",
            accion_recomendada="Suspender práctica"
        )
        # Alarma Crítica para el Estudiante
        trigger_alarm(
            db=db,
            tipo=TipoAlarma.CRITICA,
            titulo="⛔ Riesgo de Sobrecarga",
            descripcion=f"Voltaje detectado ({item.voltaje}V) supera el rango seguro. Detén la práctica.",
            entidad="Equipo",
            entidad_id=equipo.id,
            id_usuario_destino=current_user.id,
            accion_recomendada="Desconectar fuente"
        )
    else:
        # Alarma Operativa para Docentes
        trigger_alarm(
            db=db,
            tipo=TipoAlarma.OPERATIVA,
            titulo="Nuevo diagnóstico pendiente",
            descripcion=f"El equipo {equipo.codigo} requiere revisión.",
            entidad="Diagnostico",
            entidad_id=diag.id,
            rol_destino="DOCENTE"
        )
    
    db.commit()
    return {"message": "Diagnóstico y reporte creado", "id_reporte": reporte.id}

@router.get("/reportes", dependencies=[Depends(require_role(["ADMIN", "DOCENTE"]))])
def listar_reportes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Listar reportes pendientes o en curso."""
    reportes = db.query(Reporte).all()
    return [{"id": r.id, "id_equipo": r.id_equipo, "estado": r.estado} for r in reportes]

@router.put("/reportes/{reporte_id}/validar", dependencies=[Depends(require_role(["DOCENTE"]))])
def validar_diagnostico(
    reporte_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Docente valida el diagnóstico de un alumno"""
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    reporte.id_docente_validador = current_user.id
    reporte.estado = "Aprobado"
    
    diag = db.query(Diagnostico).filter(Diagnostico.id == reporte.id_diagnostico).first()
    if diag:
        diag.estado = "Validado"
        
    # El equipo pasa a "Pendiente reparación" porque ya se confirmó la falla
    equipo = db.query(Equipo).filter(Equipo.id == reporte.id_equipo).first()
    if equipo:
        equipo.estado = "Pendiente reparación"
        
    db.commit()
    return {"message": "Diagnóstico validado"}

@router.put("/reportes/{reporte_id}/reparar", dependencies=[Depends(require_role(["ADMIN"]))])
def marcar_reparado(
    reporte_id: uuid.UUID,
    accion: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Admin marca el equipo como reparado"""
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
        
    reporte.id_admin_aprobador = current_user.id
    reporte.estado = "Reparado"
    reporte.accion_tomada = accion
    
    equipo = db.query(Equipo).filter(Equipo.id == reporte.id_equipo).first()
    if equipo:
        equipo.estado = "Disponible"
        
    db.commit()
    return {"message": "Equipo reparado"}

@router.get("/dashboard-stats", dependencies=[Depends(require_role(["ADMIN", "DOCENTE"]))])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    rol = current_user.rol
    
    if rol == "ADMIN":
        from app.models.user import User
        from app.models.equipo import Componente
        
        usuarios_totales = db.query(User).count()
        equipos_totales = db.query(Equipo).count()
        reportes_activos = db.query(Reporte).filter(Reporte.estado == "Pendiente").count()
        componentes_criticos = db.query(Componente).filter(Componente.stock <= Componente.stock_minimo).count()
        
        recent_reports = db.query(Reporte).order_by(Reporte.fecha_reporte.desc()).limit(5).all()
        actividad = []
        for r in recent_reports:
            equipo = db.query(Equipo).filter(Equipo.id == r.id_equipo).first()
            actividad.append({
                "id": str(r.id),
                "fecha": r.fecha_reporte.isoformat() if r.fecha_reporte else None,
                "tipo": "Reporte",
                "descripcion": f"Equipo {equipo.nombre if equipo else 'Desconocido'} reportado.",
                "estado": r.estado
            })
            
        return {
            "usuarios_totales": usuarios_totales,
            "equipos_totales": equipos_totales,
            "reportes_activos": reportes_activos,
            "componentes_criticos": componentes_criticos,
            "actividad_reciente": actividad
        }
    elif rol == "DOCENTE":
        reportes_pendientes = db.query(Reporte).filter(Reporte.estado == "Pendiente").count()
        equipos_asignados = db.query(Equipo).filter(Equipo.estado == "En uso").count()
        
        recent_diags = db.query(Diagnostico).order_by(Diagnostico.fecha.desc()).limit(5).all()
        actividad = []
        for d in recent_diags:
            equipo = db.query(Equipo).filter(Equipo.id == d.id_equipo).first()
            from app.models.user import User
            estudiante = db.query(User).filter(User.id == d.id_estudiante).first()
            actividad.append({
                "id": str(d.id),
                "fecha": d.fecha.isoformat() if d.fecha else None,
                "tipo": "Diagnóstico",
                "descripcion": f"Alumno {estudiante.nombre if estudiante else 'Desconocido'} en {equipo.nombre if equipo else 'Desconocido'}.",
                "estado": d.estado
            })
            
        return {
            "reportes_pendientes": reportes_pendientes,
            "equipos_asignados": equipos_asignados,
            "actividad_reciente": actividad
        }
        
    return {}
