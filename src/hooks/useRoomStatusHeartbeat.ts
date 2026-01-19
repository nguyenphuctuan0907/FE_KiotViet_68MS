// useRoomHeartbeatSocket.tsx
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRoomHeartbeatSocket(getStatus: () => any, options?: {
  url?: string;
  intervalMs?: number;
  authToken?: string;
}) {
  const url = options?.url ?? "/";
  const intervalMs = options?.intervalMs ?? 60_000;
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = io(url, {
      auth: options?.authToken ? { token: options!.authToken } : undefined,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket connected", socket.id);
      // immediate send
      socket.emit("room:status", { ...getStatus(), ts: new Date().toISOString() });
    });

    timerRef.current = window.setInterval(() => {
      if (socket.connected) {
        socket.emit("room:status", { ...getStatus(), ts: new Date().toISOString() });
      } else {
        // optional: queue or attempt reconnection
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);
}
