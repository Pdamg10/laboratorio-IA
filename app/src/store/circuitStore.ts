import { create } from "zustand";
import type {
  CircuitNetlist,
  CircuitNode,
  CircuitEdge,
  SimulationResult,
  ToolMode,
} from "@/types/circuit";

interface CircuitState {
  // Netlist
  netlist: CircuitNetlist;
  selectedNodeId: string | null;
  toolMode: ToolMode;

  // Canvas
  zoom: number;
  pan: { x: number; y: number };
  gridSize: number;
  showGrid: boolean;

  // Simulation
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  faultFlags: string[];

  // Actions
  addNode: (node: CircuitNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<CircuitNode>) => void;
  selectNode: (id: string | null) => void;
  addEdge: (edge: CircuitEdge) => void;
  removeEdge: (id: string) => void;
  setToolMode: (mode: ToolMode) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setNetlist: (netlist: CircuitNetlist) => void;
  clearCanvas: () => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setIsSimulating: (v: boolean) => void;
  setFaultFlags: (flags: string[]) => void;
  getNodeById: (id: string) => CircuitNode | undefined;
  loadFromProject: (netlist: CircuitNetlist, title: string) => void;
  projectTitle: string;
  setProjectTitle: (t: string) => void;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  netlist: { nodes: [], edges: [] },
  selectedNodeId: null,
  toolMode: "select",
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridSize: 20,
  showGrid: true,
  simulationResult: null,
  isSimulating: false,
  faultFlags: [],
  projectTitle: "Circuito sin titulo",

  addNode: (node) =>
    set((s) => ({
      netlist: { ...s.netlist, nodes: [...s.netlist.nodes, node] },
    })),

  removeNode: (id) =>
    set((s) => ({
      netlist: {
        nodes: s.netlist.nodes.filter((n) => n.id !== id),
        edges: s.netlist.edges.filter((e) => e.from !== id && e.to !== id),
      },
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  updateNode: (id, updates) =>
    set((s) => ({
      netlist: {
        ...s.netlist,
        nodes: s.netlist.nodes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        ),
      },
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  addEdge: (edge) =>
    set((s) => ({
      netlist: { ...s.netlist, edges: [...s.netlist.edges, edge] },
    })),

  removeEdge: (id) =>
    set((s) => ({
      netlist: {
        ...s.netlist,
        edges: s.netlist.edges.filter((e) => e.id !== id),
      },
    })),

  setToolMode: (mode) => set({ toolMode: mode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(3, zoom)) }),
  setPan: (pan) => set({ pan }),
  setNetlist: (netlist) => set({ netlist }),
  clearCanvas: () =>
    set({
      netlist: { nodes: [], edges: [] },
      selectedNodeId: null,
      simulationResult: null,
      faultFlags: [],
      projectTitle: "Circuito sin titulo",
    }),

  setSimulationResult: (result) =>
    set({
      simulationResult: result,
      faultFlags: result?.fault_flags ?? [],
    }),

  setIsSimulating: (v) => set({ isSimulating: v }),
  setFaultFlags: (flags) => set({ faultFlags: flags }),

  getNodeById: (id) => get().netlist.nodes.find((n) => n.id === id),

  loadFromProject: (netlist, title) =>
    set({
      netlist,
      projectTitle: title,
      selectedNodeId: null,
      simulationResult: null,
      faultFlags: [],
    }),

  setProjectTitle: (t) => set({ projectTitle: t }),
}));