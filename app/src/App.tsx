import { Routes, Route, Navigate } from "react-router";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { authApi } from "@/api/endpoints";

import MainWorkbench from "@/pages/MainWorkbench";
import LoginPage from "@/pages/LoginPage";
import Layout from "@/components/layout/Layout";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import TeacherDashboard from "@/pages/dashboards/TeacherDashboard";
import StudentDashboard from "@/pages/dashboards/StudentDashboard";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUser } = useSessionStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !isAuthenticated) {
      authApi
        .me()
        .then((res) => setUser(res.data))
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [isAuthenticated, setUser]);

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

import EquiposPage from "@/pages/equipos/EquiposPage";
import MotorDiagnostico from "@/pages/MotorDiagnostico";
import FlujoAprobacion from "@/pages/FlujoAprobacion";
import InventarioPage from "@/pages/InventarioPage";
import UsuariosPage from "@/pages/UsuariosPage";

// Routes wrapper that includes Layout
function ProtectedLayout() {
  const user = useSessionStore((s) => s.user);
  
  const getDashboard = () => {
    if (user?.rol === "ADMIN") return <AdminDashboard />;
    if (user?.rol === "DOCENTE") return <TeacherDashboard />;
    return <StudentDashboard />;
  };

  return (
    <Layout>
      <Routes>
        <Route path="/" element={getDashboard()} />
        <Route path="/workbench" element={<MainWorkbench />} />
        <Route path="/equipos" element={<EquiposPage />} />
        <Route path="/motor" element={<MotorDiagnostico />} />
        <Route path="/reportes" element={<FlujoAprobacion />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/estudiantes" element={<UsuariosPage />} />
        <Route path="/diagnosticos" element={<FlujoAprobacion />} />
        <Route path="/resultados" element={<FlujoAprobacion />} />
        <Route path="*" element={<div className="p-8">Vista en construccion</div>} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <ProtectedLayout />
          </AuthGuard>
        }
      />
    </Routes>
  );
}