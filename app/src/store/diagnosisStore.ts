import { create } from "zustand";
import type { DiagnosisResult } from "@/types/circuit";

interface DiagnosisState {
  // Stream
  isStreaming: boolean;
  streamText: string;
  diagnosisResult: DiagnosisResult | null;
  history: DiagnosisResult[];
  wsConnected: boolean;

  // Actions
  startStream: () => void;
  appendStreamText: (text: string) => void;
  endStream: () => void;
  setDiagnosisResult: (result: DiagnosisResult | null) => void;
  addToHistory: (result: DiagnosisResult) => void;
  clearHistory: () => void;
  setWsConnected: (v: boolean) => void;
  resetStream: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  isStreaming: false,
  streamText: "",
  diagnosisResult: null,
  history: [],
  wsConnected: false,

  startStream: () => set({ isStreaming: true, streamText: "", diagnosisResult: null }),
  appendStreamText: (text) =>
    set((s) => ({ streamText: s.streamText + text })),
  endStream: () => set({ isStreaming: false }),
  setDiagnosisResult: (result) => set({ diagnosisResult: result }),
  addToHistory: (result) =>
    set((s) => ({ history: [result, ...s.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),
  setWsConnected: (v) => set({ wsConnected: v }),
  resetStream: () => set({ isStreaming: false, streamText: "", diagnosisResult: null }),
}));