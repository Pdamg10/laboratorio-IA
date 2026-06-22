import { useEffect, useState } from "react";
import { equiposApi } from "@/api/endpoints";
import { Monitor, Plus, ShieldAlert, CheckCircle2, Wrench, X } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";

interface Equipo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  estado: string;
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [formData, setFormData] = useState({ codigo: "", nombre: "", categoria: "" });
  const user = useSessionStore((s) => s.user);
  
  const loadEquipos = async () => {
    try {
      const res = await equiposApi.listEquipos();
      setEquipos(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setTimeout(() => { loadEquipos(); }, 0);
  }, []);

  const handleCreate = async () => {
    if (!formData.codigo || !formData.nombre || !formData.categoria) return;
    try {
      await equiposApi.createEquipo(formData);
      setIsModalOpen(false);
      setFormData({ codigo: "", nombre: "", categoria: "" });
      loadEquipos();
    } catch (error) {
      console.error(error);
      alert("Error al crear equipo");
    }
  };

  const getStatusIcon = (estado: string) => {
    switch(estado) {
      case "Disponible": return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "Pendiente reparación": return <ShieldAlert size={16} className="text-red-500" />;
      case "En uso": return <Monitor size={16} className="text-blue-500" />;
      default: return <Wrench size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catálogo de Equipos</h1>
          <p className="text-gray-500 mt-1">Gestión y estado actual del instrumental de laboratorio.</p>
        </div>
        {user?.rol === "ADMIN" && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={18} />
            <span>Nuevo Equipo</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-sm">
              <th className="p-4 font-medium">Código</th>
              <th className="p-4 font-medium">Equipo</th>
              <th className="p-4 font-medium">Categoría</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No hay equipos registrados.
                </td>
              </tr>
            ) : (
              equipos.map(equipo => (
                <tr key={equipo.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-mono text-sm text-gray-600">{equipo.codigo}</td>
                  <td className="p-4 font-medium text-gray-800">{equipo.nombre}</td>
                  <td className="p-4 text-gray-600">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                      {equipo.categoria}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(equipo.estado)}
                      <span className="text-sm font-medium text-gray-700">{equipo.estado}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedEquipo(equipo)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Registrar Nuevo Equipo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Inventario</label>
                <input 
                  type="text" 
                  placeholder="Ej: OSC-001"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.codigo} 
                  onChange={e => setFormData({...formData, codigo: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Equipo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Osciloscopio Digital 50MHz"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input 
                  type="text" 
                  placeholder="Ej: Instrumentación"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.categoria} 
                  onChange={e => setFormData({...formData, categoria: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreate} 
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEquipo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Detalles del Equipo</h2>
              <button onClick={() => setSelectedEquipo(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Código</p>
                <p className="text-lg font-mono text-gray-800">{selectedEquipo.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Nombre</p>
                <p className="text-lg text-gray-800 font-semibold">{selectedEquipo.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Categoría</p>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                  {selectedEquipo.categoria}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Estado Actual</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(selectedEquipo.estado)}
                  <span className="font-medium text-gray-700">{selectedEquipo.estado}</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setSelectedEquipo(null)} 
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
