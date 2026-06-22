export interface CircuitNode {
  id: string;
  x: number;
  y: number;
  component: ComponentType;
  value: number;
  unit: string;
  rotation?: number;
}

export interface CircuitEdge {
  id: string;
  from: string;
  to: string;
  terminal_from: string;
  terminal_to: string;
}

export interface CircuitNetlist {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

export type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "vsource_dc"
  | "diode"
  | "bjt_npn"
  | "bjt_pnp";

export interface ComponentDef {
  type: ComponentType;
  label: string;
  icon: string;
  defaultValue: number;
  unit: string;
  terminals: string[];
  color: string;
}

export interface SimulationResult {
  node_voltages: Record<string, number>;
  branch_currents: Record<string, number>;
  operating_points: Record<string, Record<string, unknown>>;
  fault_flags: string[];
  convergence: boolean;
  iterations: number;
  power_dissipation: Record<string, number>;
}

export interface DiagnosisResult {
  fault_code: string;
  affected_component: string;
  explanation: string;
  corrective_action: string;
  confidence: number;
}

export interface DiagnosisStreamEvent {
  type: "token" | "heuristic" | "done" | "error";
  content?: string;
  data?: DiagnosisResult;
  message?: string;
}

export interface CircuitProject {
  id_proyecto: string;
  titulo: string;
  data_netlist_json: CircuitNetlist;
  estado_simulacion: number;
  created_at: string;
}

export interface Lab {
  id_laboratorio: string;
  titulo: string;
  descripcion?: string;
  dificultad: number;
  circuito_base_json: CircuitNetlist;
  objetivos: string[];
  completado: number;
}

export const COMPONENT_DEFINITIONS: ComponentDef[] = [
  { type: "resistor", label: "Resistor", icon: "R", defaultValue: 1000, unit: "ohm", terminals: ["positive", "negative"], color: "#8B7355" },
  { type: "capacitor", label: "Capacitor", icon: "C", defaultValue: 1e-6, unit: "F", terminals: ["positive", "negative"], color: "#4A90D9" },
  { type: "inductor", label: "Inductor", icon: "L", defaultValue: 1e-3, unit: "H", terminals: ["positive", "negative"], color: "#7B68EE" },
  { type: "vsource_dc", label: "Fuente DC", icon: "V", defaultValue: 5, unit: "V", terminals: ["positive", "negative"], color: "#E74C3C" },
  { type: "diode", label: "Diodo", icon: "D", defaultValue: 0, unit: "", terminals: ["positive", "negative"], color: "#27AE60" },
  { type: "bjt_npn", label: "BJT NPN", icon: "Q", defaultValue: 0, unit: "", terminals: ["collector", "base", "emitter"], color: "#F39C12" },
];

export interface PlacedComponent extends CircuitNode {
  selected?: boolean;
}

export interface Wire {
  id: string;
  fromNode: string;
  fromTerminal: string;
  toNode: string;
  toTerminal: string;
  points: { x: number; y: number }[];
}

export type ToolMode = "select" | "wire" | "pan";
export type ViewMode = "canvas" | "labs" | "results";