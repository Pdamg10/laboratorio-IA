import { AlertTriangle, Info } from "lucide-react";
import { useDiagnosisStore } from "@/store/diagnosisStore";
import { useCircuitStore } from "@/store/circuitStore";

export default function FaultAlert() {
  const faultFlags = useCircuitStore((s) => s.faultFlags);
  const simulationResult = useCircuitStore((s) => s.simulationResult);

  const streamText = useDiagnosisStore((s) => s.streamText);
  const isStreaming = useDiagnosisStore((s) => s.isStreaming);

  if (!faultFlags.length || !simulationResult) return null;

  const faultNames: Record<string, { label: string; color: string; bg: string; border: string }> = {
    short_circuit: {
      label: "Cortocircuito detectado",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    open_circuit: {
      label: "Circuito abierto",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    floating_node: {
      label: "Nodo flotante",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    power_exceeded: {
      label: "Exceso de potencia",
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 max-w-lg w-full px-4">
      {faultFlags.map((flag) => {
        const style = faultNames[flag] ?? {
          label: flag,
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
        };

        return (
          <div
            key={flag}
            className={`${style.bg} ${style.border} border rounded-lg shadow-sm p-3 flex items-start gap-3`}
          >
            <AlertTriangle size={18} className={`${style.color} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-semibold ${style.color}`}>{style.label}</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                {flag === "short_circuit" &&
                  "Conexion de baja impedancia entre nodos de diferente potencial. Revise las trazas del circuito."}
                {flag === "open_circuit" &&
                  "Ruta de corriente interrumpida. Verifique continuidad con un multimetro."}
                {flag === "floating_node" &&
                  "Nodo sin referencia a tierra o con conexion insuficiente. Agregue una resistencia a tierra."}
                {flag === "power_exceeded" &&
                  `Disipacion de potencia elevada detectada en ${simulationResult.power_dissipation
                    ? Object.entries(simulationResult.power_dissipation)
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                        .slice(0, 2)
                        .map(([k, v]) => `${k} (${(v * 1000).toFixed(2)}mW)`)
                        .join(", ")
                    : "componente desconocido"}`}
              </p>

              {isStreaming && streamText && (
                <div className="mt-2 text-xs text-gray-500 bg-white/60 rounded p-2 border border-white">
                  <div className="flex items-center gap-1 mb-1">
                    <Info size={10} className="text-blue-500" />
                    <span className="font-medium text-blue-600">Analisis en progreso...</span>
                  </div>
                  <p className="line-clamp-3">{streamText}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}