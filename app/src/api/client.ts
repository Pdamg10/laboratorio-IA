import axios from "axios";
import { useSessionStore } from "@/store/sessionStore";

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useSessionStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);