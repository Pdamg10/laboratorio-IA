import { useEffect, useState } from "react";
import { flujoApi, alarmasApi } from "@/api/endpoints";
import { MonitorPlay, AlertTriangle, AlertCircle, FileText, Bell, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Actividad {
  id: string;
  fecha: string | null;
  tipo: string;
  descripcion: string;
  estado: string;
}

interface TeacherStats {
  equipos_asignados: number;
  reportes_pendientes: number;
  actividad_reciente: Actividad[];
}

interface Alarma {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  rol_destino?: string;
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [alarmas, setAlarmas] = useState<Alarma[]>([]);

  const loadData = async () => {
    try {
      const [statsRes, alarmasRes] = await Promise.all([
        flujoApi.getDashboardStats(),
        alarmasApi.list()
      ]);
      setStats(statsRes.data);
      // Solo mostrar alarmas dirigidas al DOCENTE (simulado por no tener ID en este contexto simplificado)
      setAlarmas(alarmasRes.data.filter((a: Alarma) => (a.estado === "Activa" || a.estado === "Nueva") && a.rol_destino === "DOCENTE").slice(0, 5));
    } catch (e) {
      console.error("Error loading dashboard data", e);
    }
  };

  useEffect(() => {
    setTimeout(() => { loadData(); }, 0);
  }, []);

  const getSeverityColor = (tipo: string) => {
    if (tipo === "Crítica") return "bg-red-50 text-red-700 border-red-200";
    if (tipo === "Operativa") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getSeverityIcon = (tipo: string) => {
    if (tipo === "Crítica") return <AlertTriangle size={16} />;
    if (tipo === "Operativa") return <AlertCircle size={16} />;
    return <Bell size={16} />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel Docente</h1>
        <p className="text-gray-500 mt-1">Supervisión de alumnos y revisión de diagnósticos.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Main Column */}
        <div className="flex-1 space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600"><MonitorPlay size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Equipos Asignados</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.equipos_asignados || 0}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-lg text-amber-600"><FileText size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Reportes por Validar</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.reportes_pendientes || 0}</p>
              </div>
            </div>
          </div>

          {/* Daily Activity Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Prácticas Recientes de Alumnos</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-6 py-3 font-medium">Fecha / Hora</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Descripción</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!stats?.actividad_reciente || stats.actividad_reciente.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Sin prácticas recientes.</td>
                  </tr>
                ) : (
                  stats.actividad_reciente.map((act: Actividad) => (
                    <tr key={act.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-600">
                        {act.fecha ? format(new Date(act.fecha), "dd MMM hh:mm a", { locale: es }) : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium text-xs">
                          {act.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800">{act.descripcion}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${act.estado === "Pendiente" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {act.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="w-full xl:w-80 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-gray-400" size={20} />
              <h2 className="font-semibold text-gray-800">Alarmas y Avisos</h2>
            </div>
            <div className="space-y-3">
              {alarmas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <CheckCircle size={32} className="mb-2 opacity-50 text-emerald-500" />
                  <p className="text-sm">Todo en orden</p>
                </div>
              ) : (
                alarmas.map((alarma: Alarma) => (
                  <div key={alarma.id} className={`p-4 rounded-lg border flex gap-3 items-start ${getSeverityColor(alarma.tipo)}`}>
                    <div className="mt-0.5">{getSeverityIcon(alarma.tipo)}</div>
                    <div>
                      <p className="font-semibold text-sm leading-tight mb-1">{alarma.titulo}</p>
                      <p className="text-xs opacity-90">{alarma.descripcion}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
