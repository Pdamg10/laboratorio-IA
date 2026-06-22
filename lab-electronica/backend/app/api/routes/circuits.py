from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.simulation.nodal_solver import NodalSolver, NetlistDef, NetlistNode, NetlistEdge
from app.models.circuit import Circuit
from app.api.routes.auth import get_current_user, User

router = APIRouter(prefix="/circuits", tags=["circuits"])


class CircuitCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    data_netlist_json: dict


class CircuitUpdate(BaseModel):
    titulo: Optional[str] = None
    data_netlist_json: Optional[dict] = None
    estado_simulacion: Optional[int] = None


class CircuitResponse(BaseModel):
    id_proyecto: str
    id_usuario: str
    titulo: str
    data_netlist_json: dict
    estado_simulacion: int
    created_at: str


class SimulationRequest(BaseModel):
    circuit_id: str
    netlist: dict


class SimulationAPIResponse(BaseModel):
    circuit_id: str
    node_voltages: dict
    branch_currents: dict
    operating_points: dict
    fault_flags: list
    convergence: bool
    iterations: int
    power_dissipation: dict


@router.post("", response_model=CircuitResponse, status_code=status.HTTP_201_CREATED)
def create(data: CircuitCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    circuit = Circuit(
        id=uuid4(),
        id_usuario=user.id,
        titulo=data.titulo,
        data_netlist_json=data.data_netlist_json,
        estado_simulacion=0,
    )
    db.add(circuit)
    db.commit()
    db.refresh(circuit)
    return circuit.to_dict()


@router.get("")
def list_circuits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    circuits = db.query(Circuit).filter(Circuit.id_usuario == user.id).order_by(Circuit.created_at.desc()).all()
    return [c.to_dict() for c in circuits]


@router.get("/{circuit_id}")
def get(circuit_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    circuit = db.query(Circuit).filter(Circuit.id == circuit_id, Circuit.id_usuario == user.id).first()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuito no encontrado")
    return circuit.to_dict()


@router.put("/{circuit_id}", response_model=CircuitResponse)
def update(circuit_id: str, data: CircuitUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    circuit = db.query(Circuit).filter(Circuit.id == circuit_id, Circuit.id_usuario == user.id).first()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuito no encontrado")
    if data.titulo is not None:
        circuit.titulo = data.titulo
    if data.data_netlist_json is not None:
        circuit.data_netlist_json = data.data_netlist_json
    if data.estado_simulacion is not None:
        circuit.estado_simulacion = data.estado_simulacion
    db.commit()
    db.refresh(circuit)
    return circuit.to_dict()


@router.delete("/{circuit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(circuit_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    circuit = db.query(Circuit).filter(Circuit.id == circuit_id, Circuit.id_usuario == user.id).first()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuito no encontrado")
    db.delete(circuit)
    db.commit()


@router.post("/simulate", response_model=SimulationAPIResponse)
def simulate(req: SimulationRequest):
    try:
        nodes = []
        for n in req.netlist.get("nodes", []):
            nodes.append(NetlistNode(
                id=n.get("id"),
                component=n.get("component", "resistor"),
                value=float(n.get("value", 0.0)),
                unit=n.get("unit", "ohm"),
                x=float(n.get("x", 0.0)),
                y=float(n.get("y", 0.0))
            ))
        edges = []
        for e in req.netlist.get("edges", []):
            edges.append(NetlistEdge(
                from_comp=e.get("from"),
                to_comp=e.get("to"),
                terminal_from=e.get("terminal_from", "positive"),
                terminal_to=e.get("terminal_to", "negative")
            ))
        netlist_def = NetlistDef(nodes=nodes, edges=edges)
        
        solver = NodalSolver(netlist_def)
        result = solver.solve()
        return {
            "circuit_id": req.circuit_id,
            "node_voltages": result.node_voltages,
            "branch_currents": result.branch_currents,
            "operating_points": result.operating_points,
            "fault_flags": result.fault_flags,
            "convergence": result.convergence,
            "iterations": result.iterations,
            "power_dissipation": result.power_dissipation,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error de simulacion: {str(e)}")