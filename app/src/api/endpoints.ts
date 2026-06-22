import { api } from "./client";
import type {
  CircuitNetlist,
  CircuitProject,
  Lab,
  SimulationResult,
  DiagnosisResult,
} from "@/types/circuit";

// Auth
export const authApi = {
  register: (data: { nombre: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (username: string, password: string) =>
    api.post("/auth/login", new URLSearchParams({ username, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get("/auth/me"),
  users: () => api.get("/auth/users"),
};

// Circuits
export const circuitsApi = {
  list: () => api.get<CircuitProject[]>("/circuits"),
  get: (id: string) => api.get<CircuitProject>(`/circuits/${id}`),
  create: (data: { titulo: string; data_netlist_json: CircuitNetlist }) =>
    api.post<CircuitProject>("/circuits", data),
  update: (id: string, data: Partial<CircuitProject>) =>
    api.put<CircuitProject>(`/circuits/${id}`, data),
  delete: (id: string) => api.delete(`/circuits/${id}`),
  simulate: (circuitId: string, netlist: CircuitNetlist) =>
    api.post<{
      circuit_id: string;
      node_voltages: Record<string, number>;
      branch_currents: Record<string, number>;
      operating_points: Record<string, Record<string, unknown>>;
      fault_flags: string[];
      convergence: boolean;
      iterations: number;
      power_dissipation: Record<string, number>;
    }>("/circuits/simulate", { circuit_id: circuitId, netlist }),
};

// Labs
export const labsApi = {
  list: () => api.get<Lab[]>("/labs"),
  get: (id: string) => api.get<Lab>(`/labs/${id}`),
};

// Diagnosis
export const diagnosisApi = {
  diagnose: (data: {
    circuit_id: string;
    simulation_result: SimulationResult;
    fault_flags: string[];
    user_question?: string;
  }) => api.post<DiagnosisResult>("/diagnosis", data),
  history: (circuitId: string) => api.get(`/diagnosis/history/${circuitId}`),
};

// Equipos e Inventario
export const equiposApi = {
  listEquipos: () => api.get("/equipos"),
  createEquipo: (data: any) => api.post("/equipos", data),
  updateEstado: (id: string, estado: string) => api.put(`/equipos/${id}/estado?estado=${estado}`),
  listComponentes: () => api.get("/equipos/componentes"),
  createComponente: (data: any) => api.post("/equipos/componentes", data),
};

// Flujo de Laboratorio
export const flujoApi = {
  getDashboardStats: () => api.get("/flujo/dashboard-stats"),
  crearDiagnostico: (data: any) => api.post("/flujo/diagnostico", data),
  listReportes: () => api.get("/flujo/reportes"),
  validarDiagnostico: (id: string) => api.put(`/flujo/reportes/${id}/validar`),
  repararEquipo: (id: string, accion: string) => api.put(`/flujo/reportes/${id}/reparar?accion=${encodeURIComponent(accion)}`),
};

// Motor de Detección Asistida
export const motorApi = {
  inferir: (sintoma_texto: string) => api.post("/motor/inferir", { sintoma_texto }),
};

// Alarmas
export const alarmasApi = {
  list: () => api.get("/alarmas"),
  updateEstado: (id: string, estado: string) =>
    api.put(`/alarmas/${id}/estado`, null, { params: { estado } }),
};

export const tutorApi = {
  chat: (history: any[], message: string) =>
    api.post("/tutor/chat", { history, message }),
};