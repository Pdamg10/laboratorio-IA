import { create } from "zustand";

interface User {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "ESTUDIANTE";
  created_at: string;
}

interface SessionState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setTokens: (access: string | null, refresh: string | null) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setTokens: (access, refresh) => {
    if (access) localStorage.setItem("access_token", access);
    else localStorage.removeItem("access_token");
    if (refresh) localStorage.setItem("refresh_token", refresh);
    else localStorage.removeItem("refresh_token");
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: !!access });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setLoading: (v) => set({ isLoading: v }),
}));