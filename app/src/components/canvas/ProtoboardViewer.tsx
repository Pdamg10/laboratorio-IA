import React, { useMemo } from "react";
import type { CircuitNetlist } from "@/types/circuit";
import { COMPONENT_DEFINITIONS } from "@/types/circuit";
import { X } from "lucide-react";

interface ProtoboardViewerProps {
  netlist: CircuitNetlist;
  onClose: () => void;
}

const COMP_INFO: Record<string, { title: string; desc: string; func: string }> = {
  resistor: {
    title: "Resistor (Resistencia)",
    desc: "Componente pasivo que introduce resistencia eléctrica entre dos puntos.",
    func: "Limita o regula el flujo de corriente eléctrica y ajusta niveles de voltaje en el circuito.",
  },
  capacitor: {
    title: "Capacitor (Condensador)",
    desc: "Dispositivo pasivo que almacena energía en un campo eléctrico.",
    func: "Se utiliza para filtrar señales, estabilizar fuentes de poder y acoplar señales.",
  },
  inductor: {
    title: "Inductor (Bobina)",
    desc: "Almacena energía en forma de campo magnético cuando circula corriente.",
    func: "Filtra corrientes, bloquea cambios bruscos y permite el paso de DC.",
  },
  vsource_dc: {
    title: "Fuente de Voltaje DC",
    desc: "Suministra energía eléctrica constante (corriente continua).",
    func: "Proporciona la potencia necesaria para que los demás componentes funcionen.",
  },
  diode: {
    title: "Diodo",
    desc: "Semiconductor de dos terminales que permite el flujo de corriente en un solo sentido.",
    func: "Rectifica corriente, protege contra polaridad inversa y regula voltaje.",
  },
  bjt_npn: {
    title: "Transistor BJT NPN",
    desc: "Dispositivo semiconductor impulsado por corriente con 3 terminales.",
    func: "Funciona como interruptor electrónico o como amplificador de señal.",
  },
};

class UnionFind {
  parent: Record<string, string> = {};

  find(x: string): string {
    if (!this.parent[x]) this.parent[x] = x;
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: string, y: string) {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx !== ry) {
      this.parent[rx] = ry;
    }
  }
}

export default function ProtoboardViewer({ netlist, onClose }: ProtoboardViewerProps) {
  const { nodeToNet, sourceComp } = useMemo(() => {
    const uf = new UnionFind();
    const terminalKeys: string[] = [];

    netlist.edges.forEach((edge) => {
      const k1 = `${edge.from}:${edge.terminal_from}`;
      const k2 = `${edge.to}:${edge.terminal_to}`;
      terminalKeys.push(k1, k2);
      uf.union(k1, k2);
    });

    const groups: Record<string, string[]> = {};
    terminalKeys.forEach((tk) => {
      const root = uf.find(tk);
      if (!groups[root]) groups[root] = [];
      groups[root].push(tk);
    });

    const sourceComp = netlist.nodes.find((n) => n.component === "vsource_dc");

    let gndRoot = "";
    let vccRoot = "";
    if (sourceComp) {
      // Try all terminal name combinations for source polarity
      const tryFind = (id: string, ...terms: string[]) => {
        for (const t of terms) {
          const k = `${id}:${t}`;
          if (uf.parent[k]) return uf.find(k);
        }
        return "";
      };
      gndRoot = tryFind(sourceComp.id, "n", "negative", "gnd", "-");
      vccRoot = tryFind(sourceComp.id, "p", "positive", "+", "vcc");
    }

    const nMap: Record<string, string> = {};
    let rowId = 1;
    Object.keys(groups).forEach((root) => {
      let netId = `row_${rowId}`;
      if (gndRoot && root === gndRoot) netId = "GND";
      else if (vccRoot && root === vccRoot) netId = "VCC";
      else rowId++;

      groups[root].forEach((tk) => {
        nMap[tk] = netId;
      });
    });

    netlist.nodes.forEach((n) => {
      const def = COMPONENT_DEFINITIONS.find((d) => d.type === n.component);
      def?.terminals.forEach((t) => {
        const tk = `${n.id}:${t}`;
        if (!nMap[tk]) nMap[tk] = "UNCONNECTED";
      });
    });

    return { nodeToNet: nMap, sourceComp };
  }, [netlist]);

  // Layout constants
  const PITCH = 15;
  const START_X = 90;
  const COL_A_Y = 105;   // Top half rows A-E
  const COL_F_Y = 225;   // Bottom half rows F-J
  const RAIL_Y_TOP = 42;
  const RAIL_Y_BOT = 345;

  // Assign a unique COLUMN to each non-power component, placed side-by-side (parallel)
  const compColumnMap: Record<string, number> = {};
  {
    const passiveNodes = netlist.nodes.filter((n) => n.component !== "vsource_dc");
    passiveNodes.forEach((n, i) => {
      // Each component gets its own column, spaced 5 columns apart
      compColumnMap[n.id] = i * 5 + 2;
    });
  }

  // Given a component node and its terminal, return the SVG coordinate on the protoboard
  const getPinPos = (compId: string, term: string) => {
    const net = nodeToNet[`${compId}:${term}`];
    const col = compColumnMap[compId] ?? 0;
    const x = START_X + col * PITCH;

    if (net === "GND") return { x, y: RAIL_Y_BOT + 12 };
    if (net === "VCC") return { x, y: RAIL_Y_TOP };
    if (net === "UNCONNECTED") return { x, y: COL_A_Y };

    // Detect if this terminal connects to a power net on the other side via another component
    // Pin 1 → top half, Pin 2 → bottom half
    const termIdx = term === "1" || term === "positive" || term === "p" || term === "anode" ? 0 : 1;
    return { x, y: termIdx === 0 ? COL_A_Y + 30 : COL_F_Y + 30 };
  };

  const passiveNodes = netlist.nodes.filter((n) => n.component !== "vsource_dc");

  return (
    // Overlay: centers modal, backdrop click closes
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal container — max height so it never exceeds viewport */}
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-700 flex flex-col"
           style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header — always visible */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shrink-0 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Visualizador de Protoboard</h2>
            <p className="text-sm text-slate-400">Guía de ensamble físico para tu circuito validado.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable if needed */}
        <div className="flex flex-1 overflow-hidden">
          {/* SVG Panel */}
          <div className="p-4 bg-slate-900 flex-1 flex justify-center items-start overflow-auto">
            <svg width="680" height="400" viewBox="0 0 680 400" className="drop-shadow-xl shrink-0">
              {/* Protoboard Base */}
              <rect x="60" y="18" width="600" height="365" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />

              {/* Rails labels */}
              <text x="64" y="40" fill="#ef4444" fontSize="9" fontWeight="bold">+</text>
              <text x="64" y="60" fill="#3b82f6" fontSize="9" fontWeight="bold">−</text>
              <text x="64" y="352" fill="#ef4444" fontSize="9" fontWeight="bold">+</text>
              <text x="64" y="372" fill="#3b82f6" fontSize="9" fontWeight="bold">−</text>

              {/* Power rail lines */}
              <rect x="75" y={RAIL_Y_TOP - 4} width="570" height="2" fill="#ef4444" opacity="0.7" />
              <rect x="75" y={RAIL_Y_TOP + 12} width="570" height="2" fill="#3b82f6" opacity="0.7" />
              <rect x="75" y={RAIL_Y_BOT - 4} width="570" height="2" fill="#ef4444" opacity="0.7" />
              <rect x="75" y={RAIL_Y_BOT + 12} width="570" height="2" fill="#3b82f6" opacity="0.7" />

              {/* Holes */}
              {Array.from({ length: 40 }).map((_, cIdx) => (
                <React.Fragment key={`col-${cIdx}`}>
                  <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_TOP} r="2.5" fill="#475569" />
                  <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_TOP + 15} r="2.5" fill="#475569" />
                  {Array.from({ length: 5 }).map((_, rIdx) => (
                    <circle key={`t-${cIdx}-${rIdx}`} cx={START_X + cIdx * PITCH} cy={COL_A_Y + rIdx * PITCH} r="2.5" fill="#475569" />
                  ))}
                  {Array.from({ length: 5 }).map((_, rIdx) => (
                    <circle key={`b-${cIdx}-${rIdx}`} cx={START_X + cIdx * PITCH} cy={COL_F_Y + rIdx * PITCH} r="2.5" fill="#475569" />
                  ))}
                  <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_BOT} r="2.5" fill="#475569" />
                  <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_BOT + 15} r="2.5" fill="#475569" />
                </React.Fragment>
              ))}

              {/* Center divider */}
              <rect x="70" y="193" width="590" height="18" fill="#e2e8f0" rx="2" />
              <text x="655" y="204" fill="#94a3b8" fontSize="8" textAnchor="end">DIP</text>

              {/* Column numbers */}
              {Array.from({ length: 10 }).map((_, i) => (
                <text key={`lbl-${i}`} x={START_X + i * 5 * PITCH} y="89" fill="#94a3b8" fontSize="8" textAnchor="middle">
                  {i * 5 + 1}
                </text>
              ))}

              {/* Draw passive components — each in its own column (parallel) */}
              {passiveNodes.map((n, i) => {
                const def = COMPONENT_DEFINITIONS.find((d) => d.type === n.component);
                if (!def || def.terminals.length < 2) return null;

                const t0 = def.terminals[0];
                const t1 = def.terminals[1];
                const p1 = getPinPos(n.id, t0);
                const p2 = getPinPos(n.id, t1);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={n.id} className="animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    {/* Leg top */}
                    <line x1={p1.x} y1={p1.y} x2={midX} y2={midY - 12} stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Leg bottom */}
                    <line x1={p2.x} y1={p2.y} x2={midX} y2={midY + 12} stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Body */}
                    {n.component === "resistor" && (
                      <rect x={midX - 6} y={midY - 20} width="12" height="40" rx="3" fill={def.color} stroke="#000" strokeWidth="1.2" />
                    )}
                    {n.component === "capacitor" && (
                      <ellipse cx={midX} cy={midY} rx="8" ry="12" fill={def.color} stroke="#000" strokeWidth="1.2" />
                    )}
                    {n.component === "diode" && (
                      <>
                        <rect x={midX - 5} y={midY - 14} width="10" height="28" rx="2" fill="#27272a" stroke="#000" strokeWidth="1.2" />
                        {/* Cathode stripe */}
                        <rect x={midX - 5} y={midY - 14} width="10" height="5" rx="1" fill="#e2e8f0" />
                      </>
                    )}
                    {(n.component !== "resistor" && n.component !== "capacitor" && n.component !== "diode") && (
                      <rect x={midX - 7} y={midY - 15} width="14" height="30" rx="3" fill={def.color} stroke="#000" strokeWidth="1.2" />
                    )}

                    {/* Label */}
                    <text x={midX} y={midY + 30} fill="#1e293b" fontSize="10" fontWeight="bold" textAnchor="middle">
                      {def.icon}
                    </text>
                  </g>
                );
              })}

              {/* Power source (left side module) */}
              {sourceComp && (
                <g>
                  <rect x="5" y="148" width="48" height="110" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  <rect x="14" y="154" width="20" height="20" rx="4" fill="#E74C3C" />
                  <text x="24" y="168" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">V</text>
                  <rect x="9" y="180" width="36" height="18" rx="2" fill="#0f172a" />
                  <text x="27" y="193" fill="#10b981" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    {sourceComp.value ? `${sourceComp.value}V` : "5V"}
                  </text>
                  <circle cx="24" cy="212" r="5" fill="#ef4444" />
                  <circle cx="24" cy="230" r="5" fill="#3b82f6" />
                  <text x="24" y="248" fill="#64748b" fontSize="7" textAnchor="middle" fontWeight="bold">DC OUT</text>

                  {/* VCC wire: red → top rail */}
                  <path d={`M 29 207 C 55 207 55 ${RAIL_Y_TOP} ${START_X} ${RAIL_Y_TOP}`}
                    fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                  {/* GND wire: blue → bottom rail */}
                  <path d={`M 29 235 C 55 235 55 ${RAIL_Y_BOT + 15} ${START_X} ${RAIL_Y_BOT + 15}`}
                    fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Jumper wires: each component's top pin to VCC rail, bottom pin to GND rail */}
                  {passiveNodes.map((n) => {
                    const def = COMPONENT_DEFINITIONS.find((d) => d.type === n.component);
                    if (!def || def.terminals.length < 2) return null;
                    const p1 = getPinPos(n.id, def.terminals[0]);
                    const p2 = getPinPos(n.id, def.terminals[1]);
                    return (
                      <g key={`wire-${n.id}`}>
                        {/* Top pin to VCC */}
                        <line x1={p1.x} y1={p1.y} x2={p1.x} y2={RAIL_Y_TOP + 2} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                        {/* Bottom pin to GND */}
                        <line x1={p2.x} y1={p2.y} x2={p2.x} y2={RAIL_Y_BOT - 2} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Sidebar — scrollable when many components */}
          <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0">
            <div className="px-5 py-3 border-b border-slate-700 shrink-0">
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider">Componentes en Uso</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {Array.from(new Set(netlist.nodes.map((n) => n.component))).map((compType) => {
                const info = COMP_INFO[compType];
                const def = COMPONENT_DEFINITIONS.find((d) => d.type === compType);
                if (!info || !def) return null;
                return (
                  <div key={compType} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-sm shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded shadow flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ backgroundColor: def.color, color: "#fff" }}
                      >
                        {def.icon}
                      </div>
                      <h4 className="text-white font-semibold text-sm leading-tight">{info.title}</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-100">¿Qué es?</strong>
                        <br />
                        {info.desc}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-100">¿Qué hace aquí?</strong>
                        <br />
                        {info.func}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
