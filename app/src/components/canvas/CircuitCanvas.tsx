import { useRef, useState, useCallback, useEffect } from "react";
import { useCircuitStore } from "@/store/circuitStore";
import { COMPONENT_DEFINITIONS } from "@/types/circuit";
import type { CircuitNode } from "@/types/circuit";

interface Props {
  width: number;
  height: number;
}

const GRID_SIZE = 20;
const COMP_SIZE = 60;

export default function CircuitCanvas({ width, height }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wireStart, setWireStart] = useState<{
    nodeId: string;
    terminal: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<CircuitNode | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const {
    netlist,
    selectedNodeId,
    toolMode,
    zoom,
    pan,
    showGrid,
    selectNode,
    updateNode,
    addEdge,
    removeNode,
    setPan,
    setZoom,
    removeEdge,
    addNode,
  } = useCircuitStore();

  const snapToGrid = useCallback((v: number) => {
    return Math.round(v / GRID_SIZE) * GRID_SIZE;
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const getTerminalPos = useCallback(
    (node: CircuitNode, terminal: string) => {
      const def = COMPONENT_DEFINITIONS.find((d) => d.type === node.component);
      const isVertical = (node.rotation ?? 0) % 180 !== 0;
      const half = COMP_SIZE / 2;
      let dx = 0,
        dy = 0;

      if (def?.terminals.length === 3) {
        // BJT
        if (terminal === "collector") {
          dx = isVertical ? 0 : 0;
          dy = isVertical ? -half : -half;
        } else if (terminal === "base") {
          dx = isVertical ? -half : -half;
          dy = isVertical ? 0 : 0;
        } else if (terminal === "emitter") {
          dx = isVertical ? 0 : 0;
          dy = isVertical ? half : half;
        }
      } else {
        // 2-terminal
        if (terminal === "positive" || terminal === "anode") {
          dx = isVertical ? 0 : -half;
          dy = isVertical ? -half : 0;
        } else {
          dx = isVertical ? 0 : half;
          dy = isVertical ? half : 0;
        }
      }

      // Apply rotation
      const rad = ((node.rotation ?? 0) * Math.PI) / 180;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

      return { x: node.x + rx, y: node.y + ry };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId?: string) => {
      e.stopPropagation();
      const world = toWorld(e.clientX, e.clientY);

      if (toolMode === "pan" || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      if (toolMode === "wire" && nodeId) {
        const node = netlist.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const def = COMPONENT_DEFINITIONS.find((d) => d.type === node.component);
        const terminal = def?.terminals[0] ?? "positive";
        const tpos = getTerminalPos(node, terminal);
        setWireStart({ nodeId, terminal, x: tpos.x, y: tpos.y });
        return;
      }

      if (nodeId) {
        const node = netlist.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        setDraggingId(nodeId);
        setDragOffset({ x: world.x - node.x, y: world.y - node.y });
        selectNode(nodeId);
      } else {
        selectNode(null);
      }
    },
    [toolMode, toWorld, pan, netlist, selectNode, getTerminalPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const world = toWorld(e.clientX, e.clientY);
      setMousePos(world);

      if (panning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (draggingId) {
        const nx = snapToGrid(world.x - dragOffset.x);
        const ny = snapToGrid(world.y - dragOffset.y);
        updateNode(draggingId, { x: nx, y: ny });
      }
    },
    [toWorld, panning, panStart, setPan, draggingId, dragOffset, snapToGrid, updateNode]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (panning) {
        setPanning(false);
        return;
      }

      if (wireStart) {
        // Find if we dropped on another node terminal
        const world = toWorld(e.clientX, e.clientY);
        for (const node of netlist.nodes) {
          if (node.id === wireStart.nodeId) continue;
          const def = COMPONENT_DEFINITIONS.find((d) => d.type === node.component);
          for (const term of def?.terminals ?? []) {
            const tpos = getTerminalPos(node, term);
            const dist = Math.hypot(world.x - tpos.x, world.y - tpos.y);
            if (dist < 20) {
              addEdge({
                id: `e_${Date.now()}`,
                from: wireStart.nodeId,
                to: node.id,
                terminal_from: wireStart.terminal,
                terminal_to: term,
              });
              break;
            }
          }
        }
        setWireStart(null);
        return;
      }

      setDraggingId(null);
    },
    [panning, wireStart, toWorld, netlist, getTerminalPos, addEdge]
  );

  // Use native wheel event listener to strictly prevent browser scrolling
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentZoom = useCircuitStore.getState().zoom;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(Math.max(0.1, Math.min(3, currentZoom + delta)));
    };
    svg.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleNativeWheel);
  }, [setZoom]);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const compType = e.dataTransfer.getData("component/type");
      if (!compType) return;
      const world = toWorld(e.clientX, e.clientY);
      const def = COMPONENT_DEFINITIONS.find((d) => d.type === compType);
      if (!def) return;

      addNode({
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: snapToGrid(world.x),
        y: snapToGrid(world.y),
        component: compType as CircuitNode["component"],
        value: def.defaultValue,
        unit: def.unit,
      });
    },
    [toWorld, snapToGrid, addNode]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const openEdit = useCallback((node: CircuitNode) => {
    setEditingNode(node);
    setEditValue(String(node.value));
    setEditUnit(node.unit);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingNode) return;
    updateNode(editingNode.id, {
      value: parseFloat(editValue) || 0,
      unit: editUnit,
    });
    setEditingNode(null);
  }, [editingNode, editValue, editUnit, updateNode]);

  const rotateNode = useCallback(
    (nodeId: string) => {
      const node = netlist.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      updateNode(nodeId, { rotation: ((node.rotation ?? 0) + 90) % 360 });
    },
    [netlist, updateNode]
  );

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    const startX = Math.floor((-pan.x / zoom) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((-pan.y / zoom) / GRID_SIZE) * GRID_SIZE;
    const endX = startX + width / zoom + GRID_SIZE * 2;
    const endY = startY + height / zoom + GRID_SIZE * 2;

    for (let x = startX; x < endX; x += GRID_SIZE) {
      lines.push(
        <line
          key={`gx_${x}`}
          x1={x}
          y1={startY}
          x2={x}
          y2={endY}
          stroke="#e5e7eb"
          strokeWidth={0.5 / zoom}
        />
      );
    }
    for (let y = startY; y < endY; y += GRID_SIZE) {
      lines.push(
        <line
          key={`gy_${y}`}
          x1={startX}
          y1={y}
          x2={endX}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.5 / zoom}
        />
      );
    }
    return <g>{lines}</g>;
  };

  const renderComponent = (node: CircuitNode) => {
    const def = COMPONENT_DEFINITIONS.find((d) => d.type === node.component);
    const color = def?.color ?? "#666";
    const isSelected = selectedNodeId === node.id;
    const half = COMP_SIZE / 2;

    const renderSymbol = () => {
      const t = node.component;
      if (t === "resistor") {
        return (
          <g>
            <rect x={-20} y={-8} width={40} height={16} rx={2} fill={color} />
            <line x1={-half} y1={0} x2={-20} y2={0} stroke={color} strokeWidth={2} />
            <line x1={20} y1={0} x2={half} y2={0} stroke={color} strokeWidth={2} />
          </g>
        );
      }
      if (t === "capacitor") {
        return (
          <g>
            <line x1={-8} y1={-15} x2={-8} y2={15} stroke={color} strokeWidth={3} />
            <line x1={8} y1={-15} x2={8} y2={15} stroke={color} strokeWidth={3} />
            <line x1={-half} y1={0} x2={-8} y2={0} stroke={color} strokeWidth={2} />
            <line x1={8} y1={0} x2={half} y2={0} stroke={color} strokeWidth={2} />
          </g>
        );
      }
      if (t === "inductor") {
        return (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <ellipse
                key={i}
                cx={-12 + i * 8}
                cy={0}
                rx={4}
                ry={8}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
            ))}
            <line x1={-half} y1={0} x2={-20} y2={0} stroke={color} strokeWidth={2} />
            <line x1={20} y1={0} x2={half} y2={0} stroke={color} strokeWidth={2} />
          </g>
        );
      }
      if (t === "vsource_dc") {
        return (
          <g>
            <circle cx={0} cy={0} r={18} fill="white" stroke={color} strokeWidth={2} />
            <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight="bold">
              +
            </text>
            <text x={0} y={-8} textAnchor="middle" fill={color} fontSize={8}>
              DC
            </text>
            <line x1={-half} y1={0} x2={-18} y2={0} stroke={color} strokeWidth={2} />
            <line x1={18} y1={0} x2={half} y2={0} stroke={color} strokeWidth={2} />
          </g>
        );
      }
      if (t === "diode") {
        return (
          <g>
            <polygon points="-10,-12 -10,12 10,0" fill={color} />
            <line x1={10} y1={-12} x2={10} y2={12} stroke={color} strokeWidth={2} />
            <line x1={-half} y1={0} x2={-10} y2={0} stroke={color} strokeWidth={2} />
            <line x1={10} y1={0} x2={half} y2={0} stroke={color} strokeWidth={2} />
          </g>
        );
      }
      if (t === "bjt_npn") {
        return (
          <g>
            <line x1={0} y1={-25} x2={0} y2={-half} stroke={color} strokeWidth={2} />
            <line x1={-half} y1={0} x2={-15} y2={0} stroke={color} strokeWidth={2} />
            <line x1={0} y1={15} x2={0} y2={half} stroke={color} strokeWidth={2} />
            <line x1={-15} y1={-15} x2={-15} y2={15} stroke={color} strokeWidth={3} />
            <line x1={-15} y1={-8} x2={0} y2={-25} stroke={color} strokeWidth={2} />
            <line x1={-15} y1={8} x2={0} y2={25} stroke={color} strokeWidth={2} />
            <text x={-5} y={-28} textAnchor="middle" fill={color} fontSize={7}>
              C
            </text>
            <text x={-half + 5} y={-3} textAnchor="middle" fill={color} fontSize={7}>
              B
            </text>
            <text x={-5} y={35} textAnchor="middle" fill={color} fontSize={7}>
              E
            </text>
          </g>
        );
      }
      return (
        <rect
          x={-half + 10}
          y={-10}
          width={COMP_SIZE - 20}
          height={20}
          fill={color}
          rx={4}
        />
      );
    };

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y}) rotate(${node.rotation ?? 0})`}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onDoubleClick={() => openEdit(node)}
        style={{ cursor: draggingId === node.id ? "grabbing" : "grab" }}
      >
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={-half - 4}
            y={-half - 4}
            width={COMP_SIZE + 8}
            height={COMP_SIZE + 8}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            rx={4}
          />
        )}

        {renderSymbol()}

        {/* Value label */}
        <text
          x={0}
          y={half + 14}
          textAnchor="middle"
          fill="#374151"
          fontSize={10}
          fontFamily="monospace"
        >
          {node.value}
          {node.unit}
        </text>

        {/* Component type label */}
        <text
          x={0}
          y={-half - 6}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={9}
        >
          {node.id.slice(0, 6)}
        </text>

        {/* Terminal dots for wiring */}
        {def?.terminals.map((term) => {
          const tp = getTerminalPosLocal(term);
          return (
            <circle
              key={term}
              cx={tp.x - node.x}
              cy={tp.y - node.y}
              r={6}
              fill="#3b82f6"
              className="opacity-0 hover:opacity-100 transition-opacity"
              stroke="#2563eb"
              strokeWidth={1.5}
              style={{ pointerEvents: "all", cursor: "crosshair" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const tpos = getTerminalPos(node, term);
                setWireStart({ nodeId: node.id, terminal: term, x: tpos.x, y: tpos.y });
              }}
            />
          );
        })}
      </g>
    );
  };

  const getTerminalPosLocal = (term: string) => {
    // Simplified version for visual rendering
    const half = COMP_SIZE / 2;
    switch (term) {
      case "positive":
      case "anode":
        return { x: -half, y: 0 };
      case "negative":
      case "cathode":
        return { x: half, y: 0 };
      case "collector":
        return { x: 0, y: -half };
      case "emitter":
        return { x: 0, y: half };
      case "base":
        return { x: -half, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const renderWires = () => {
    return netlist.edges.map((edge) => {
      const fromNode = netlist.nodes.find((n) => n.id === edge.from);
      const toNode = netlist.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const fromPos = getTerminalPos(fromNode, edge.terminal_from);
      const toPos = getTerminalPos(toNode, edge.terminal_to);

      const mx = (fromPos.x + toPos.x) / 2;

      return (
        <g key={edge.id}>
          <polyline
            points={`${fromPos.x},${fromPos.y} ${mx},${fromPos.y} ${mx},${toPos.y} ${toPos.x},${toPos.y}`}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
            strokeLinejoin="round"
            onClick={() => removeEdge(edge.id)}
            style={{ cursor: "pointer" }}
          />
          {/* Junction dots */}
          <circle cx={fromPos.x} cy={fromPos.y} r={4} fill="#6b7280" />
          <circle cx={toPos.x} cy={toPos.y} r={4} fill="#6b7280" />
        </g>
      );
    });
  };

  const renderWirePreview = () => {
    if (!wireStart) return null;
    return (
      <line
        x1={wireStart.x}
        y1={wireStart.y}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeDasharray="5 3"
        opacity={0.7}
      />
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      }
      if (e.key === "r" && selectedNodeId) {
        rotateNode(selectedNodeId);
      }
      if (e.key === "Escape") {
        setWireStart(null);
        selectNode(null);
        setEditingNode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, removeNode, rotateNode, selectNode]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white"
        style={{ cursor: panning ? "grabbing" : (toolMode === "pan" ? "grab" : "default") }}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {renderGrid()}
          {renderWires()}
          {renderWirePreview()}
          {netlist.nodes.map(renderComponent)}
        </g>
      </svg>

      {/* Zoom/Pan info */}
      <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs text-gray-600 border">
        Zoom: {(zoom * 100).toFixed(0)}% | Pan: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})
      </div>

      {/* Edit modal */}
      {editingNode && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">
              Editar {editingNode.component}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unidad</label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={saveEdit}
                className="flex-1 bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingNode(null)}
                className="flex-1 bg-gray-200 text-gray-700 rounded py-2 text-sm hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}