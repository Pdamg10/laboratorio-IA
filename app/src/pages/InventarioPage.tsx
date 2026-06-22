import { useEffect, useState } from "react";
import { equiposApi } from "@/api/endpoints";
import { Box, AlertTriangle, Plus, X } from "lucide-react";

interface Componente {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  ubicacion: string;
}

export default function InventarioPage() {
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", categoria: "", stock: 0, ubicacion: "" });

  const loadComponentes = async () => {
    try {
      const res = await equiposApi.listComponentes();
      setComponentes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setTimeout(() => { loadComponentes(); }, 0);
  }, []);

  const handleCreate = async () => {
    if (!formData.nombre || !formData.categoria || !formData.ubicacion) return;
    try {
      await equiposApi.createComponente({
        ...formData,
        stock: Number(formData.stock)
      });
      setIsModalOpen(false);
      setFormData({ nombre: "", categoria: "", stock: 0, ubicacion: "" });
      loadComponentes();
    } catch (error) {
      console.error(error);
      alert("Error al añadir stock");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario de Componentes</h1>
          <p className="text-gray-500 mt-1">Control de stock de piezas y suministros electrónicos.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={18} />
          <span>Añadir Stock</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-sm">
              <th className="p-4 font-medium">Componente</th>
              <th className="p-4 font-medium">Ubicación</th>
              <th className="p-4 font-medium">Stock Disponible</th>
              <th className="p-4 font-medium">Mínimo</th>
              <th className="p-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {componentes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No hay componentes registrados en el inventario.
                </td>
              </tr>
            ) : (
              componentes.map((c) => {
                const critico = c.stock <= c.stock_minimo;
                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${critico ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4 font-medium text-gray-800">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${critico ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          <Box size={16} />
                        </div>
                        {c.nombre}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{c.ubicacion}</td>
                    <td className={`p-4 font-mono font-bold ${critico ? 'text-red-600' : 'text-gray-800'}`}>
                      {c.stock}
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-sm">{c.stock_minimo}</td>
                    <td className="p-4">
                      {critico ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">
                          <AlertTriangle size={12} /> Critico
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">
                          Suficiente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Registrar Componente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  placeholder="Ej: Resistencia 10k"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pasivos"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.categoria} 
                  onChange={e => setFormData({...formData, categoria: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.stock} 
                  onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input 
                  type="text" 
                  placeholder="Ej: Estante A-1"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={formData.ubicacion} 
                  onChange={e => setFormData({...formData, ubicacion: e.target.value})} 
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
                Añadir Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
