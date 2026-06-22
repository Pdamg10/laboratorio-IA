import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useSessionStore } from "@/store/sessionStore";
import { LayoutDashboard, Users, Monitor, Box, ClipboardList, LogOut, ChevronLeft, Menu } from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useSessionStore();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getLinks = () => {
    switch (user?.rol) {
      case "ADMIN":
        return [
          { name: "Dashboard", path: "/", icon: LayoutDashboard },
          { name: "Equipos", path: "/equipos", icon: Monitor },
          { name: "Inventario", path: "/inventario", icon: Box },
          { name: "Usuarios", path: "/usuarios", icon: Users },
          { name: "Reportes", path: "/reportes", icon: ClipboardList },
        ];
      case "DOCENTE":
        return [
          { name: "Dashboard", path: "/", icon: LayoutDashboard },
          { name: "Mis Equipos", path: "/equipos", icon: Monitor },
          { name: "Estudiantes", path: "/estudiantes", icon: Users },
          { name: "Diagnosticos", path: "/diagnosticos", icon: ClipboardList },
        ];
      case "ESTUDIANTE":
      default:
        return [
          { name: "Mi Espacio", path: "/", icon: LayoutDashboard },
          { name: "Laboratorio Virtual", path: "/workbench", icon: Monitor },
          { name: "Motor Asistido", path: "/motor", icon: Box },
          { name: "Mis Resultados", path: "/resultados", icon: ClipboardList },
        ];
    }
  };

  const links = getLinks();

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col h-full transition-all duration-300 relative`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 border border-slate-700 text-slate-300 rounded-full p-1 z-50 hover:bg-slate-700 hover:text-white"
      >
        {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center px-0' : ''}`}>
        {!isCollapsed ? (
          <div>
            <h1 className="text-xl font-bold text-white">LabVirtual</h1>
            <p className="text-xs mt-1 text-slate-500 uppercase tracking-wider">{user?.rol}</p>
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            LV
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              title={isCollapsed ? link.name : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg transition-colors ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={isCollapsed ? 22 : 18} />
              {!isCollapsed && <span className="text-sm font-medium">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => logout()}
          title={isCollapsed ? "Cerrar Sesion" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 w-full rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors`}
        >
          <LogOut size={isCollapsed ? 22 : 18} />
          {!isCollapsed && <span className="text-sm font-medium">Cerrar Sesion</span>}
        </button>
      </div>
    </div>
  );
}
