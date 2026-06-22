import json
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.diagnosis.orchestrator import DiagnosisOrchestrator
from app.models.diagnosis_log import DiagnosisLog
from app.api.routes.auth import get_current_user, User

router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])
orchestrator = DiagnosisOrchestrator()


class DiagnosisRequest(BaseModel):
    circuit_id: str
    simulation_result: dict
    fault_flags: list[str]
    user_question: Optional[str] = None


class DiagnosisResponse(BaseModel):
    fault_code: str
    affected_component: str
    explanation: str
    corrective_action: str
    confidence: float


@router.post("", response_model=DiagnosisResponse)
async def diagnose(req: DiagnosisRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = await orchestrator.diagnose(
        circuit_id=req.circuit_id,
        simulation_result=req.simulation_result,
        fault_flags=req.fault_flags,
        user_question=req.user_question,
    )

    log = DiagnosisLog(
        id_proyecto=req.circuit_id,
        codigo_falla=result.get("fault_code", "UNKNOWN"),
        descripcion_tecnica=result.get("explanation", "")[:2000],
        json_metadata={
            "fault_flags": req.fault_flags,
            "affected_component": result.get("affected_component"),
            "user_question": req.user_question,
            "confidence": result.get("confidence"),
        },
        confidence=float(result.get("confidence", 0)),
    )
    db.add(log)
    db.commit()

    return DiagnosisResponse(
        fault_code=result["fault_code"],
        affected_component=result["affected_component"],
        explanation=result["explanation"],
        corrective_action=result["corrective_action"],
        confidence=result["confidence"],
    )


@router.get("/history/{circuit_id}")
def history(circuit_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    logs = db.query(DiagnosisLog).filter(DiagnosisLog.id_proyecto == circuit_id).order_by(DiagnosisLog.timestamp.desc()).all()
    return [l.to_dict() for l in logs]


@router.websocket("/ws")
async def diagnosis_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                circuit_id = data.get("circuit_id", "")
                sim_result = data.get("simulation_result", {})
                fault_flags = data.get("fault_flags", [])
                user_question = data.get("user_question")

                async for token in orchestrator.diagnose_stream(
                    circuit_id=circuit_id,
                    simulation_result=sim_result,
                    fault_flags=fault_flags,
                    user_question=user_question,
                ):
                    await websocket.send_json({"type": "token", "content": token})

                await websocket.send_json({"type": "done"})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "JSON invalido"})
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        pass