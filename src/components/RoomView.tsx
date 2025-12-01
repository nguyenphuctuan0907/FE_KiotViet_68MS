// RoomView.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, ShoppingCart, Bell } from "lucide-react";
import { useRoomHeartbeatSocket } from "../hooks/useRoomStatusHeartbeat";

interface Room {
  id: number;
  name: string;
  using?: boolean;
  total?: number;
  minutes?: number;
}

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 phút

function RoomView() {
  const socket = useRoomHeartbeatSocket(import.meta.env.VITE_URL_SOCKET || "http://localhost:3000");
  const [timeMinute, setTimeMinute] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const rooms: Room[] = [...Array.from({ length: 19 }, (_, i) => ({ id: i + 1, name: `BOX ${i + 1}` }))];

  const visibilityRef = useRef(!document.hidden);
  useEffect(() => {
    const onVisibility = () => {
      visibilityRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // build heartbeat payload
  const buildHeartbeat = useCallback(() => {
    if (!selectedRoom) return null;
    return {
      roomId: `box-${selectedRoom.id}`,
      roomNumericId: selectedRoom.id,
      name: selectedRoom.name,
      using: selectedRoom.using ?? false,
      total: selectedRoom.total ?? 0,
      minutes: selectedRoom.minutes ?? 0,
      ts: new Date().toISOString(),
      client: "pos-client-v1",
    };
  }, [selectedRoom]);

  // send heartbeat via socket
  const sendHeartbeat = useCallback(() => {
    const payload = buildHeartbeat();
    if (!payload || !socket) return;
    try {
      socket.emit("room:heartbeat", payload);
      // optional: track local history of ticks
      setTimeMinute((prev) => {
        const next = [...prev, new Date().toISOString()];
        // keep small history
        return next.slice(-10);
      });
    } catch (err) {
      console.warn("Emit heartbeat failed", err);
    }
  }, [buildHeartbeat, socket]);

  // When selectedRoom changes -> send immediate heartbeat
  useEffect(() => {
    if (!selectedRoom) return;
    // send immediate on selection
    sendHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  // interval heartbeat (respect visibility)
  useEffect(() => {
    if (!socket) return;
    const id = window.setInterval(() => {
      // skip when page hidden to save bandwidth — optional
      if (!visibilityRef.current) return;
      // only send when a room selected
      if (!selectedRoom) return;
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [socket, selectedRoom, sendHeartbeat]);

  // also listen server events (optional)
  useEffect(() => {
    if (!socket) return;
    const minuteHandler = (msg: string) => {
      setTimeMinute((prev) => [...prev.slice(-9), msg]);
    };
    socket.on("minute_tick", minuteHandler);

    return () => {
      socket.off("minute_tick", minuteHandler);
    };
  }, [socket]);

  return (
    <div>
      <div className="w-screen h-screen flex bg-[#f4f7fc] text-gray-800 select-none">
        <div className="w-3/5 border-r bg-white">
          <div className="tabs tabs-lift h-full">
            <label className="tab">
              <input type="radio" name="my_tabs_4" defaultChecked />
              Phòng bàn
            </label>
            <div className="tab-content bg-base-100 border-base-300 p-6">
              <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`cursor-pointer h-24 rounded-2xl border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg ${
                      selectedRoom?.id === room.id
                        ? "bg-blue-500 text-white border-blue-600"
                        : room.using
                        ? "bg-blue-50 border-blue-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold">{room.name}</div>
                    {room.using && (
                      <div className="absolute bottom-2 flex gap-2 text-[10px] font-medium opacity-90">
                        <span>{room.total?.toLocaleString()}đ</span>
                        <span>{room.minutes}p</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="tab">
              <input type="radio" name="my_tabs_4" />
              Thực đơn
            </label>
            <div className="tab-content bg-base-100 border-base-300 p-6">Tab content 2</div>
          </div>
        </div>

        <div className="w-2/5 flex flex-col bg-white shadow-xl">
          <div className="h-14 border-b flex items-center justify-between px-4 bg-white">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart size={20} />
              {selectedRoom ? selectedRoom.name : "Chưa chọn phòng"}
            </div>
            <div className="flex items-center gap-4 text-gray-600">
              <Bell size={18} />
              <Search size={18} />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {!selectedRoom ? "Vui lòng chọn phòng bên trái" : "Chưa có món trong đơn"}
          </div>

          <div className="border-t p-4 flex justify-between items-center bg-white shadow-lg">
            <div className="text-lg font-bold">Tổng tiền: 0đ</div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition">Thanh toán (F9)</button>
          </div>
        </div>
      </div>
      {/* debug */}
      <div style={{ position: "fixed", right: 10, bottom: 10, zIndex: 999 }}>
        <div className="text-xs bg-white p-2 rounded shadow">
          <div>Last heartbeats:</div>
          <ul className="text-xs">
            {timeMinute.map((t) => (
              <li key={t}>{new Date(t).toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RoomView;
