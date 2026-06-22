from typing import Optional, AsyncGenerator
from app.services.ai_service import AIService, HEURISTIC_TEMPLATES

# Flags que se resuelven deterministicamente sin IA
DETERMINISTIC_FAULTS = {"short_circuit", "open_circuit"}
# Flags que requieren analisis contextual (IA)
AMBIGUOUS_FAULTS = {"floating_node", "power_exceeded"}


class DiagnosisOrchestrator:
    """
    Orquestador de diagnostico:
    - Fallas deterministicas (short_circuit, open_circuit): heuristica instantanea
    - Fallas ambiguas (floating_node, power_exceeded): prompt estructurado -> Ollama
    - Pregunta de usuario: siempre Ollama
    """

    def __init__(self):
        self.ai_service = AIService()

    def is_deterministic(self, fault_flags: list[str]) -> bool:
        """Determina si la falla puede resolverse sin IA."""
        if not fault_flags:
            return True
        return all(flag in DETERMINISTIC_FAULTS for flag in fault_flags)

    def requires_ai(self, fault_flags: list[str], user_question: Optional[str] = None) -> bool:
        """Determina si se necesita llamar a Ollama."""
        if user_question:
            return True
        return any(flag in AMBIGUOUS_FAULTS for flag in fault_flags)

    async def diagnose(
        self,
        circuit_id: str,
        simulation_result: dict,
        fault_flags: list[str],
        user_question: Optional[str] = None,
    ) -> dict:
        """Diagnostico sincrono: heuristica o IA segun corresponda."""
        if not self.requires_ai(fault_flags, user_question):
            return self._heuristic_diagnose(circuit_id, simulation_result, fault_flags)

        result = await self.ai_service.diagnose(simulation_result, fault_flags, user_question)
        result["circuit_id"] = circuit_id
        return result

    async def diagnose_stream(
        self,
        circuit_id: str,
        simulation_result: dict,
        fault_flags: list[str],
        user_question: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Diagnostico con streaming: heuristica o IA segun corresponda."""
        if not self.requires_ai(fault_flags, user_question):
            result = self._heuristic_diagnose(circuit_id, simulation_result, fault_flags)
            import json
            yield json.dumps({"type": "heuristic", "data": result})
            return

        async for token in self.ai_service.diagnose_stream(simulation_result, fault_flags, user_question):
            yield token

    def _heuristic_diagnose(self, circuit_id: str, simulation_result: dict, fault_flags: list[str]) -> dict:
        """Resuelve con heuristicas deterministicas."""
        for flag in fault_flags:
            if flag in HEURISTIC_TEMPLATES:
                result = HEURISTIC_TEMPLATES[flag].copy()
                result["circuit_id"] = circuit_id
                result["affected_component"] = self._find_affected_component(simulation_result)
                return result

        return {
            "circuit_id": circuit_id,
            "fault_code": "CIRCUIT_OK" if not fault_flags else "UNKNOWN_FAULT",
            "affected_component": self._find_affected_component(simulation_result),
            "explanation": "El circuito no presenta fallas detectables. Revise manualmente si el comportamiento no es el esperado.",
            "corrective_action": "Ninguna accion requerida.",
            "confidence": 0.85,
        }

    def _find_affected_component(self, sim_result: dict) -> str:
        power = sim_result.get("power_dissipation", {})
        if power:
            max_comp = max(power.items(), key=lambda x: abs(float(x[1])) if isinstance(x[1], (int, float)) else 0)
            return max_comp[0]
        currents = sim_result.get("branch_currents", {})
        if currents:
            return list(currents.keys())[0]
        return "desconocido"