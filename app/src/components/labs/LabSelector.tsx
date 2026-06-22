import { useState, useEffect } from "react";
import { labsApi } from "@/api/endpoints";
import { useCircuitStore } from "@/store/circuitStore";
import type { Lab } from "@/types/circuit";
import { FlaskConical, Star, ChevronRight, BookOpen, ArrowLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function LabSelector({ onBack }: Props) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const loadFromProject = useCircuitStore((s) => s.loadFromProject);

  useEffect(() => {
    labsApi
      .list()
      .then((res) => setLabs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLoadLab = (lab: Lab) => {
    loadFromProject(lab.circuito_base_json, lab.titulo);
    onBack();
  };

  const difficultyLabel = (d: number) => {
    if (d === 1) return { text: "Basico", color: "bg-emerald-100 text-emerald-700" };
    if (d === 2) return { text: "Intermedio", color: "bg-amber-100 text-amber-700" };
    return { text: "Avanzado", color: "bg-red-100 text-red-700" };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={24} className="text-blue-600" />
            Laboratorios Predefinidos
          </h1>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labs.map((lab) => {
            const diff = difficultyLabel(lab.dificultad);
            return (
              <div
                key={lab.id_laboratorio}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                onClick={() => handleLoadLab(lab)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FlaskConical size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {lab.titulo}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}
                      >
                        {diff.text}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 group-hover:text-blue-500 transition-colors"
                  />
                </div>

                {lab.descripcion && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lab.descripcion}</p>
                )}

                {/* Objectives */}
                {lab.objetivos && lab.objetivos.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">Objetivos:</span>
                    <ul className="space-y-1">
                      {lab.objetivos.slice(0, 3).map((obj, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Star size={10} className="text-amber-500 mt-0.5 shrink-0" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Component count */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                  <span>
                    {lab.circuito_base_json?.nodes?.length ?? 0} componentes
                  </span>
                  <span>
                    {lab.circuito_base_json?.edges?.length ?? 0} conexiones
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}