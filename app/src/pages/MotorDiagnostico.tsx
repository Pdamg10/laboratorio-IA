import { useEffect, useState } from "react";
import { motorApi, equiposApi, flujoApi } from "@/api/endpoints";
import { Bot, Cpu, Search, ShieldCheck, ChevronRight, GraduationCap, X } from "lucide-react";
import TutorChat from "@/components/chat/TutorChat";

interface DiagnosticoResult {
  falla_tipo: string;
  falla_severidad: string;
  probabilidad: number;
  pruebas_sugeridas: string;
}

interface EquipoBasico {
  id: string;
  codigo: string;
  nombre: string;
}

export default function MotorDiagnostico() {
  const [activeTab, setActiveTab] = useState<"diagnostico" | "tutor">("diagnostico");
  
  const [sintoma, setSintoma] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<DiagnosticoResult[] | null>(null);

  const [equipos, setEquipos] = useState<EquipoBasico[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<DiagnosticoResult | null>(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState("");

  useEffect(() => {
    equiposApi.listEquipos().then(res => setEquipos(res.data)).catch(console.error);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sintoma.trim()) return;

    setLoading(true);
    try {
      const res = await motorApi.inferir(sintoma);
      setResultados(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearReporte = async () => {
    if (!selectedEquipoId || !selectedDiagnostico) return;
    try {
      await flujoApi.crearDiagnostico({
        id_equipo: selectedEquipoId,
        descripcion: `Falla detectada por IA: ${selectedDiagnostico.falla_tipo}. Sugerencia: ${selectedDiagnostico.pruebas_sugeridas}`
      });
      setIsReportModalOpen(false);
      setSelectedDiagnostico(null);
      setSelectedEquipoId("");
      alert("¡Reporte técnico creado y vinculado al equipo exitosamente!");
    } catch (error) {
      console.error(error);
      alert("Error al crear el reporte técnico.");
    }
  };

  const getSeverityColor = (sev: string) => {
    if (sev === "Critica" || sev === "Alta") return "bg-red-50 text-red-700 border-red-200";
    if (sev === "Media") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
          <Bot className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Motor de Diagnóstico & Tutor IA</h1>
          <p className="text-gray-500 mt-1">
            Asistencia inteligente para diagnosticar fallas de equipo o resolver dudas de electrónica.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab("diagnostico")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === "diagnostico" 
              ? "bg-white text-gray-800 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Search size={16} />
          Diagnóstico de Equipos
        </button>
        <button
          onClick={() => setActiveTab("tutor")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === "tutor" 
              ? "bg-white text-gray-800 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap size={16} />
          Tutor Virtual
        </button>
      </div>

      {/* Contenido Diagnóstico */}
      {activeTab === "diagnostico" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <form onSubmit={handleSearch} className="mb-8 max-w-4xl">
            <div className="relative">
              <input
                type="text"
                value={sintoma}
                onChange={(e) => setSintoma(e.target.value)}
                placeholder='Ejemplo: "El osciloscopio no enciende"'
                className="w-full pl-12 pr-32 py-4 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-gray-700 text-lg transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
              >
                {loading ? "Analizando..." : "Analizar"}
              </button>
            </div>
          </form>

          {resultados && (
            <div className="space-y-6 max-w-4xl">
              <h2 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                <Cpu className="text-blue-600" size={20} />
                Resultados del Análisis
              </h2>
              
              <div className="grid gap-4">
                {resultados.map((res, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-50/50 -z-10 transition-all duration-1000"
                      style={{ width: `${res.probabilidad * 100}%` }}
                    />

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-800 text-lg">{res.falla_tipo}</h3>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSeverityColor(res.falla_severidad)}`}>
                            {res.falla_severidad.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm flex items-start gap-2 mt-3">
                          <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                          <span><strong>Prueba Sugerida:</strong> {res.pruebas_sugeridas}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black text-blue-600">
                          {Math.round(res.probabilidad * 100)}%
                        </div>
                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
                          Probabilidad
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                      <button 
                        onClick={() => { setSelectedDiagnostico(res); setIsReportModalOpen(true); }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
                      >
                        Crear Reporte con este Diagnóstico
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenido Tutor IA */}
      {activeTab === "tutor" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TutorChat />
        </div>
      )}

      {isReportModalOpen && selectedDiagnostico && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Vincular a un Equipo</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">Diagnóstico a reportar:</p>
                <p className="text-blue-900 font-bold">{selectedDiagnostico.falla_tipo}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona el equipo averiado:</label>
                <select 
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={selectedEquipoId}
                  onChange={(e) => setSelectedEquipoId(e.target.value)}
                >
                  <option value="">-- Seleccionar Equipo --</option>
                  {equipos.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.codigo} - {eq.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsReportModalOpen(false)} 
                className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCrearReporte} 
                disabled={!selectedEquipoId}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
