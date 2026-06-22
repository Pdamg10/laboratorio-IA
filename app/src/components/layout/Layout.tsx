import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useSessionStore } from "@/store/sessionStore";

import NotificationCenter from "./NotificationCenter";

export default function Layout({ children }: { children: ReactNode }) {
  const user = useSessionStore((s) => s.user);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar / Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shrink-0">
          <h2 className="font-medium text-gray-800">Bienvenido, {user?.nombre}</h2>
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
