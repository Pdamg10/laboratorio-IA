import { useMemo } from "react";
import { useCircuitStore } from "@/store/circuitStore";
import { BarChart3, Zap, TrendingUp, Power } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function ResultViewer({ onBack }: Props) {
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const netlist = useCircuitStore((s) => s.netlist);

  const nodeVoltageEntries = useMemo(() => {
    if (!simulationResult?.node_voltages) return [];
    return Object.entries(simulationResult.node_voltages)
      .filter(([k]) => k !== "0")
      .sort((a, b) => b[1] - a[1]);
  }, [simulationResult]);

  const branchCurrentEntries = useMemo(() => {
    if (!simulationResult?.branch_currents) return [];
    return Object.entries(simulationResult.branch_currents).sort(
      (a, b) => Math.abs(b[1]) - Math.abs(a[1])
    );
  }, [simulationResult]);

  const powerEntries = useMemo(() => {
    if (!simulationResult?.power_dissipation) return [];
    return Object.entries(simulationResult.power_dissipation).sort(
      (a, b) => Math.abs(b[1]) - Math.abs(a[1])
    );
  }, [simulationResult]);

  const getComponentLabel = (id: string) => {
    const node = netlist.nodes.find((n) => n.id === id);
    if (node) {
      return `${node.component} (${node.value}${node.unit})`;
    }
    return id;
  };

  const maxVoltage = useMemo(() => {
    if (!nodeVoltageEntries.length) return 1;
    return Math.max(...nodeVoltageEntries.map(([, v]) => Math.abs(v)), 0.001);
  }, [nodeVoltageEntries]);

  const maxCurrent = useMemo(() => {
    if (!branchCurrentEntries.length) return 1;
    return Math.max(...branchCurrentEntries.map(([, v]) => Math.abs(v as number)), 0.001);
  }, [branchCurrentEntries]);

  const maxPower = useMemo(() => {
    if (!powerEntries.length) return 1;
    return Math.max(...powerEntries.map(([, v]) => Math.abs(v as number)), 0.001);
  }, [powerEntries]);

  if (!simulationResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Sin resultados de simulacion</p>
          <p className="text-sm">Ejecuta una simulacion para ver los resultados</p>
          <button
            onClick={onBack}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Volver al canvas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-600" />
            Resultados de Simulacion
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                simulationResult.convergence
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {simulationResult.convergence ? "Convergio" : "No convergio"} en{" "}
              {simulationResult.iterations} iteraciones
            </span>
            <button
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Volver al canvas
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Nodos</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{nodeVoltageEntries.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              Vmax: {maxVoltage.toFixed(3)}V
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <span className="text-sm font-medium text-gray-600">Corrientes</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{branchCurrentEntries.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              Imax: {(maxCurrent * 1000).toFixed(3)}mA
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Power size={18} className="text-amber-500" />
              <span className="text-sm font-medium text-gray-600">Potencia</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{powerEntries.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              Pmax: {(maxPower * 1000).toFixed(3)}mW
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voltages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-blue-500" />
              Voltajes Nodales
            </h3>
            <div className="space-y-2">
              {nodeVoltageEntries.map(([id, v]) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">Nodo {id}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded transition-all"
                      style={{
                        width: `${Math.min(100, (Math.abs(v) / maxVoltage) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-700 w-20 text-right">
                    {v.toFixed(4)}V
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Currents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Corrientes de Rama
            </h3>
            <div className="space-y-2">
              {branchCurrentEntries.map(([id, i]) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0 truncate" title={getComponentLabel(id)}>
                    {id.slice(0, 8)}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded transition-all"
                      style={{
                        width: `${Math.min(100, (Math.abs(i as number) / maxCurrent) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-700 w-24 text-right">
                    {((i as number) * 1000).toFixed(4)}mA
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Power */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Power size={16} className="text-amber-500" />
              Disipacion de Potencia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {powerEntries.map(([id, p]) => {
                const pval = Math.abs(p as number);
                const isHigh = pval > 0.1;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 shrink-0 truncate" title={getComponentLabel(id)}>
                      {getComponentLabel(id)}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${isHigh ? "bg-red-500" : "bg-amber-400"}`}
                        style={{
                          width: `${Math.min(100, (pval / maxPower) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono w-24 text-right ${isHigh ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {(pval * 1000).toFixed(3)}mW
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operating points */}
          {simulationResult.operating_points &&
            Object.keys(simulationResult.operating_points).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Puntos de Operacion
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Componente</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Tipo</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Voltaje</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Corriente</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Modo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(simulationResult.operating_points).map(([id, op]) => {
                        const node = netlist.nodes.find((n) => n.id === id);
                        return (
                          <tr key={id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-xs">{id.slice(0, 10)}</td>
                            <td className="py-2 px-3">{node?.component ?? "?"}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {(op.voltage as number)?.toFixed(4) ?? "-"}V
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {((op.current as number) ?? 0 * 1000).toFixed(4)}mA
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  (op.mode as string)?.includes("forward") ||
                                  (op.mode as string)?.includes("active")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : (op.mode as string)?.includes("reverse") ||
                                      (op.mode as string)?.includes("cutoff")
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {String(op.mode ?? "-")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}