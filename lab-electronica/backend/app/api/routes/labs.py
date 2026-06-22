from uuid import uuid4
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.lab import Lab
from app.api.routes.auth import get_current_user, User

router = APIRouter(prefix="/labs", tags=["labs"])

PREDEFINED_LABS = [
    {
        "titulo": "Divisor de Voltaje",
        "descripcion": "Construye un divisor de voltaje con dos resistencias. Comprende como el voltaje se distribuye proporcionalmente a los valores de resistencia segun la Ley de Ohm.",
        "dificultad": 1,
        "circuito_base_json": {
            "nodes": [
                {"id": "vs1", "x": 100, "y": 200, "component": "vsource_dc", "value": 12, "unit": "V"},
                {"id": "r1", "x": 300, "y": 150, "component": "resistor", "value": 1000, "unit": "ohm"},
                {"id": "r2", "x": 300, "y": 250, "component": "resistor", "value": 1000, "unit": "ohm"},
            ],
            "edges": [
                {"id": "e1", "from": "vs1", "to": "r1", "terminal_from": "positive", "terminal_to": "positive"},
                {"id": "e2", "from": "r1", "to": "r2", "terminal_from": "negative", "terminal_to": "positive"},
                {"id": "e3", "from": "r2", "to": "vs1", "terminal_from": "negative", "terminal_to": "negative"},
            ]
        },
        "objetivos": ["Verificar Vout = Vin * R2/(R1+R2)", "Medir corriente total", "Comprobar Ley de Ohm"],
    },
    {
        "titulo": "Rectificador de Media Onda",
        "descripcion": "Simula un rectificador de media onda con un diodo ideal. Observa como el diodo conduce solo durante el semiciclo positivo.",
        "dificultad": 2,
        "circuito_base_json": {
            "nodes": [
                {"id": "vs1", "x": 100, "y": 200, "component": "vsource_dc", "value": 5, "unit": "V"},
                {"id": "d1", "x": 250, "y": 200, "component": "diode", "value": 0, "unit": ""},
                {"id": "r1", "x": 400, "y": 200, "component": "resistor", "value": 1000, "unit": "ohm"},
            ],
            "edges": [
                {"id": "e1", "from": "vs1", "to": "d1", "terminal_from": "positive", "terminal_to": "positive"},
                {"id": "e2", "from": "d1", "to": "r1", "terminal_from": "negative", "terminal_to": "positive"},
                {"id": "e3", "from": "r1", "to": "vs1", "terminal_from": "negative", "terminal_to": "negative"},
            ]
        },
        "objetivos": ["Analizar polarizacion del diodo", "Medir caida de voltaje en directa", "Verificar corriente de carga"],
    },
    {
        "titulo": "Amplificador Emisor Comun",
        "descripcion": "Configura un transistor BJT NPN en configuracion de emisor comun. Estudia las regiones de corte, activa y saturacion.",
        "dificultad": 3,
        "circuito_base_json": {
            "nodes": [
                {"id": "vcc", "x": 300, "y": 100, "component": "vsource_dc", "value": 12, "unit": "V"},
                {"id": "vbb", "x": 100, "y": 200, "component": "vsource_dc", "value": 2, "unit": "V"},
                {"id": "rb", "x": 200, "y": 200, "component": "resistor", "value": 10000, "unit": "ohm"},
                {"id": "rc", "x": 300, "y": 200, "component": "resistor", "value": 1000, "unit": "ohm"},
                {"id": "q1", "x": 300, "y": 300, "component": "bjt_npn", "value": 0, "unit": ""},
                {"id": "re", "x": 300, "y": 400, "component": "resistor", "value": 100, "unit": "ohm"},
            ],
            "edges": [
                {"id": "e1", "from": "vcc", "to": "rc", "terminal_from": "positive", "terminal_to": "positive"},
                {"id": "e2", "from": "rc", "to": "q1", "terminal_from": "negative", "terminal_to": "collector"},
                {"id": "e3", "from": "vbb", "to": "rb", "terminal_from": "positive", "terminal_to": "positive"},
                {"id": "e4", "from": "rb", "to": "q1", "terminal_from": "negative", "terminal_to": "base"},
                {"id": "e5", "from": "q1", "to": "re", "terminal_from": "emitter", "terminal_to": "positive"},
                {"id": "e6", "from": "re", "to": "vcc", "terminal_from": "negative", "terminal_to": "negative"},
                {"id": "e7", "from": "q1", "to": "re", "terminal_from": "emitter", "terminal_to": "positive"},
            ]
        },
        "objetivos": ["Punto Q en region activa", "Ganancia de voltaje", "Estudiar saturacion y corte"],
    },
    {
        "titulo": "Filtro RC Pasa-Bajos",
        "descripcion": "Analiza un filtro RC pasa-bajos. En DC, el capacitor se comporta como circuito abierto.",
        "dificultad": 2,
        "circuito_base_json": {
            "nodes": [
                {"id": "vs1", "x": 100, "y": 200, "component": "vsource_dc", "value": 10, "unit": "V"},
                {"id": "r1", "x": 250, "y": 200, "component": "resistor", "value": 1000, "unit": "ohm"},
                {"id": "c1", "x": 400, "y": 200, "component": "capacitor", "value": 1e-6, "unit": "F"},
            ],
            "edges": [
                {"id": "e1", "from": "vs1", "to": "r1", "terminal_from": "positive", "terminal_to": "positive"},
                {"id": "e2", "from": "r1", "to": "c1", "terminal_from": "negative", "terminal_to": "positive"},
                {"id": "e3", "from": "c1", "to": "vs1", "terminal_from": "negative", "terminal_to": "negative"},
            ]
        },
        "objetivos": ["Voltaje en capacitor en estado estable", "Corriente de carga inicial", "Constante de tiempo tau = RC"],
    },
]


def seed_labs(db: Session):
    existing = db.query(Lab).count()
    if existing > 0:
        return
    for lab_data in PREDEFINED_LABS:
        lab = Lab(
            id=uuid4(),
            titulo=lab_data["titulo"],
            descripcion=lab_data.get("descripcion"),
            dificultad=lab_data["dificultad"],
            circuito_base_json=lab_data["circuito_base_json"],
            objetivos=lab_data.get("objetivos", []),
        )
        db.add(lab)
    db.commit()


@router.get("")
def list_labs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    seed_labs(db)
    labs = db.query(Lab).order_by(Lab.dificultad.asc()).all()
    return [l.to_dict() for l in labs]


@router.get("/{lab_id}")
def get_lab(lab_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    return lab.to_dict()