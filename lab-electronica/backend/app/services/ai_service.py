import json
import httpx
import asyncio
from typing import AsyncGenerator, Optional
from app.core.config import get_settings

settings = get_settings()


HEURISTIC_TEMPLATES = {
    "short_circuit": {
        "fault_code": "SHORT_CIRCUIT",
        "explanation": "Se detecto un cortocircuito. Segun la Ley de Ohm (V = I*R), cuando la resistencia tiende a cero, la corriente tiende a infinito para un voltaje fijo. Esto puede deberse a: conexion directa entre nodos de diferente potencial, resistencia con valor nominal cero, o componente danado que presenta impedancia nula.",
        "corrective_action": "Verifique las conexiones del circuito. Revise que no existan puentes de soldadura entre pistas adyacentes. Mida la resistencia entre los nodos afectados con un multimetro en modo continuidad. Reemplace el componente si presenta impedancia anomala.",
        "confidence": 0.95,
    },
    "open_circuit": {
        "fault_code": "OPEN_CIRCUIT",
        "explanation": "Se detecto un circuito abierto. Segun la Ley de Ohm, cuando la resistencia tiende a infinito, la corriente es cero para cualquier voltaje aplicado. Esto indica: traza cortada, componente desconectado, union soldada fria, o componente internamente abierto.",
        "corrective_action": "Inspeccione visualmente las conexiones y trazos del PCB. Utilice un multimetro en modo continuidad para rastrear la ruta de senal desde la fuente hasta la carga. Refluir las uniones soldadas sospechosas. Reemplace componentes con lectura de resistencia infinita.",
        "confidence": 0.92,
    },
}


class AIService:
    """Cliente HTTP para comunicacion con Ollama local con fallback heuristico."""

    def __init__(self):
        self.host = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT
        self.max_retries = settings.OLLAMA_MAX_RETRIES
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def diagnose(
        self,
        simulation_result: dict,
        fault_flags: list[str],
        user_question: Optional[str] = None,
    ) -> dict:
        """Diagnostico sincrono. Intenta Ollama con fallback heuristico."""
        for attempt in range(self.max_retries):
            try:
                prompt = self._build_prompt(simulation_result, fault_flags, user_question)
                response = await self.client.post(
                    f"{self.host}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.3, "num_predict": 800},
                    },
                )
                response.raise_for_status()
                data = response.json()
                return self._parse_response(data.get("response", ""), fault_flags, simulation_result)
            except Exception:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                continue
        return self._heuristic_fallback(fault_flags, simulation_result)

    async def diagnose_stream(
        self,
        simulation_result: dict,
        fault_flags: list[str],
        user_question: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Diagnostico con streaming via Ollama. Fallback heuristico si falla."""
        try:
            prompt = self._build_prompt(simulation_result, fault_flags, user_question)
            async with self.client.stream(
                "POST",
                f"{self.host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {"temperature": 0.3, "num_predict": 800},
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("response", "")
                        if token:
                            yield token
                        if chunk.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
        except Exception:
            fallback = self._heuristic_fallback(fault_flags, simulation_result)
            explanation = fallback.get("explanation", "")
            for word in explanation.split():
                yield word + " "
                await asyncio.sleep(0.03)

    def _build_prompt(self, sim_result: dict, fault_flags: list[str], user_question: Optional[str]) -> str:
        node_voltages = sim_result.get("node_voltages", {})
        branch_currents = sim_result.get("branch_currents", {})
        power = sim_result.get("power_dissipation", {})
        op_points = sim_result.get("operating_points", {})

        prompt = f"""Eres un experto en electronica analoga. Analiza el siguiente circuito y explica la falla detectada basandote estrictamente en las Leyes de Ohm y Kirchhoff.

## Resultados de simulacion DC:
- Voltajes nodales: {json.dumps(node_voltages, indent=2)}
- Corrientes de rama: {json.dumps(branch_currents, indent=2)}
- Disipacion de potencia: {json.dumps(power, indent=2)}
- Puntos de operacion: {json.dumps({k: {ki: str(vi) for ki, vi in v.items()} for k, v in op_points.items()}, indent=2)}

## Banderas de falla detectadas: {', '.join(fault_flags)}

## Instrucciones:
1. Explica la causa raiz de la falla usando las leyes fisicas (Ohm, Kirchhoff).
2. Identifica el componente afectado.
3. Proporciona una accion correctiva especifica.
4. Calcula la confianza del diagnostico (0.0 a 1.0).
5. Responde en espanol tecnico.

Responde en formato JSON con: fault_code, affected_component, explanation, corrective_action, confidence.
"""
        if user_question:
            prompt += f"\n## Pregunta del usuario: {user_question}\n"
        return prompt

    def _parse_response(self, raw_response: str, fault_flags: list[str], sim_result: dict) -> dict:
        """Parsea la respuesta de Ollama, extrayendo JSON si existe."""
        try:
            json_start = raw_response.find("{")
            json_end = raw_response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = raw_response[json_start:json_end]
                parsed = json.loads(json_str)
                return {
                    "fault_code": parsed.get("fault_code", "UNKNOWN"),
                    "affected_component": parsed.get("affected_component", "desconocido"),
                    "explanation": parsed.get("explanation", raw_response[:500]),
                    "corrective_action": parsed.get("corrective_action", "Verifique el circuito."),
                    "confidence": float(parsed.get("confidence", 0.7)),
                }
        except (json.JSONDecodeError, ValueError):
            pass
        return self._heuristic_fallback(fault_flags, sim_result)

    def _heuristic_fallback(self, fault_flags: list[str], sim_result: dict) -> dict:
        """Resuelve con heuristicas deterministicas cuando Ollama no esta disponible."""
        for flag in fault_flags:
            if flag in HEURISTIC_TEMPLATES:
                template = HEURISTIC_TEMPLATES[flag].copy()
                template["affected_component"] = self._find_affected_component(sim_result)
                return template

        node_voltages = sim_result.get("node_voltages", {})
        branch_currents = sim_result.get("branch_currents", {})
        explanation = "Analisis del circuito basado en las Leyes de Kirchhoff. "
        if node_voltages:
            max_v = max((float(v) for v in node_voltages.values() if isinstance(v, (int, float))), default=0)
            explanation += f"El voltaje maximo en el circuito es {max_v:.3f}V. "
        if branch_currents:
            max_i = max((abs(float(v)) for v in branch_currents.values() if isinstance(v, (int, float))), default=0)
            explanation += f"La corriente maxima es {max_i:.6f}A. "

        return {
            "fault_code": "CIRCUIT_ANALYSIS",
            "affected_component": self._find_affected_component(sim_result),
            "explanation": explanation,
            "corrective_action": "Verifique los valores de los componentes y las conexiones. Asegurese de que las leyes de Kirchhoff se cumplan en cada nodo.",
            "confidence": 0.6,
        }

    def _find_affected_component(self, sim_result: dict) -> str:
        power = sim_result.get("power_dissipation", {})
        if power:
            max_comp = max(power.items(), key=lambda x: abs(float(x[1]) if isinstance(x[1], (int, float)) else 0))
            return max_comp[0]
        branch_currents = sim_result.get("branch_currents", {})
        if branch_currents:
            return list(branch_currents.keys())[0]
        return "desconocido"