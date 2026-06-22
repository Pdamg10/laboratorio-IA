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
    func: "Limita o regula el flujo de corriente eléctrica y ajusta niveles de voltaje en el circuito." 
  },
  capacitor: { 
    title: "Capacitor (Condensador)", 
    desc: "Dispositivo pasivo que almacena energía en un campo eléctrico.", 
    func: "Se utiliza para filtrar señales, estabilizar fuentes de poder y acoplar señales." 
  },
  inductor: { 
    title: "Inductor (Bobina)", 
    desc: "Almacena energía en forma de campo magnético cuando circula corriente.", 
    func: "Filtra corrientes, bloquea cambios bruscos y permite el paso de DC." 
  },
  vsource_dc: { 
    title: "Fuente de Voltaje DC", 
    desc: "Suministra energía eléctrica constante (corriente continua).", 
    func: "Proporciona la potencia necesaria para que los demás componentes funcionen." 
  },
  diode: { 
    title: "Diodo", 
    desc: "Semiconductor de dos terminales que permite el flujo de corriente en un solo sentido.", 
    func: "Rectifica corriente, protege contra polaridad inversa y regula voltaje." 
  },
  bjt_npn: { 
    title: "Transistor BJT NPN", 
    desc: "Dispositivo semiconductor impulsado por corriente con 3 terminales.", 
    func: "Funciona como interruptor electrónico o como amplificador de señal." 
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
  // Parse netlist to find nets (electrical nodes)
  const { nodeToNet, sourceComp } = useMemo(() => {
    const uf = new UnionFind();
    const terminalKeys: string[] = [];

    // All terminals
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

    let gndRoot = "";
    let vccRoot = "";
    const sourceComp = netlist.nodes.find((n) => n.component === "vsource_dc");

    if (sourceComp) {
      const gndTk = `${sourceComp.id}:negative`;
      const vccTk = `${sourceComp.id}:positive`;
      if (uf.parent[gndTk]) gndRoot = uf.find(gndTk);
      if (uf.parent[vccTk]) vccRoot = uf.find(vccTk);
    }

    const nMap: Record<string, string> = {};
    let rowId = 1;
    
    Object.keys(groups).forEach((root) => {
      let netId = `row_${rowId}`;
      if (root === gndRoot) netId = "GND";
      else if (root === vccRoot) netId = "VCC";
      else rowId++;

      groups[root].forEach((tk) => {
        nMap[tk] = netId;
      });
    });

    // Components that just have 1 pin, handle unconnected safely
    netlist.nodes.forEach(n => {
      const def = COMPONENT_DEFINITIONS.find(d => d.type === n.component);
      def?.terminals.forEach(t => {
        const tk = `${n.id}:${t}`;
        if (!nMap[tk]) nMap[tk] = "UNCONNECTED";
      });
    });

    return { nets: groups, nodeToNet: nMap, sourceComp };
  }, [netlist]);

  // Layout constants
  const PITCH = 15;
  const START_X = 90;
  const COL_A_Y = 100;
  const COL_F_Y = 220;
  const RAIL_Y_TOP = 40;
  const RAIL_Y_BOT = 350;

  // We assign a free row to each named row_X
  const rowAssigns: Record<string, number> = {};
  let currentRow = 2;
  Object.values(nodeToNet).forEach(net => {
    if (net.startsWith("row_") && !(net in rowAssigns)) {
      rowAssigns[net] = currentRow;
      currentRow += 4; // space components out
    }
  });

  const getPinPos = (compId: string, term: string, isTopCol: boolean) => {
    const net = nodeToNet[`${compId}:${term}`];
    if (net === "GND") return { x: START_X + 2 * PITCH, y: RAIL_Y_BOT + PITCH };
    if (net === "VCC") return { x: START_X + 2 * PITCH, y: RAIL_Y_TOP };
    if (net === "UNCONNECTED") return { x: 10, y: 10 };
    
    const row = rowAssigns[net] || 1;
    const x = START_X + row * PITCH;
    const y = isTopCol ? COL_A_Y + 2 * PITCH : COL_F_Y + 2 * PITCH;
    return { x, y };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Visualizador de Protoboard</h2>
            <p className="text-sm text-slate-400">Guía de ensamble físico para tu circuito validado.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* SVG Panel */}
          <div className="p-6 bg-slate-900 flex-1 flex justify-center items-center overflow-auto">
            <svg width="800" height="400" viewBox="0 0 800 400" className="drop-shadow-xl">
              {/* Protoboard Base */}
            <rect x="70" y="20" width="710" height="360" rx="10" fill="#f8f9fa" stroke="#e9ecef" strokeWidth="2" />
            
            {/* Rails */}
            <rect x="90" y="35" width="670" height="2" fill="#ef4444" opacity="0.8" />
            <rect x="90" y="65" width="670" height="2" fill="#3b82f6" opacity="0.8" />
            <rect x="90" y="335" width="670" height="2" fill="#ef4444" opacity="0.8" />
            <rect x="90" y="365" width="670" height="2" fill="#3b82f6" opacity="0.8" />

            {/* Holes */}
            {Array.from({ length: 45 }).map((_, cIdx) => (
              <React.Fragment key={`col-${cIdx}`}>
                {/* Top power rail holes */}
                <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_TOP} r="3" fill="#333" />
                <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_TOP + PITCH} r="3" fill="#333" />
                
                {/* Top rows A-E */}
                {Array.from({ length: 5 }).map((_, rIdx) => (
                  <circle key={`t-${cIdx}-${rIdx}`} cx={START_X + cIdx * PITCH} cy={COL_A_Y + rIdx * PITCH} r="3" fill="#333" />
                ))}

                {/* Bottom rows F-J */}
                {Array.from({ length: 5 }).map((_, rIdx) => (
                  <circle key={`b-${cIdx}-${rIdx}`} cx={START_X + cIdx * PITCH} cy={COL_F_Y + rIdx * PITCH} r="3" fill="#333" />
                ))}

                {/* Bottom power rail holes */}
                <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_BOT} r="3" fill="#333" />
                <circle cx={START_X + cIdx * PITCH} cy={RAIL_Y_BOT + PITCH} r="3" fill="#333" />
              </React.Fragment>
            ))}

            {/* Center divider */}
            <rect x="80" y="185" width="690" height="20" fill="#e2e8f0" />

            {/* Draw Components */}
            {netlist.nodes.filter(n => n.component !== "vsource_dc").map((n, i) => {
              const def = COMPONENT_DEFINITIONS.find(d => d.type === n.component);
              if (!def || def.terminals.length < 2) return null;
              
              const p1 = getPinPos(n.id, def.terminals[0], true);
              const p2 = getPinPos(n.id, def.terminals[1], false);

              const color = def.color;
              
              return (
                <g key={n.id} className="animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                  {/* Legs */}
                  <line x1={p1.x} y1={p1.y} x2={(p1.x + p2.x)/2} y2={(p1.y + p2.y)/2} stroke="#94a3b8" strokeWidth="3" />
                  <line x1={p2.x} y1={p2.y} x2={(p1.x + p2.x)/2} y2={(p1.y + p2.y)/2} stroke="#94a3b8" strokeWidth="3" />

                  {/* Body */}
                  {n.component === "resistor" && (
                    <rect x={(p1.x + p2.x)/2 - 8} y={(p1.y + p2.y)/2 - 20} width="16" height="40" rx="4" fill={color} stroke="#000" strokeWidth="1" transform={`rotate(${Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI + 90} ${(p1.x + p2.x)/2} ${(p1.y + p2.y)/2})`} />
                  )}
                  {n.component === "capacitor" && (
                    <circle cx={(p1.x + p2.x)/2} cy={(p1.y + p2.y)/2} r="12" fill={color} stroke="#000" strokeWidth="1" />
                  )}
                  {n.component === "diode" && (
                    <rect x={(p1.x + p2.x)/2 - 6} y={(p1.y + p2.y)/2 - 12} width="12" height="24" rx="2" fill="#27272a" stroke="#000" strokeWidth="1" />
                  )}
                  {/* Label */}
                  <text x={(p1.x + p2.x)/2 + 15} y={(p1.y + p2.y)/2 + 5} fill="#1e293b" fontSize="12" fontWeight="bold">
                    {def.icon}
                  </text>
                </g>
              );
            })}

            {/* Power source wires */}
            {sourceComp && (
              <g className="animate-in fade-in duration-700">
                {/* Power supply module */}
                <g transform="translate(10, 150)">
                  {/* Module body */}
                  <rect x="0" y="0" width="50" height="110" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  {/* Matching Icon from sidebar */}
                  <rect x="15" y="6" width="20" height="20" rx="4" fill="#E74C3C" />
                  <text x="25" y="20" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">V</text>
                  {/* Screen */}
                  <rect x="5" y="32" width="40" height="20" rx="2" fill="#0f172a" />
                  <text x="25" y="46" fill="#10b981" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">5.0V</text>
                  {/* Terminals */}
                  <circle cx="25" cy="68" r="5" fill="#ef4444" />
                  <circle cx="25" cy="88" r="5" fill="#3b82f6" />
                  <text x="25" y="103" fill="#64748b" fontSize="8" textAnchor="middle" fontWeight="bold">DC OUT</text>
                </g>
                
                {/* Wires from the module to the rails */}
                {/* VCC wire (red) from (35, 205) to rail */}
                <path d={`M 35 205 C 60 205 60 ${RAIL_Y_TOP} ${START_X + 2*PITCH} ${RAIL_Y_TOP}`} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                {/* GND wire (blue) from (35, 225) to rail */}
                <path d={`M 35 225 C 60 225 60 ${RAIL_Y_BOT + PITCH} ${START_X + 2*PITCH} ${RAIL_Y_BOT + PITCH}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            </svg>
          </div>
          
          {/* Sidebar */}
          <div className="w-80 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto shrink-0 flex flex-col gap-4">
             <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Componentes en Uso</h3>
             {Array.from(new Set(netlist.nodes.map(n => n.component))).map(compType => {
               const info = COMP_INFO[compType];
               const def = COMPONENT_DEFINITIONS.find(d => d.type === compType);
               if (!info || !def) return null;
               return (
                 <div key={compType} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-8 h-8 rounded shadow flex items-center justify-center font-bold text-sm" style={{backgroundColor: def.color, color: '#fff'}}>{def.icon}</div>
                       <h4 className="text-white font-semibold text-sm leading-tight">{info.title}</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-slate-100">¿Qué es?</strong><br/>{info.desc}</p>
                      <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-slate-100">¿Qué hace aquí?</strong><br/>{info.func}</p>
                    </div>
                 </div>
               )
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
