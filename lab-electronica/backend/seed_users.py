from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
import uuid

def seed_users():
    db = SessionLocal()
    try:
        # Check if DOCENTE exists
        docente = db.query(User).filter(User.email == "docente@lab.com").first()
        if not docente:
            docente = User(
                id=uuid.uuid4(),
                email="docente@lab.com",
                nombre="Docente Prueba",
                password_hash=get_password_hash("docente123"),
                rol="DOCENTE"
            )
            db.add(docente)
            print("Usuario Docente creado: docente@lab.com / docente123")
        else:
            print("Usuario Docente ya existe.")

        # Check if ESTUDIANTE exists
        estudiante = db.query(User).filter(User.email == "estudiante@lab.com").first()
        if not estudiante:
            estudiante = User(
                id=uuid.uuid4(),
                email="estudiante@lab.com",
                nombre="Estudiante Prueba",
                password_hash=get_password_hash("estudiante123"),
                rol="ESTUDIANTE"
            )
            db.add(estudiante)
            print("Usuario Estudiante creado: estudiante@lab.com / estudiante123")
        else:
            print("Usuario Estudiante ya existe.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
