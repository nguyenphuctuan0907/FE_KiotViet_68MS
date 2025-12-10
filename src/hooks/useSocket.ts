// hooks/useRobustSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  url: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export const useRobustSocket = (options: UseSocketOptions) => {
  const {
    url,
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 1000,
    heartbeatInterval = 30000, // 30 giây
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const setupHeartbeat = useCallback(
    (socket: Socket) => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit("ping", {
            timestamp: Date.now(),
            client: "pos-client-v1",
          });
        }
      }, heartbeatInterval);
    },
    [heartbeatInterval]
  );

  const connect = useCallback(() => {
    console.log(`🔗 Attempting to connect to ${url} (Attempt ${reconnectAttemptsRef.current + 1})`);

    // Cleanup existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
      timeout: 10000,
      forceNew: true,
      query: {
        clientId: `pos-${Date.now()}`,
        version: "1.0.0",
      },
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    socketRef.current = socket;

    // Connection established
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
      setLastError(null);
      reconnectAttemptsRef.current = 0;
      setupHeartbeat(socket);
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      setLastError(error.message);
      setIsConnected(false);

      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
        console.log(`⏳ Reconnecting in ${delay}ms...`);

        setTimeout(() => {
          if (!socketRef.current?.connected) {
            connect();
          }
        }, delay);
      }
    });

    // Disconnected
    socket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // Server disconnected us, try to reconnect
        socket.connect();
      }

      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            connect();
          }
        }, reconnectDelay);
      }
    });

    // Ping/Pong for keep-alive
    socket.on("pong", (data) => {
      console.log("🏓 Pong received:", data);
    });

    // Handle custom errors
    socket.on("error", (error) => {
      console.error("💥 Socket error:", error);
      setLastError(error.toString());
    });

    // Reconnect events
    socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_failed", () => {
      console.error("🔄 Reconnection failed");
    });
  }, [url, autoReconnect, maxReconnectAttempts, reconnectDelay, setupHeartbeat]);

  // Initial connect
  useEffect(() => {
    connect();

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (!document.hidden && !socketRef.current?.connected) {
        console.log("👀 Page visible, reconnecting...");
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle offline/online
    const handleOnline = () => {
      console.log("🌐 Network online, reconnecting...");
      reconnectAttemptsRef.current = 0;
      connect();
    };

    window.addEventListener("online", handleOnline);

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [connect]);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn(`Cannot emit ${event}: Socket not connected`);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    lastError,
    emit,
    disconnect,
    reconnect: connect,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
};
