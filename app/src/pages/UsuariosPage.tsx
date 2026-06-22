import { useEffect, useState } from "react";
import { authApi } from "@/api/endpoints";
import { Mail, Shield, User } from "lucide-react";

interface Usuario {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  created_at?: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const loadUsuarios = async () => {
    try {
      const res = await authApi.users();
      setUsuarios(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setTimeout(() => { loadUsuarios(); }, 0);
  }, []);

  const getRoleColor = (rol: string) => {
    if (rol === "ADMIN") return "bg-purple-100 text-purple-700";
    if (rol === "DOCENTE") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
  };

  const getRoleIcon = (rol: string) => {
    if (rol === "ADMIN") return <Shield size={14} className="mr-1" />;
    return <User size={14} className="mr-1" />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Directorio de Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestión de cuentas y accesos a la plataforma.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-sm">
              <th className="p-4 font-medium">Nombre</th>
              <th className="p-4 font-medium">Contacto</th>
              <th className="p-4 font-medium">Rol / Permisos</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  Cargando usuarios...
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      {u.nombre}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-gray-400" />
                      {u.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getRoleColor(u.rol)}`}>
                      {getRoleIcon(u.rol)}
                      {u.rol}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
