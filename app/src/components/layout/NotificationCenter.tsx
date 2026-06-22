import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, Settings, X } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { alarmasApi } from "@/api/endpoints";

export default function NotificationCenter() {
  const [alarmas, setAlarmas] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const user = useSessionStore((s) => s.user);

  const loadAlarmas = async () => {
    try {
      const res = await alarmasApi.list();
      setAlarmas(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      loadAlarmas();
      // Polling cada 30 segundos
      const interval = setInterval(loadAlarmas, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await alarmasApi.updateEstado(id, "VISTA");
      setAlarmas((prev) => prev.map((a) => (a.id === id ? { ...a, estado: "VISTA" } : a)));
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (tipo: string) => {
    if (tipo === "CRITICA") return <AlertTriangle className="text-red-500" size={20} />;
    if (tipo === "OPERATIVA") return <Settings className="text-amber-500" size={20} />;
    return <Info className="text-blue-500" size={20} />;
  };

  const nuevasAlarmas = alarmas.filter((a) => a.estado === "NUEVA");
  const criticasNuevas = nuevasAlarmas.filter((a) => a.tipo === "CRITICA");

  return (
    <div className="relative">
      {/* Modal Bloqueante para Críticas (Simplificado como un banner fijo) */}
      {criticasNuevas.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-bounce">
          <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-4">
            <AlertTriangle className="shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold">{criticasNuevas[0].titulo}</h4>
              <p className="text-sm text-red-100 mt-1">{criticasNuevas[0].descripcion}</p>
              {criticasNuevas[0].accion_recomendada && (
                <div className="mt-2 text-xs bg-red-700 inline-block px-2 py-1 rounded">
                  Acción: {criticasNuevas[0].accion_recomendada}
                </div>
              )}
            </div>
            <button onClick={() => handleMarkAsRead(criticasNuevas[0].id)} className="text-red-200 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Botón de Campanita */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
      >
        <Bell size={20} />
        {nuevasAlarmas.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Dropdown del Centro de Notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-40">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
              {nuevasAlarmas.length} nuevas
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {alarmas.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No tienes notificaciones.</div>
            ) : (
              alarmas.map((alarma) => (
                <div
                  key={alarma.id}
                  className={`p-4 border-b border-gray-50 flex gap-3 ${
                    alarma.estado === "NUEVA" ? "bg-blue-50/50" : "opacity-70"
                  }`}
                >
                  <div className="shrink-0 mt-1">{getIcon(alarma.tipo)}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800">{alarma.titulo}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{alarma.descripcion}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">
                        {new Date(alarma.fecha).toLocaleTimeString()}
                      </span>
                      {alarma.estado === "NUEVA" && (
                        <button
                          onClick={() => handleMarkAsRead(alarma.id)}
                          className="text-xs text-blue-600 font-medium hover:text-blue-800"
                        >
                          Marcar vista
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
