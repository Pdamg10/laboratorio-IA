import { useRef, useCallback } from "react";
import { useDiagnosisStore } from "@/store/diagnosisStore";
import { diagnosisApi } from "@/api/endpoints";
import type { SimulationResult, DiagnosisResult } from "@/types/circuit";

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000/api/diagnosis/ws`;

export function useDiagnosis() {
  const wsRef = useRef<WebSocket | null>(null);
  const store = useDiagnosisStore();

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      store.setWsConnected(true);
    };
    ws.onclose = () => {
      store.setWsConnected(false);
      wsRef.current = null;
    };
    ws.onerror = () => {
      store.setWsConnected(false);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "token") {
          store.appendStreamText(msg.content || "");
        } else if (msg.type === "heuristic") {
          store.setDiagnosisResult(msg.data as DiagnosisResult);
        } else if (msg.type === "done") {
          store.endStream();
        } else if (msg.type === "error") {
          store.appendStreamText(`\n[Error: ${msg.message}]`);
          store.endStream();
        }
      } catch {
        store.appendStreamText(event.data);
      }
    };
    wsRef.current = ws;
  }, [store]);

  const disconnectWebSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const requestDiagnosisStream = useCallback(
    (circuitId: string, simulationResult: SimulationResult, faultFlags: string[], userQuestion?: string) => {
      store.startStream();
      connectWebSocket();

      const sendWhenReady = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              circuit_id: circuitId,
              simulation_result: simulationResult,
              fault_flags: faultFlags,
              user_question: userQuestion || null,
            })
          );
        } else {
          setTimeout(sendWhenReady, 100);
        }
      };
      sendWhenReady();
    },
    [store, connectWebSocket]
  );

  const requestDiagnosisRest = useCallback(
    async (circuitId: string, simulationResult: SimulationResult, faultFlags: string[], userQuestion?: string) => {
      store.startStream();
      try {
        const res = await diagnosisApi.diagnose({
          circuit_id: circuitId,
          simulation_result: simulationResult,
          fault_flags: faultFlags,
          user_question: userQuestion,
        });
        store.setDiagnosisResult(res.data);
        store.addToHistory(res.data);
        return res.data;
      } catch (err) {
        console.error("Diagnostico fallido:", err);
        return null;
      } finally {
        store.endStream();
      }
    },
    [store]
  );

  return {
    isStreaming: store.isStreaming,
    streamText: store.streamText,
    diagnosisResult: store.diagnosisResult,
    history: store.history,
    wsConnected: store.wsConnected,
    requestDiagnosisStream,
    requestDiagnosisRest,
    connectWebSocket,
    disconnectWebSocket,
    resetStream: store.resetStream,
  };
}