import { useCallback } from "react";
import { useCircuitStore } from "@/store/circuitStore";
import { circuitsApi } from "@/api/endpoints";
import type { CircuitNetlist, CircuitNode, CircuitEdge, SimulationResult } from "@/types/circuit";

let nodeCounter = 0;
let edgeCounter = 0;

export function useCircuit() {
  const store = useCircuitStore();

  const generateNodeId = useCallback(() => {
    nodeCounter++;
    return `n${Date.now()}_${nodeCounter}`;
  }, []);

  const generateEdgeId = useCallback(() => {
    edgeCounter++;
    return `e${Date.now()}_${edgeCounter}`;
  }, []);

  const addComponent = useCallback(
    (type: string, x: number, y: number, value?: number, unit?: string) => {
      const id = generateNodeId();
      const defaults: Record<string, { value: number; unit: string }> = {
        resistor: { value: 1000, unit: "ohm" },
        capacitor: { value: 1e-6, unit: "F" },
        inductor: { value: 1e-3, unit: "H" },
        vsource_dc: { value: 5, unit: "V" },
        diode: { value: 0, unit: "" },
        bjt_npn: { value: 0, unit: "" },
      };
      const def = defaults[type] ?? { value: 0, unit: "" };
      const node: CircuitNode = {
        id,
        x,
        y,
        component: type as CircuitNode["component"],
        value: value ?? def.value,
        unit: unit ?? def.unit,
      };
      store.addNode(node);
      return id;
    },
    [generateNodeId, store]
  );

  const connectComponents = useCallback(
    (fromId: string, toId: string, termFrom = "negative", termTo = "positive") => {
      const edge: CircuitEdge = {
        id: generateEdgeId(),
        from: fromId,
        to: toId,
        terminal_from: termFrom,
        terminal_to: termTo,
      };
      store.addEdge(edge);
      return edge.id;
    },
    [generateEdgeId, store]
  );

  const runSimulation = useCallback(async () => {
    const { netlist } = useCircuitStore.getState();
    if (netlist.nodes.length === 0) return null;

    store.setIsSimulating(true);
    try {
      const circuitId = `circuit_${Date.now()}`;
      const res = await circuitsApi.simulate(circuitId, netlist);
      const result: SimulationResult = {
        node_voltages: res.data.node_voltages,
        branch_currents: res.data.branch_currents,
        operating_points: res.data.operating_points,
        fault_flags: res.data.fault_flags,
        convergence: res.data.convergence,
        iterations: res.data.iterations,
        power_dissipation: res.data.power_dissipation,
      };
      store.setSimulationResult(result);
      return result;
    } catch (err) {
      console.error("Simulacion fallida:", err);
      return null;
    } finally {
      store.setIsSimulating(false);
    }
  }, [store]);

  const saveProject = useCallback(
    async (title: string) => {
      const { netlist } = useCircuitStore.getState();
      try {
        const res = await circuitsApi.create({
          titulo: title,
          data_netlist_json: netlist,
        });
        return res.data;
      } catch (err) {
        console.error("Error guardando proyecto:", err);
        throw err;
      }
    },
    []
  );

  const loadProject = useCallback((netlist: CircuitNetlist, title: string) => {
    useCircuitStore.getState().loadFromProject(netlist, title);
  }, []);

  return {
    netlist: store.netlist,
    selectedNodeId: store.selectedNodeId,
    toolMode: store.toolMode,
    zoom: store.zoom,
    pan: store.pan,
    gridSize: store.gridSize,
    showGrid: store.showGrid,
    simulationResult: store.simulationResult,
    isSimulating: store.isSimulating,
    faultFlags: store.faultFlags,
    projectTitle: store.projectTitle,
    addComponent,
    connectComponents,
    removeNode: store.removeNode,
    updateNode: store.updateNode,
    selectNode: store.selectNode,
    removeEdge: store.removeEdge,
    setToolMode: store.setToolMode,
    setZoom: store.setZoom,
    setPan: store.setPan,
    clearCanvas: store.clearCanvas,
    runSimulation,
    saveProject,
    loadProject,
    setNetlist: store.setNetlist,
    setProjectTitle: store.setProjectTitle,
  };
}