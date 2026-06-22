import sys
import os
import uuid
import random
from datetime import datetime, timedelta
from faker import Faker

# Ajustar path para importar módulos de la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.equipo import Equipo, Componente
from app.models.mantenimiento import Diagnostico, Medicion, Reporte, Bitacora
from app.api.routes.auth import get_password_hash

fake = Faker('es_ES')

def seed_massive():
    print("Iniciando generación masiva de datos...")
    db = SessionLocal()
    
    try:
        # 1. USUARIOS
        # 3 Administradores, 10 Docentes, 60 Estudiantes
        print("Generando Usuarios...")
        admins = []
        for i in range(3):
            u = User(id=uuid.uuid4(), nombre=fake.name(), email=f"admin{i+1}@lab.com", password_hash=get_password_hash("admin"), rol="ADMIN")
            admins.append(u)
        
        docentes = []
        for i in range(10):
            # 2 docentes sin asignaciones (los dejaremos al final sin asociar en diagnósticos)
            u = User(id=uuid.uuid4(), nombre=fake.name(), email=f"docente{i+1}@lab.com", password_hash=get_password_hash("docente"), rol="DOCENTE")
            docentes.append(u)
            
        estudiantes = []
        for i in range(60):
            # 3 estudiantes inactivos (sin actividad) - los últimos 3
            u = User(id=uuid.uuid4(), nombre=fake.name(), email=f"estudiante{i+1}@lab.com", password_hash=get_password_hash("estudiante"), rol="ESTUDIANTE")
            estudiantes.append(u)
            
        db.add_all(admins + docentes + estudiantes)
        db.flush()

        # 2. EQUIPOS
        # 40 equipos (Osciloscopios, Multímetros, Fuentes DC, Generadores, etc)
        print("Generando Equipos...")
        categorias = ["Osciloscopio", "Multímetro", "Fuente DC", "Generador de señal", "Placa Arduino", "Raspberry Pi", "Soldadora", "Fuente ATX"]
        estados = ["Disponible", "En uso", "En diagnóstico", "Pendiente reparación", "Reparado", "Fuera de servicio"]
        
        equipos = []
        for i in range(40):
            cat = random.choice(categorias)
            # 1 equipo retirado (Fuera de servicio)
            est = "Fuera de servicio" if i == 39 else random.choice(estados)
            # 5 equipos sin diagnóstico (los primeros 5)
            
            eq = Equipo(
                id=uuid.uuid4(),
                codigo=f"{cat[:3].upper()}-{fake.unique.random_int(min=100, max=999)}",
                nombre=f"{cat} {fake.company()}",
                categoria=cat,
                estado=est
            )
            equipos.append(eq)
        db.add_all(equipos)
        db.flush()

        # 3. COMPONENTES
        # 100 componentes
        print("Generando Componentes...")
        nombres_comp = ["Resistencia 1k", "Resistencia 10k", "Capacitor 10uF", "Diodo 1N4148", "Transistor 2N2222", "Fusible 2A", "MOSFET IRFZ44N", "LM358", "NE555"]
        componentes = []
        for i in range(100):
            # 4 componentes con stock crítico (stock <= stock_minimo)
            if i < 4:
                stock = random.randint(0, 2)
                minimo = random.randint(3, 10)
            else:
                minimo = random.randint(5, 20)
                stock = random.randint(minimo + 5, 100)
                
            comp = Componente(
                id=uuid.uuid4(),
                nombre=f"{random.choice(nombres_comp)} {fake.ean(length=8)}",
                categoria="Electrónica",
                stock=stock,
                stock_minimo=minimo,
                ubicacion=f"Estante {random.choice(['A','B','C'])}-{random.randint(1,5)}"
            )
            componentes.append(comp)
        db.add_all(componentes)
        db.flush()

        # 4. DIAGNÓSTICOS & MEDICIONES & REPORTES
        # 120 diagnósticos
        print("Generando Diagnósticos, Mediciones e Historial...")
        diagnosticos = []
        
        # Docentes activos: los primeros 8. Estudiantes activos: los primeros 57
        # Equipos disponibles para diag: saltamos los primeros 5 (casos borde)
        equipos_diag = equipos[5:] 
        
        estados_diag = ["Borrador", "En revisión", "Validado", "Rechazado"]
        sintomas_list = ["No enciende", "Pantalla parpadea", "Cortocircuito en salida", "Ruido excesivo", "Lectura errática", "Se apaga a los 5 minutos", "Huele a quemado"]
        
        for i in range(120):
            # 2 diagnósticos rechazados garantizados
            if i < 2:
                est_diag = "Rechazado"
            else:
                est_diag = random.choice(estados_diag)
                
            estud = random.choice(estudiantes[:57])
            doc = random.choice(docentes[:8]) if est_diag in ["Validado", "Rechazado"] else None
            eq = random.choice(equipos_diag)
            
            diag = Diagnostico(
                id=uuid.uuid4(),
                id_equipo=eq.id,
                id_estudiante=estud.id,
                descripcion=random.choice(sintomas_list),
                estado=est_diag
            )
            diagnosticos.append(diag)
            db.add(diag)
            db.flush()
            
            # MEDICIONES REALISTAS
            med = Medicion(
                id_diagnostico=diag.id,
                voltaje=round(random.uniform(0.0, 15.0), 2),
                corriente=round(random.uniform(0.0, 3.0), 2),
                resistencia=round(random.uniform(10.0, 1000.0), 2)
            )
            db.add(med)
            
            # REPORTE Y BITACORA
            rep = Reporte(
                id_equipo=eq.id,
                id_diagnostico=diag.id,
                estado="Pendiente" if est_diag != "Validado" else "Aprobado",
                id_docente_validador=doc.id if doc else None
            )
            db.add(rep)
            
            bit = Bitacora(
                id_equipo=eq.id,
                id_usuario=estud.id,
                evento=f"DIAGNOSTICO_CREADO: El estudiante creó un diagnóstico por síntoma: {diag.descripcion}"
            )
            db.add(bit)
            
        # Registros huérfanos simulados: Un diagnóstico apuntando a un equipo que no existe (NULL)
        # SQLAlchemy forzará validación si tenemos la foreign key restrict, por lo que crearemos un equipo, lo enlazaremos y luego "teóricamente" se borraría. Pero para simular el caso, dejaremos uno sin asignar doc ni estudiante.
        diag_huerfano = Diagnostico(
            id=uuid.uuid4(),
            id_equipo=equipos[0].id,
            id_estudiante=estudiantes[0].id, # Obligatorio por FK
            descripcion="Falla desconocida - registro semi-huérfano para testing",
            estado="Borrador"
        )
        db.add(diag_huerfano)

        db.commit()
        print(f"\\n¡Datos generados con éxito!")
        print(f"Usuarios: 73 | Equipos: 40 | Componentes: 100 | Diagnósticos: 121")
        print(f"Logueate con admin1@lab.com / admin para probar.")
        
    except Exception as e:
        db.rollback()
        print(f"Error generando datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_massive()
