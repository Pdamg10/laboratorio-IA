import { useState, useRef, useEffect } from "react";
import { useCircuitStore } from "@/store/circuitStore";
import { useDiagnosis } from "@/hooks/useDiagnosis";
import { AlertTriangle, Activity, MessageSquare, RotateCcw, Wifi, WifiOff } from "lucide-react";

export default function DiagnosisPanel() {
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    isStreaming,
    streamText,
    diagnosisResult,
    history,
    wsConnected,
    requestDiagnosisStream,
    requestDiagnosisRest,
    resetStream,
  } = useDiagnosis();

  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const faultFlags = useCircuitStore((s) => s.faultFlags);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamText, diagnosisResult]);

  const handleAsk = async () => {
    if (!simulationResult) return;
    const circuitId = `circuit_${Date.now()}`;
    resetStream();

    if (question.trim()) {
      requestDiagnosisStream(circuitId, simulationResult, faultFlags, question.trim());
    } else if (faultFlags.length > 0) {
      requestDiagnosisStream(circuitId, simulationResult, faultFlags);
    } else {
      requestDiagnosisRest(circuitId, simulationResult, faultFlags, question.trim() || undefined);
    }
    setQuestion("");
  };

  const handleReDiagnose = () => {
    if (!simulationResult) return;
    const circuitId = `circuit_${Date.now()}`;
    resetStream();
    requestDiagnosisStream(circuitId, simulationResult, faultFlags);
  };

  const hasFaults = faultFlags.length > 0;
  const faultColor = hasFaults
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Diagnostico IA</h2>
        </div>
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <Wifi size={14} className="text-emerald-500" />
          ) : (
            <WifiOff size={14} className="text-gray-400" />
          )}
          {hasFaults && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={12} />
              {faultFlags.length}
            </span>
          )}
        </div>
      </div>

      {/* Fault flags */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className={`text-xs px-3 py-2 rounded-lg border ${faultColor}`}>
          {hasFaults ? (
            <div>
              <span className="font-medium">Fallas detectadas:</span>
              <ul className="mt-1 space-y-0.5">
                {faultFlags.map((f) => (
                  <li key={f} className="capitalize">
                    {f === "short_circuit" && "⚡ Cortocircuito"}
                    {f === "open_circuit" && "🔓 Circuito abierto"}
                    {f === "floating_node" && "〰 Nodo flotante"}
                    {f === "power_exceeded" && "🔥 Exceso de potencia"}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span>No se detectaron fallas</span>
          )}
        </div>
      </div>

      {/* Stream / Result */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {isStreaming && streamText && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-blue-700">Analizando...</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{streamText}</p>
          </div>
        )}

        {diagnosisResult && !isStreaming && (
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                {diagnosisResult.fault_code}
              </span>
              <span
                className={`text-xs font-medium ${
                  diagnosisResult.confidence > 0.8
                    ? "text-emerald-600"
                    : diagnosisResult.confidence > 0.5
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {(diagnosisResult.confidence * 100).toFixed(0)}% confianza
              </span>
            </div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              {diagnosisResult.affected_component}
            </h4>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {diagnosisResult.explanation}
            </p>
            <div className="bg-slate-50 rounded p-2 border border-slate-100">
              <span className="text-xs font-medium text-slate-500">Accion correctiva:</span>
              <p className="text-sm text-slate-700 mt-0.5">{diagnosisResult.corrective_action}</p>
            </div>
          </div>
        )}

        {!diagnosisResult && !isStreaming && (
          <div className="text-center text-gray-400 py-8">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Simula el circuito y solicita un diagnostico
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Historial</h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="text-xs bg-gray-50 rounded p-2 border border-gray-100"
                >
                  <span className="font-medium text-gray-700">{h.fault_code}</span>
                  <span className="text-gray-400 mx-1">|</span>
                  <span className="text-gray-500">{h.affected_component}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 space-y-2">
        {hasFaults && (
          <button
            onClick={handleReDiagnose}
            disabled={isStreaming}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <RotateCcw size={14} />
            Diagnosticar fallas
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Preguntar al modelo..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAsk}
            disabled={isStreaming || (!simulationResult && !question.trim())}
            className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}