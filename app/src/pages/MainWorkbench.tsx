import { useState, useRef, useEffect, useCallback } from "react";
import { useCircuit } from "@/hooks/useCircuit";
import { useDiagnosis } from "@/hooks/useDiagnosis";
import CircuitCanvas from "@/components/canvas/CircuitCanvas";
import ComponentPalette from "@/components/canvas/ComponentPalette";
import DiagnosisPanel from "@/components/diagnosis/DiagnosisPanel";
import FaultAlert from "@/components/diagnosis/FaultAlert";
import LabSelector from "@/components/labs/LabSelector";
import ResultViewer from "@/components/labs/ResultViewer";
import ProtoboardViewer from "@/components/canvas/ProtoboardViewer";
import { useCircuitStore } from "@/store/circuitStore";
import { useSessionStore } from "@/store/sessionStore";
import {
  Save,
  FolderOpen,
  FlaskConical,
  BarChart3,
  LogOut,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
} from "lucide-react";

type ViewMode = "canvas" | "labs" | "results";

export default function MainWorkbench() {
  const [viewMode, setViewMode] = useState<ViewMode>("canvas");
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showProtoboard, setShowProtoboard] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await fullScreenRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const {
    projectTitle,
    runSimulation,
    isSimulating,
    saveProject,
    zoom,
    setZoom,
    setPan,
    clearCanvas,
    netlist,
    setNetlist,
  } = useCircuit();

  const { requestDiagnosisStream } = useDiagnosis();
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const simulationResult = useCircuitStore((s) => s.simulationResult);

  // Resize canvas
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [viewMode]);

  const handleSimulate = useCallback(async () => {
    if (netlist.nodes.length === 0) return;
    const result = await runSimulation();
    if (result) {
      if (result.fault_flags.length > 0) {
        // Auto-trigger diagnosis for faults
        const circuitId = `circuit_${Date.now()}`;
        requestDiagnosisStream(circuitId, result, result.fault_flags);
      } else {
        setShowProtoboard(true);
      }
    }
  }, [netlist, runSimulation, requestDiagnosisStream]);

  const handleSave = async () => {
    if (!saveTitle.trim()) return;
    try {
      await saveProject(saveTitle.trim());
      setShowSaveDialog(false);
      setSaveTitle("");
    } catch {
      alert("Error guardando proyecto");
    }
  };

  const handleNewCircuit = () => {
    clearCanvas();
    setViewMode("canvas");
  };

  const loadCorrectExample = () => {
    setNetlist({
      nodes: [
        { id: "v1", x: 200, y: 200, component: "vsource_dc", value: 5, unit: "V" },
        { id: "r1", x: 400, y: 200, component: "resistor", value: 1000, unit: "ohm" }
      ],
      edges: [
        { id: "e1", from: "v1", to: "r1", terminal_from: "positive", terminal_to: "positive" },
        { id: "e2", from: "v1", to: "r1", terminal_from: "negative", terminal_to: "negative" }
      ]
    });
    setViewMode("canvas");
  };

  const loadFaultExample = () => {
    setNetlist({
      nodes: [
        { id: "v1", x: 200, y: 200, component: "vsource_dc", value: 5, unit: "V" }
      ],
      edges: [
        { id: "e1", from: "v1", to: "v1", terminal_from: "positive", terminal_to: "negative" }
      ]
    });
    setViewMode("canvas");
  };

  const loadSeriesExample = () => {
    setNetlist({
      nodes: [
        { id: "v1", x: 100, y: 200, component: "vsource_dc", value: 9, unit: "V" },
        { id: "r1", x: 250, y: 100, component: "resistor", value: 1000, unit: "ohm" },
        { id: "r2", x: 400, y: 200, component: "resistor", value: 2000, unit: "ohm" }
      ],
      edges: [
        { id: "e1", from: "v1", to: "r1", terminal_from: "positive", terminal_to: "positive" },
        { id: "e2", from: "r1", to: "r2", terminal_from: "negative", terminal_to: "positive" },
        { id: "e3", from: "r2", to: "v1", terminal_from: "negative", terminal_to: "negative" }
      ]
    });
    setViewMode("canvas");
  };

  const loadParallelExample = () => {
    setNetlist({
      nodes: [
        { id: "v1", x: 100, y: 200, component: "vsource_dc", value: 5, unit: "V" },
        { id: "r1", x: 300, y: 150, component: "resistor", value: 1000, unit: "ohm" },
        { id: "r2", x: 300, y: 250, component: "resistor", value: 1000, unit: "ohm" }
      ],
      edges: [
        { id: "e1", from: "v1", to: "r1", terminal_from: "positive", terminal_to: "positive" },
        { id: "e2", from: "v1", to: "r2", terminal_from: "positive", terminal_to: "positive" },
        { id: "e3", from: "r1", to: "v1", terminal_from: "negative", terminal_to: "negative" },
        { id: "e4", from: "r2", to: "v1", terminal_from: "negative", terminal_to: "negative" }
      ]
    });
    setViewMode("canvas");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="h-12 bg-slate-800 text-white flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <FlaskConical size={16} />
          </div>
          <span className="font-semibold text-sm">LabVirtual</span>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        {/* Project actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewCircuit}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-slate-700 transition-colors"
            title="Nuevo circuito"
          >
            <Plus size={14} />
            Nuevo
          </button>
          
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-slate-700 transition-colors">
              Ejemplos
            </button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-md shadow-lg min-w-[150px] z-50">
              <button 
                onClick={loadCorrectExample}
                className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                Circuito Correcto Básico
              </button>
              <button 
                onClick={loadSeriesExample}
                className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                Circuito Serie (2 Resistencias)
              </button>
              <button 
                onClick={loadParallelExample}
                className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                Circuito Paralelo (2 Resistencias)
              </button>
              <button 
                onClick={loadFaultExample}
                className="block w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700 hover:text-red-300 border-t border-slate-700"
              >
                Cortocircuito (Prueba Falla)
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-slate-700 transition-colors"
            title="Guardar"
          >
            <Save size={14} />
            Guardar
          </button>
          <button
            onClick={() => setViewMode("labs")}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-slate-700 transition-colors"
            title="Laboratorios"
          >
            <FolderOpen size={14} />
            Labs
          </button>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        {/* View actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1 px-4 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isSimulating ? (
              <RotateCcw size={14} className="animate-spin" />
            ) : (
              <FlaskConical size={14} />
            )}
            Simular
          </button>
          <button
            onClick={() => setViewMode("results")}
            disabled={!simulationResult}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <BarChart3 size={14} />
            Resultados
          </button>
        </div>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 truncate max-w-xs">{projectTitle}</span>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">{user.nombre}</span>
              <button
                onClick={logout}
                className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                title="Cerrar sesion"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "canvas" && (
          <div ref={fullScreenRef} className="flex-1 flex bg-slate-50 overflow-hidden w-full h-full">
            <ComponentPalette onSimulate={handleSimulate} isSimulating={isSimulating} />
            <div className="flex-1 relative" ref={canvasContainerRef}>
              <CircuitCanvas width={canvasSize.width} height={canvasSize.height} />
              <FaultAlert />

              {/* Floating zoom controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                <button
                  onClick={() => setZoom(zoom + 0.2)}
                  className="w-8 h-8 bg-white rounded shadow border flex items-center justify-center hover:bg-gray-50"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setZoom(zoom - 0.2)}
                  className="w-8 h-8 bg-white rounded shadow border flex items-center justify-center hover:bg-gray-50"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="w-8 h-8 bg-white rounded shadow border flex items-center justify-center hover:bg-gray-50 text-xs font-medium"
                  title="Resetear vista"
                >
                  1:1
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 bg-white rounded shadow border flex items-center justify-center hover:bg-gray-50 text-xs font-medium"
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
            <DiagnosisPanel />
          </div>
        )}

        {viewMode === "labs" && <LabSelector onBack={() => setViewMode("canvas")} />}
        {viewMode === "results" && <ResultViewer onBack={() => setViewMode("canvas")} />}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Guardar Proyecto</h3>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Nombre del proyecto"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Protoboard Dialog */}
      {showProtoboard && (
        <ProtoboardViewer netlist={netlist} onClose={() => setShowProtoboard(false)} />
      )}
    </div>
  );
}