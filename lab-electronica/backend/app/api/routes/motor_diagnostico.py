from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.sintoma_motor import Sintoma, CausaProbable
from app.models.mantenimiento import Falla
from app.api.routes.auth import get_current_user

router = APIRouter()

class DiagnosticoRequest(BaseModel):
    sintoma_texto: str

class CausaResponse(BaseModel):
    falla_tipo: str
    falla_severidad: str
    probabilidad: float
    pruebas_sugeridas: str

@router.post("/inferir", response_model=List[CausaResponse])
def inferir_diagnostico(
    req: DiagnosticoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """Motor de detección asistida (Basado en reglas)"""
    # Buscamos el sintoma que coincida (simplificado a match exacto o contenido)
    sintoma = db.query(Sintoma).filter(Sintoma.descripcion.ilike(f"%{req.sintoma_texto}%")).first()
    
    if not sintoma:
        # Fallback genérico si no hay coincidencias
        return [
            CausaResponse(
                falla_tipo="Falla Desconocida",
                falla_severidad="Media",
                probabilidad=0.5,
                pruebas_sugeridas="Revisión general de componentes de potencia y visual."
            )
        ]
    
    causas = db.query(CausaProbable).filter(CausaProbable.id_sintoma == sintoma.id).order_by(CausaProbable.probabilidad.desc()).all()
    
    resultados = []
    for causa in causas:
        falla = db.query(Falla).filter(Falla.id == causa.id_falla).first()
        if falla:
            resultados.append(CausaResponse(
                falla_tipo=falla.tipo,
                falla_severidad=falla.severidad,
                probabilidad=causa.probabilidad,
                pruebas_sugeridas=causa.pruebas_sugeridas or "Ninguna sugerencia adicional."
            ))
            
    return resultados

# Helper endpoint para poblar la BD con reglas demo
@router.post("/seed")
def seed_motor(db: Session = Depends(get_db)):
    """Crear datos demo para probar el motor de IA"""
    sintoma = db.query(Sintoma).filter(Sintoma.descripcion == "No enciende").first()
    if not sintoma:
        sintoma = Sintoma(descripcion="No enciende", categoria="Energía")
        db.add(sintoma)
        db.commit()
        db.refresh(sintoma)
        
        f1 = Falla(tipo="Fuente dañada", severidad="Critica")
        f2 = Falla(tipo="Capacitor defectuoso", severidad="Alta")
        f3 = Falla(tipo="Fusible abierto", severidad="Media")
        db.add_all([f1, f2, f3])
        db.commit()
        
        c1 = CausaProbable(id_sintoma=sintoma.id, id_falla=f1.id, probabilidad=0.78, pruebas_sugeridas="Medir voltaje a la salida del puente rectificador.")
        c2 = CausaProbable(id_sintoma=sintoma.id, id_falla=f2.id, probabilidad=0.14, pruebas_sugeridas="Revisar abombamiento visual en capacitores de filtro.")
        c3 = CausaProbable(id_sintoma=sintoma.id, id_falla=f3.id, probabilidad=0.08, pruebas_sugeridas="Test de continuidad en el fusible principal.")
        db.add_all([c1, c2, c3])
        db.commit()
        
    return {"message": "Motor de diagnóstico inicializado con reglas básicas"}
