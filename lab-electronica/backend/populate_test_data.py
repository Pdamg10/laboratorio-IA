import sys
import os
import uuid
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from app.models.user import User
from app.models.equipo import Equipo, Componente
from app.models.mantenimiento import Diagnostico, Medicion, Reporte, Bitacora
from app.models.circuit import Circuit
from app.models.lab import Lab

def seed():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@lab.com").first()
    docente = db.query(User).filter(User.email == "docente@lab.com").first()
    estudiante = db.query(User).filter(User.email == "estudiante@lab.com").first()

    if not (admin and docente and estudiante):
        print("Faltan usuarios base!")
        return

    # Equipos
    equipos = []
    for i in range(10):
        eq = Equipo(
            id=uuid.uuid4(),
            codigo=f"EQ-TEST-{i}",
            nombre=f"Equipo Prueba {i}",
            categoria="Osciloscopio" if i % 2 == 0 else "Multímetro",
            estado="En diagnóstico" if i < 3 else "Disponible"
        )
        equipos.append(eq)
    db.add_all(equipos)
    db.flush()

    # Componentes
    for i in range(15):
        comp = Componente(
            id=uuid.uuid4(),
            nombre=f"Resistencia {i}k",
            categoria="Electrónica",
            stock=random.randint(5, 50),
            stock_minimo=10,
            ubicacion=f"Estante A-{i}"
        )
        db.add(comp)

    # Diagnosticos (Estudiante crea, Docente valida)
    for i in range(3):
        diag = Diagnostico(
            id=uuid.uuid4(),
            id_equipo=equipos[i].id,
            id_estudiante=estudiante.id,
            descripcion=f"Falla reportada por el estudiante en equipo {i}",
            estado="En revisión" if i == 0 else "Validado"
        )
        db.add(diag)
        db.flush()

        # Reporte
        rep = Reporte(
            id_equipo=equipos[i].id,
            id_diagnostico=diag.id,
            estado="Pendiente" if i == 0 else "Aprobado",
            id_docente_validador=docente.id if i > 0 else None
        )
        db.add(rep)
        
        # Mediciones
        med = Medicion(
            id_diagnostico=diag.id,
            voltaje=5.0,
            corriente=1.2,
            resistencia=100.0
        )
        db.add(med)

    # Circuitos de ejemplo para el estudiante
    c1 = Circuit(
        id_usuario=estudiante.id,
        titulo="Mi Primer Circuito",
        data_netlist_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 100} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 200, "y": 300} }
          ],
          "edges": [
            { "id": "e1", "from": "v1", "to": "r1", "terminal_from": "p", "terminal_to": "1" },
            { "id": "e2", "from": "r1", "to": "g1", "terminal_from": "2", "terminal_to": "gnd" },
            { "id": "e3", "from": "v1", "to": "g1", "terminal_from": "n", "terminal_to": "gnd" }
          ]
        }
    )
    db.add(c1)

    db.commit()
    print("Datos de prueba para admin, docente y estudiante generados exitosamente.")

if __name__ == "__main__":
    seed()
