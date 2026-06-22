from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional
import json

@dataclass
class NetlistNode:
    id: str
    component: str = "resistor"
    value: float = 0.0
    unit: str = "ohm"
    x: float = 0.0
    y: float = 0.0

@dataclass
class NetlistEdge:
    from_comp: str
    to_comp: str
    terminal_from: str = "positive"
    terminal_to: str = "negative"

@dataclass
class NetlistDef:
    nodes: List[NetlistNode] = field(default_factory=list)
    edges: List[NetlistEdge] = field(default_factory=list)

@dataclass
class Component:
    id: str
    type: str
    value: float
    unit: str
    x: float
    y: float
    node_connections: Dict[str, int] = field(default_factory=dict)


@dataclass
class ElectricalNode:
    id: int
    voltage: float = 0.0
    is_ground: bool = False
    is_fixed: bool = False
    fixed_voltage: float = 0.0
    components: List[Tuple[str, str]] = field(default_factory=list)


@dataclass
class SimulationResult:
    node_voltages: Dict[str, float]
    branch_currents: Dict[str, float]
    operating_points: Dict[str, Dict]
    fault_flags: List[str]
    convergence: bool
    iterations: int
    power_dissipation: Dict[str, float]


class NodalSolver:
    """Motor de simulacion nodal simplificado para analisis DC."""

    GROUND_ID = 0
    MAX_ITERATIONS = 100
    CONVERGENCE_TOL = 1e-6
    VTH = 0.026
    IS_DIODE = 1e-12
    BETA_F = 100.0
    BETA_R = 1.0

    FAULT_OPEN_CIRCUIT = "open_circuit"
    FAULT_SHORT_CIRCUIT = "short_circuit"
    FAULT_FLOATING_NODE = "floating_node"
    FAULT_POWER_EXCEEDED = "power_exceeded"

    def __init__(self, netlist: NetlistDef):
        self.raw_netlist = netlist
        self.components: Dict[str, Component] = {}
        self.electrical_nodes: Dict[int, ElectricalNode] = {}
        self._parse_netlist()

    def _parse_netlist(self):
        """Convierte el netlist tipado en estructura interna."""
        nodes_data = self.raw_netlist.nodes
        edges_data = self.raw_netlist.edges

        for n in nodes_data:
            self.components[n.id] = Component(
                id=n.id,
                type=n.component,
                value=float(n.value),
                unit=n.unit,
                x=float(n.x),
                y=float(n.y),
            )

        union_find = {}
        def find(x):
            if x not in union_find:
                union_find[x] = x
            if union_find[x] != x:
                union_find[x] = find(union_find[x])
            return union_find[x]
        def union(x, y):
            rx, ry = find(x), find(y)
            if rx != ry:
                union_find[rx] = ry

        terminal_keys = []
        for edge in edges_data:
            from_comp = edge.from_comp
            to_comp = edge.to_comp
            term_from = edge.terminal_from
            term_to = edge.terminal_to
            k1 = f"{from_comp}:{term_from}"
            k2 = f"{to_comp}:{term_to}"
            terminal_keys.extend([k1, k2])
            union(k1, k2)

        node_groups: Dict[str, Set[str]] = {}
        for tk in terminal_keys:
            root = find(tk)
            if root not in node_groups:
                node_groups[root] = set()
            node_groups[root].add(tk)

        elec_node_map: Dict[str, int] = {}
        next_node_id = 1

        for group in node_groups.values():
            node_id = next_node_id
            next_node_id += 1
            for tk in group:
                elec_node_map[tk] = node_id

        self.electrical_nodes[self.GROUND_ID] = ElectricalNode(
            id=self.GROUND_ID, voltage=0.0, is_ground=True, is_fixed=True, fixed_voltage=0.0
        )

        for node_id in range(1, next_node_id):
            self.electrical_nodes[node_id] = ElectricalNode(id=node_id)

        for comp_id, comp in self.components.items():
            comp.node_connections = {}
            for term in ["positive", "negative", "collector", "emitter", "base"]:
                tk = f"{comp_id}:{term}"
                if tk in elec_node_map:
                    nid = elec_node_map[tk]
                    comp.node_connections[term] = nid
                    self.electrical_nodes[nid].components.append((comp_id, term))

        self._infer_ground()

    def _infer_ground(self):
        """Infiere el nodo de tierra (el que conecta a la terminal negativa de fuentes DC)."""
        for comp in self.components.values():
            if comp.type == "vsource_dc":
                if "negative" in comp.node_connections:
                    gnd_nid = comp.node_connections["negative"]
                    if gnd_nid != self.GROUND_ID and gnd_nid in self.electrical_nodes:
                        new_ground_node = self.electrical_nodes[gnd_nid]
                        new_ground_node.is_ground = True
                        new_ground_node.is_fixed = True
                        new_ground_node.fixed_voltage = 0.0
                        self.GROUND_ID = gnd_nid
                if "positive" in comp.node_connections:
                    pos_nid = comp.node_connections["positive"]
                    if pos_nid in self.electrical_nodes:
                        self.electrical_nodes[pos_nid].is_fixed = True
                        self.electrical_nodes[pos_nid].fixed_voltage = comp.value

    def solve(self) -> SimulationResult:
        """Resuelve el circuito usando analisis nodal modificado."""
        fault_flags = []
        branch_currents = {}
        operating_points = {}
        power_dissipation = {}

        fault_flags.extend(self._detect_topology_faults())

        floating = self._find_floating_nodes()
        if floating:
            fault_flags.append(self.FAULT_FLOATING_NODE)

        free_nodes = [nid for nid, n in self.electrical_nodes.items()
                      if not n.is_fixed and not n.is_ground]

        if not free_nodes:
            node_voltages = {str(nid): n.voltage for nid, n in self.electrical_nodes.items()}
            self._compute_branch_currents(node_voltages, branch_currents, operating_points, power_dissipation)
            return SimulationResult(
                node_voltages=node_voltages,
                branch_currents=branch_currents,
                operating_points=operating_points,
                fault_flags=fault_flags,
                convergence=True,
                iterations=0,
                power_dissipation=power_dissipation,
            )

        node_index = {nid: i for i, nid in enumerate(free_nodes)}
        n = len(free_nodes)
        V = np.zeros(n)

        for iteration in range(self.MAX_ITERATIONS):
            G = np.zeros((n, n))
            I = np.zeros(n)

            for comp in self.components.values():
                self._stamp_component(comp, G, I, V, node_index, free_nodes)

            try:
                delta_V = np.linalg.solve(G, I)
            except np.linalg.LinAlgError:
                fault_flags.append(self.FAULT_SHORT_CIRCUIT)
                node_voltages = {str(nid): self.electrical_nodes[nid].voltage for nid in free_nodes}
                node_voltages[str(self.GROUND_ID)] = 0.0
                return SimulationResult(
                    node_voltages=node_voltages, branch_currents={},
                    operating_points={}, fault_flags=fault_flags,
                    convergence=False, iterations=iteration,
                    power_dissipation={},
                )

            if np.linalg.norm(delta_V - V, ord=np.inf) < self.CONVERGENCE_TOL:
                V = delta_V
                break
            V = 0.5 * V + 0.5 * delta_V
        else:
            return SimulationResult(
                node_voltages={}, branch_currents={},
                operating_points={}, fault_flags=fault_flags + [self.FAULT_OPEN_CIRCUIT],
                convergence=False, iterations=self.MAX_ITERATIONS,
                power_dissipation={},
            )

        for nid, idx in node_index.items():
            self.electrical_nodes[nid].voltage = float(V[idx])

        node_voltages = {str(nid): n.voltage for nid, n in self.electrical_nodes.items()}
        self._compute_branch_currents(node_voltages, branch_currents, operating_points, power_dissipation)

        for comp_id, p in power_dissipation.items():
            if abs(p) > 10.0:
                fault_flags.append(self.FAULT_POWER_EXCEEDED)
                break

        return SimulationResult(
            node_voltages=node_voltages,
            branch_currents=branch_currents,
            operating_points=operating_points,
            fault_flags=list(set(fault_flags)),
            convergence=True,
            iterations=iteration + 1,
            power_dissipation=power_dissipation,
        )

    def _stamp_component(self, comp: Component, G: np.ndarray, I: np.ndarray,
                         V: np.ndarray, node_index: Dict[int, int], free_nodes: List[int]):
        """Agrega la contribucion de un componente a la matriz conductancia."""
        t = comp.type

        if t == "resistor":
            self._stamp_resistor(comp, G, I, V, node_index, free_nodes)
        elif t == "capacitor":
            pass
        elif t == "inductor":
            self._stamp_inductor(comp, G, I, V, node_index, free_nodes)
        elif t == "vsource_dc":
            pass
        elif t == "diode":
            self._stamp_diode(comp, G, I, V, node_index, free_nodes)
        elif t == "bjt_npn":
            self._stamp_bjt(comp, G, I, V, node_index, free_nodes)

    def _stamp_resistor(self, comp: Component, G: np.ndarray, I: np.ndarray,
                        V: np.ndarray, node_index: Dict[int, int], free_nodes: List[int]):
        n1 = comp.node_connections.get("positive")
        n2 = comp.node_connections.get("negative")
        if n1 is None or n2 is None:
            return
        g = 1.0 / comp.value if comp.value != 0 else 1e12
        v1 = self._get_node_voltage(n1, V, node_index)
        v2 = self._get_node_voltage(n2, V, node_index)
        i_eq = g * (v1 - v2)

        if n1 in node_index:
            idx1 = node_index[n1]
            G[idx1, idx1] += g
            if n2 in node_index:
                idx2 = node_index[n2]
                G[idx1, idx2] -= g
            I[idx1] += i_eq - g * v1 + g * v2
        if n2 in node_index:
            idx2 = node_index[n2]
            G[idx2, idx2] += g
            if n1 in node_index:
                idx1 = node_index[n1]
                G[idx2, idx1] -= g
            I[idx2] -= i_eq - g * v1 + g * v2

    def _stamp_inductor(self, comp: Component, G: np.ndarray, I: np.ndarray,
                        V: np.ndarray, node_index: Dict[int, int], free_nodes: List[int]):
        n1 = comp.node_connections.get("positive")
        n2 = comp.node_connections.get("negative")
        if n1 is None or n2 is None:
            return
        g = 1e6
        v1 = self._get_node_voltage(n1, V, node_index)
        v2 = self._get_node_voltage(n2, V, node_index)
        i_eq = g * (v1 - v2)

        if n1 in node_index:
            idx1 = node_index[n1]
            G[idx1, idx1] += g
            if n2 in node_index:
                idx2 = node_index[n2]
                G[idx1, idx2] -= g
            I[idx1] += i_eq - g * v1 + g * v2
        if n2 in node_index:
            idx2 = node_index[n2]
            G[idx2, idx2] += g
            if n1 in node_index:
                idx1 = node_index[n1]
                G[idx2, idx1] -= g
            I[idx2] -= i_eq - g * v1 + g * v2

    def _stamp_diode(self, comp: Component, G: np.ndarray, I: np.ndarray,
                     V: np.ndarray, node_index: Dict[int, int], free_nodes: List[int]):
        n_a = comp.node_connections.get("positive")
        n_c = comp.node_connections.get("negative")
        if n_a is None or n_c is None:
            return
        v_a = self._get_node_voltage(n_a, V, node_index)
        v_c = self._get_node_voltage(n_c, V, node_index)
        v_d = v_a - v_c

        if v_d > 10 * self.VTH:
            g_d = self.IS_DIODE / self.VTH * np.exp(10)
            i_d = g_d * v_d - self.IS_DIODE * (np.exp(10) - 1)
        elif v_d < -10 * self.VTH:
            g_d = self.IS_DIODE / self.VTH * np.exp(-10)
            i_d = g_d * v_d
        else:
            g_d = self.IS_DIODE / self.VTH * np.exp(v_d / self.VTH)
            i_d = self.IS_DIODE * (np.exp(v_d / self.VTH) - 1)

        if n_a in node_index:
            idx_a = node_index[n_a]
            G[idx_a, idx_a] += g_d
            if n_c in node_index:
                G[idx_a, node_index[n_c]] -= g_d
            I[idx_a] += i_d - g_d * v_d
        if n_c in node_index:
            idx_c = node_index[n_c]
            G[idx_c, idx_c] += g_d
            if n_a in node_index:
                G[idx_c, node_index[n_a]] -= g_d
            I[idx_c] -= i_d - g_d * v_d

    def _stamp_bjt(self, comp: Component, G: np.ndarray, I: np.ndarray,
                   V: np.ndarray, node_index: Dict[int, int], free_nodes: List[int]):
        nc = comp.node_connections.get("collector")
        nb = comp.node_connections.get("base")
        ne = comp.node_connections.get("emitter")

        v_c = self._get_node_voltage(nc, V, node_index) if nc else 0
        v_b = self._get_node_voltage(nb, V, node_index) if nb else 0
        v_e = self._get_node_voltage(ne, V, node_index) if ne else 0

        v_be = v_b - v_e
        v_bc = v_b - v_c

        i_es = self.IS_DIODE
        alpha_f = self.BETA_F / (self.BETA_F + 1)
        alpha_r = self.BETA_R / (self.BETA_R + 1)

        g_be = i_es / self.VTH * max(1, np.exp(v_be / self.VTH))
        g_bc = i_es / self.VTH * max(1, np.exp(v_bc / self.VTH))

        for node, g_term, i_term in [(nc, g_bc, alpha_f * g_be * v_be - alpha_r * g_bc * v_bc),
                                      (nb, g_be + g_bc, -g_be * v_be - g_bc * v_bc),
                                      (ne, g_be, -alpha_f * g_be * v_be + g_bc * v_bc)]:
            if node and node in node_index:
                idx = node_index[node]
                G[idx, idx] += g_term
                I[idx] += i_term

    def _get_node_voltage(self, node_id: int, V: np.ndarray, node_index: Dict[int, int]) -> float:
        if node_id == self.GROUND_ID or (node_id in self.electrical_nodes and self.electrical_nodes[node_id].is_ground):
            return 0.0
        if node_id in self.electrical_nodes and self.electrical_nodes[node_id].is_fixed:
            return self.electrical_nodes[node_id].fixed_voltage
        if node_id in node_index:
            return float(V[node_index[node_id]])
        return 0.0

    def _detect_topology_faults(self) -> List[str]:
        flags = []
        for comp in self.components.values():
            n1 = comp.node_connections.get("positive") or comp.node_connections.get("collector")
            n2 = comp.node_connections.get("negative") or comp.node_connections.get("emitter")
            if comp.type == "resistor" and comp.value < 1e-6:
                flags.append(self.FAULT_SHORT_CIRCUIT)
            if comp.type == "resistor" and comp.value > 1e12:
                flags.append(self.FAULT_OPEN_CIRCUIT)
            if n1 is not None and n2 is not None and n1 == n2:
                if comp.type in ["resistor", "diode"]:
                    flags.append(self.FAULT_SHORT_CIRCUIT)
        return list(set(flags))

    def _find_floating_nodes(self) -> List[int]:
        """Detecta nodos que solo tienen una conexion (sin retorno a tierra)."""
        floating = []
        connection_count = {}
        for comp in self.components.values():
            for nid in comp.node_connections.values():
                connection_count[nid] = connection_count.get(nid, 0) + 1

        for nid, count in connection_count.items():
            if nid == self.GROUND_ID:
                continue
            if count < 2:
                has_path_to_ground = self._has_path_to_ground(nid, set())
                if not has_path_to_ground:
                    floating.append(nid)
        return floating

    def _has_path_to_ground(self, start_nid: int, visited: Set[int]) -> bool:
        if start_nid == self.GROUND_ID:
            return True
        if start_nid in visited:
            return False
        visited.add(start_nid)
        for comp in self.components.values():
            nodes = list(comp.node_connections.values())
            if start_nid in nodes:
                for nid in nodes:
                    if nid != start_nid and self._has_path_to_ground(nid, visited):
                        return True
        return False

    def _compute_branch_currents(self, node_voltages: Dict[str, float],
                                  branch_currents: Dict[str, float],
                                  operating_points: Dict[str, Dict],
                                  power_dissipation: Dict[str, float]):
        for comp in self.components.values():
            nid_p = comp.node_connections.get("positive") or comp.node_connections.get("collector")
            nid_n = comp.node_connections.get("negative") or comp.node_connections.get("emitter")

            if nid_p is None or nid_n is None:
                continue

            v_p = node_voltages.get(str(nid_p), 0.0)
            v_n = node_voltages.get(str(nid_n), 0.0)
            v_diff = v_p - v_n
            key = f"{comp.id}"

            if comp.type == "resistor":
                current = v_diff / comp.value if comp.value != 0 else 0
                branch_currents[key] = float(current)
                power_dissipation[key] = float(current ** 2 * comp.value)
                operating_points[key] = {"voltage": v_diff, "current": current, "mode": "ohmic"}

            elif comp.type == "vsource_dc":
                conductance_matrix = self._build_conductance_only(node_voltages)
                current = self._compute_source_current(comp, conductance_matrix, node_voltages)
                branch_currents[key] = float(current)
                power_dissipation[key] = float(comp.value * abs(current))
                operating_points[key] = {"voltage": comp.value, "current": current, "mode": "dc_source"}

            elif comp.type == "diode":
                i_d = self.IS_DIODE * (np.exp(v_diff / self.VTH) - 1) if v_diff > -10 * self.VTH else -self.IS_DIODE
                branch_currents[key] = float(i_d)
                power_dissipation[key] = float(abs(v_diff * i_d))
                mode = "forward" if v_diff > 0.7 else "reverse"
                operating_points[key] = {"voltage": v_diff, "current": i_d, "mode": mode}

            elif comp.type == "inductor":
                branch_currents[key] = float(v_diff * 1e6)
                power_dissipation[key] = 0.0
                operating_points[key] = {"voltage": v_diff, "current": v_diff * 1e6, "mode": "short_dc"}

            elif comp.type in ["bjt_npn", "bjt_pnp"]:
                v_be = self._get_bjt_vbe(comp, node_voltages)
                i_c = branch_currents.get(key, 0)
                operating_points[key] = {
                    "v_be": v_be,
                    "v_ce": v_diff,
                    "i_c": i_c,
                    "region": self._bjt_region(v_be, v_diff)
                }
                power_dissipation[key] = float(abs(v_diff * i_c))

    def _build_conductance_only(self, node_voltages: Dict[str, float]) -> np.ndarray:
        free_nodes = [nid for nid, n in self.electrical_nodes.items()
                      if not n.is_fixed and not n.is_ground]
        n = len(free_nodes)
        node_index = {nid: i for i, nid in enumerate(free_nodes)}
        G = np.zeros((n, n))

        for comp in self.components.values():
            if comp.type == "resistor":
                n1 = comp.node_connections.get("positive")
                n2 = comp.node_connections.get("negative")
                if n1 is None or n2 is None:
                    continue
                g = 1.0 / comp.value if comp.value != 0 else 0
                if n1 in node_index:
                    G[node_index[n1], node_index[n1]] += g
                    if n2 in node_index:
                        G[node_index[n1], node_index[n2]] -= g
                if n2 in node_index:
                    G[node_index[n2], node_index[n2]] += g
                    if n1 in node_index:
                        G[node_index[n2], node_index[n1]] -= g

        return G

    def _compute_source_current(self, source_comp: Component, G: np.ndarray,
                                 node_voltages: Dict[str, float]) -> float:
        pos_nodes = [nid for nid, n in self.electrical_nodes.items() if n.is_fixed]
        if not pos_nodes:
            return 0.0
        return source_comp.value * np.sum(np.abs(G)) * 0.01 if G.size > 0 else 0.0

    def _get_bjt_vbe(self, comp: Component, node_voltages: Dict[str, float]) -> float:
        nb = comp.node_connections.get("base")
        ne = comp.node_connections.get("emitter")
        if nb is None or ne is None:
            return 0.0
        return node_voltages.get(str(nb), 0.0) - node_voltages.get(str(ne), 0.0)

    def _bjt_region(self, v_be: float, v_ce: float) -> str:
        if v_be < 0.5:
            return "cutoff"
        elif v_ce < 0.2:
            return "saturation"
        else:
            return "active"