from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session
from app.models.alarma import Alarma, TipoAlarma, EstadoAlarma

COOLDOWN_MINUTES = 15

def trigger_alarm(
    db: Session,
    tipo: TipoAlarma,
    titulo: str,
    descripcion: str,
    entidad: str = None,
    entidad_id: uuid.UUID = None,
    id_usuario_destino: uuid.UUID = None,
    rol_destino: str = None,
    accion_recomendada: str = None
) -> Alarma:
    """
    Emite una alarma inteligente, validando un cooldown para evitar spam (notificaciones repetidas).
    """
    
    # 1. Comprobar Cooldown: Existe una alarma igual en los últimos 15 min?
    umbral = datetime.utcnow() - timedelta(minutes=COOLDOWN_MINUTES)
    
    query = db.query(Alarma).filter(
        Alarma.titulo == titulo,
        Alarma.fecha >= umbral
    )
    
    if entidad and entidad_id:
        query = query.filter(Alarma.entidad == entidad, Alarma.entidad_id == entidad_id)
        
    if id_usuario_destino:
        query = query.filter(Alarma.id_usuario_destino == id_usuario_destino)
    elif rol_destino:
        query = query.filter(Alarma.rol_destino == rol_destino)
        
    alarma_reciente = query.first()
    
    if alarma_reciente:
        print(f"Alarma suprimida por cooldown: {titulo}")
        return alarma_reciente # No la duplicamos
        
    # 2. Crear nueva alarma
    nueva_alarma = Alarma(
        id=uuid.uuid4(),
        tipo=tipo.value,
        titulo=titulo,
        descripcion=descripcion,
        entidad=entidad,
        entidad_id=entidad_id,
        id_usuario_destino=id_usuario_destino,
        rol_destino=rol_destino,
        accion_recomendada=accion_recomendada,
        estado=EstadoAlarma.NUEVA.value
    )
    
    db.add(nueva_alarma)
    db.commit()
    db.refresh(nueva_alarma)
    
    print(f"Alarma generada: [{tipo.value}] {titulo}")
    return nueva_alarma
