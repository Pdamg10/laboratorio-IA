import { COMPONENT_DEFINITIONS } from "@/types/circuit";
import { useCircuitStore } from "@/store/circuitStore";
import { Play, Trash2, MousePointer, Zap, Move } from "lucide-react";

interface Props {
  onSimulate: () => void;
  isSimulating: boolean;
}

export default function ComponentPalette({ onSimulate, isSimulating }: Props) {
  const toolMode = useCircuitStore((s) => s.toolMode);
  const setToolMode = useCircuitStore((s) => s.setToolMode);
  const clearCanvas = useCircuitStore((s) => s.clearCanvas);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("component/type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const tools = [
    { mode: "select" as const, label: "Seleccionar", icon: MousePointer },
    { mode: "wire" as const, label: "Cable", icon: Zap },
    { mode: "pan" as const, label: "Pan", icon: Move },
  ];

  return (
    <div className="w-16 bg-slate-900 flex flex-col items-center py-4 gap-3 select-none h-full">
      {/* Tool modes */}
      <div className="flex flex-col gap-1 mb-2">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.mode}
              onClick={() => setToolMode(t.mode)}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                toolMode === t.mode
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
              title={t.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <div className="w-10 h-px bg-slate-700" />

      {/* Components */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto py-2">
        {COMPONENT_DEFINITIONS.map((def) => (
          <div
            key={def.type}
            draggable
            onDragStart={(e) => handleDragStart(e, def.type)}
            className="w-10 h-10 rounded bg-slate-800 border border-slate-600 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-700 hover:border-slate-500 transition-all"
            title={`${def.label} (${def.defaultValue}${def.unit})`}
          >
            <span className="text-sm font-bold" style={{ color: def.color }}>
              {def.icon}
            </span>
          </div>
        ))}
      </div>

      <div className="w-10 h-px bg-slate-700" />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onSimulate}
          disabled={isSimulating}
          className="w-10 h-10 rounded bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Simular circuito"
        >
          <Play size={16} fill="white" />
        </button>
        <button
          onClick={clearCanvas}
          className="w-10 h-10 rounded bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
          title="Limpiar canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}