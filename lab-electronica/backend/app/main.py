from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.database import engine
from app.api.routes import auth, circuits, labs, diagnosis, equipos, motor_diagnostico, flujo_lab, alarmas, tutor_ia
from app.core.database import Base

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Laboratorio Virtual de Electronica",
    description="Motor de simulacion nodal con diagnostico de fallas por IA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(circuits.router, prefix="/api")
app.include_router(labs.router, prefix="/api")
app.include_router(diagnosis.router, prefix="/api")
app.include_router(equipos.router, prefix="/api/equipos", tags=["equipos"])
app.include_router(motor_diagnostico.router, prefix="/api/motor", tags=["motor_diagnostico"])
app.include_router(flujo_lab.router, prefix="/api/flujo", tags=["flujo_lab"])
app.include_router(alarmas.router, prefix="/api/alarmas", tags=["alarmas"])
app.include_router(tutor_ia.router, prefix="/api/tutor", tags=["tutor_ia"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "lab-electronica-backend"}