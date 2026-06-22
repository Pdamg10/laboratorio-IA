import sys
import os

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.circuit import Circuit
from app.models.lab import Lab

def seed():
    db = SessionLocal()
    
    # find user Nazaret
    user = db.query(User).filter(User.nombre.ilike("%Nazaret%")).first()
    if not user:
        print("User not found!")
        return
        
    print(f"Found user: {user.nombre} ({user.id})")

    # Circuit 1: Correct
    c1 = Circuit(
        id_usuario=user.id,
        titulo="Ejemplo: Circuito Correcto",
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

    # Circuit 2: Short Circuit
    c2 = Circuit(
        id_usuario=user.id,
        titulo="Ejemplo: Cortocircuito (Falla)",
        data_netlist_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 100, "y": 350} }
          ],
          "edges": [
            { "id": "e1", "from": "v1", "to": "g1", "terminal_from": "p", "terminal_to": "gnd" },
            { "id": "e2", "from": "v1", "to": "g1", "terminal_from": "n", "terminal_to": "gnd" }
          ]
        }
    )

    # Circuit 3: No ground
    c3 = Circuit(
        id_usuario=user.id,
        titulo="Ejemplo: Sin Tierra (Falla)",
        data_netlist_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 200} }
          ],
          "edges": [
            { "id": "e1", "from": "v1", "to": "r1", "terminal_from": "p", "terminal_to": "1" },
            { "id": "e2", "from": "r1", "to": "v1", "terminal_from": "2", "terminal_to": "n" }
          ]
        }
    )

    # Circuit 4: Divisor de Tensión
    c4 = Circuit(
        id_usuario=user.id,
        titulo="Ejemplo: Divisor de Tensión",
        data_netlist_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 10, "position": {"x": 100, "y": 250} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 100} },
            { "id": "r2", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 300} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 300, "y": 450} }
          ],
          "edges": [
            { "id": "e1", "from": "v1", "to": "r1", "terminal_from": "p", "terminal_to": "1" },
            { "id": "e2", "from": "r1", "to": "r2", "terminal_from": "2", "terminal_to": "1" },
            { "id": "e3", "from": "r2", "to": "g1", "terminal_from": "2", "terminal_to": "gnd" },
            { "id": "e4", "from": "v1", "to": "g1", "terminal_from": "n", "terminal_to": "gnd" }
          ]
        }
    )

    db.add(c1)
    db.add(c2)
    db.add(c3)
    db.add(c4)

    # Laboratorios predefinidos
    # Delete existing labs first to avoid duplicates when re-seeding
    db.query(Lab).delete()

    l1 = Lab(
        titulo="Ley de Ohm: Voltaje y Corriente",
        descripcion="En este laboratorio validarás la Ley de Ohm usando una resistencia y una fuente de voltaje. Deberás ensamblar el circuito y medir cómo se relacionan el voltaje y la corriente.",
        dificultad=1,
        circuito_base_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 200} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 200, "y": 350} }
          ],
          "edges": []
        },
        objetivos=["Conectar una fuente a una resistencia.", "Verificar que a mayor resistencia, menor corriente.", "Evitar cortocircuitos."]
    )

    l2 = Lab(
        titulo="Carga de Capacitor (RC)",
        descripcion="Aprende sobre el tiempo de carga de un condensador. Conecta en serie una resistencia y un capacitor.",
        dificultad=2,
        circuito_base_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 12, "position": {"x": 100, "y": 200} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 250, "y": 100} },
            { "id": "c1", "component": "capacitor", "value": 1e-6, "position": {"x": 400, "y": 200} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 250, "y": 350} }
          ],
          "edges": []
        },
        objetivos=["Comprender el efecto capacitivo.", "Ensamblar un circuito en serie RC.", "Observar la curva de carga temporal."]
    )

    l3 = Lab(
        titulo="Rectificación con Diodo",
        descripcion="Utiliza un diodo para permitir el paso de corriente en un solo sentido. Arma el circuito con un diodo, resistencia y fuente.",
        dificultad=3,
        circuito_base_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "d1", "component": "diode", "value": 0, "position": {"x": 250, "y": 100} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 400, "y": 200} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 250, "y": 350} }
          ],
          "edges": []
        },
        objetivos=["Identificar el ánodo y cátodo de un diodo.", "Polarizar directamente el diodo.", "Medir la caída de tensión en polarización directa."]
    )

    l4 = Lab(
        titulo="Divisor de Tensión",
        descripcion="Arma un divisor de voltaje con dos resistencias. Comprueba cómo se reparte el voltaje según el valor de cada resistencia.",
        dificultad=2,
        circuito_base_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 10, "position": {"x": 100, "y": 250} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 300, "y": 100} },
            { "id": "r2", "component": "resistor", "value": 2000, "position": {"x": 300, "y": 300} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 300, "y": 450} }
          ],
          "edges": []
        },
        objetivos=["Comprender el concepto de divisor de tensión.", "Calcular y medir el voltaje en R2.", "Conectar resistencias en serie."]
    )

    l5 = Lab(
        titulo="Filtro Pasa Bajas RC",
        descripcion="Analiza cómo se comporta un circuito RC frente a cambios. Arma el circuito con un capacitor en paralelo a la salida.",
        dificultad=3,
        circuito_base_json={
          "nodes": [
            { "id": "v1", "component": "vsource_dc", "value": 5, "position": {"x": 100, "y": 200} },
            { "id": "r1", "component": "resistor", "value": 1000, "position": {"x": 250, "y": 100} },
            { "id": "c1", "component": "capacitor", "value": 10e-6, "position": {"x": 400, "y": 200} },
            { "id": "g1", "component": "ground", "value": 0, "position": {"x": 250, "y": 300} }
          ],
          "edges": []
        },
        objetivos=["Conectar el capacitor en derivación (paralelo a la salida).", "Comprender la función del resistor y capacitor.", "Identificar el nodo de salida."]
    )

    db.add(l1)
    db.add(l2)
    db.add(l3)
    db.add(l4)
    db.add(l5)

    db.commit()
    print("Ejemplos y laboratorios creados exitosamente!")

if __name__ == "__main__":
    seed()
