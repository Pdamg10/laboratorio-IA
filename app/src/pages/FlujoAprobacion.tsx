import { useEffect, useState } from "react";
import { flujoApi } from "@/api/endpoints";
import { CheckCircle, AlertTriangle, PenTool, Check } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";

interface Reporte {
  id: string;
  id_equipo: string;
  estado: string;
}

export default function FlujoAprobacion() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const user = useSessionStore((s) => s.user);

  const loadReportes = async () => {
    try {
      const res = await flujoApi.listReportes();
      setReportes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setTimeout(() => { loadReportes(); }, 0);
  }, []);

  const handleValidar = async (id: string) => {
    try {
      await flujoApi.validarDiagnostico(id);
      loadReportes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReparar = async (id: string) => {
    try {
      await flujoApi.repararEquipo(id, "Sustitución de componente y prueba exitosa");
      loadReportes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Flujo de Mantenimiento</h1>
        <p className="text-gray-500 mt-1">Gestión de diagnósticos y autorizaciones de reparación.</p>
      </div>

      <div className="grid gap-6">
        {reportes.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 border border-gray-100 rounded-xl text-gray-500">
            No hay reportes pendientes en el sistema.
          </div>
        ) : (
          reportes.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-start gap-4">
                {r.estado === "Pendiente" ? (
                  <AlertTriangle className="text-amber-500 mt-1" size={24} />
                ) : r.estado === "Aprobado" ? (
                  <PenTool className="text-blue-500 mt-1" size={24} />
                ) : (
                  <CheckCircle className="text-emerald-500 mt-1" size={24} />
                )}
                
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Reporte: {r.id_equipo.split('-')[0]}...</h3>
                  <p className="text-gray-500 text-sm mt-1">Estado actual: <span className="font-semibold">{r.estado}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {r.estado === "Pendiente" && user?.rol === "DOCENTE" && (
                  <button onClick={() => handleValidar(r.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                    <Check size={16} />
                    Validar Diagnóstico
                  </button>
                )}
                {r.estado === "Aprobado" && user?.rol === "ADMIN" && (
                  <button onClick={() => handleReparar(r.id)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    <PenTool size={16} />
                    Marcar Reparado
                  </button>
                )}
                {r.estado === "Reparado" && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium">Archivado</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
