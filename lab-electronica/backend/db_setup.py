import asyncio
from app.core.database import engine
from app.core.database import Base
# Import all models to register them
from app.models import user, circuit, lab, diagnosis_log, equipo, mantenimiento, sintoma_motor

print("Dropping and creating all tables...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
