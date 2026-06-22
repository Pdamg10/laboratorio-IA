import { Link } from "react-router";

export default function StudentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi Espacio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-lg">Laboratorio Virtual</h2>
          <p className="text-sm text-gray-500 mt-2 mb-4">Ingresa al entorno de simulacion de circuitos.</p>
          <Link to="/workbench" className="text-blue-600 hover:underline text-sm font-medium">Ir al workbench →</Link>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-lg">Mis Resultados</h2>
          <p className="text-sm text-gray-500 mt-2">Revisa tus practicas anteriores y diagnósticos.</p>
        </div>
      </div>
    </div>
  );
}
