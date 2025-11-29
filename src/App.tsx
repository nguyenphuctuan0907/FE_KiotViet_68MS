import { useEffect, useState } from "react";
import { Search, ShoppingCart, Bell } from "lucide-react";
import "./App.css";
import { useSocket } from "./hooks/useSocket";

interface Room {
  id: number;
  name: string;
  using?: boolean;
  total?: number;
  minutes?: number;
}

function App() {
  const socket = useSocket(import.meta.env.VITE_URL_SOCKET || "http://localhost:3000"); // server NestJS
  const [timeMinute, setTimeMinute] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const rooms: Room[] = [...Array.from({ length: 19 }, (_, i) => ({ id: i + 1, name: `BOX ${i + 1}` }))];
  // const ordes: any[] = [
  //   { name: "Coca Cola", quantity: 2, price: 15000 },
  //   { name: "Pepsi", quantity: 1, price: 12000 },
  // ];
  // const prices: any[] = [
  //   { label: "1 người", amount: 60000 },
  //   { label: "2-3 người", amount: 85000 },
  //   { label: "4-6 người", amount: 115000 },
  //   { label: "7-10 người", amount: 135000 },
  // ];

  console.log({ timeMinute });

  useEffect(() => {
    if (!socket) return;

    // Lắng nghe event 'time' từ server
    socket.on("minute_tick", (msg: string) => {
      setTimeMinute((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("minute_tick");
    };
  }, [socket]);

  return (
    <div>
      <div className="w-screen h-screen flex bg-[#f4f7fc] text-gray-800 select-none">
        {/* LEFT SIDE – ROOM + MENU */}

        <div className="w-3/5 border-r bg-white">
          {/* TOP FILTER */}
          <div className="tabs tabs-lift h-full">
            <label className="tab">
              <input type="radio" name="my_tabs_4" defaultChecked />
              Phòng bàn
            </label>
            <div className="tab-content bg-base-100 border-base-300 p-6">
              <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto">
                {rooms.map((room) => (
                  <div key={room.id} onClick={() => setSelectedRoom(room)} className={`cursor-pointer h-24 rounded-2xl border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg ${selectedRoom?.id === room.id ? "bg-blue-500 text-white border-blue-600" : room.using ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-300"}`}>
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
          {/* ROOMS GRID */}
        </div>

        {/* RIGHT SIDE – ORDER PANEL */}
        <div className="w-2/5 flex flex-col bg-white shadow-xl">
          {/* TOP: HEADER */}
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

          {/* EMPTY STATE */}
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{!selectedRoom ? "Vui lòng chọn phòng bên trái" : "Chưa có món trong đơn"}</div>

          {/* BOTTOM: PAYMENT */}
          <div className="border-t p-4 flex justify-between items-center bg-white shadow-lg">
            <div className="text-lg font-bold">Tổng tiền: 0đ</div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition">Thanh toán (F9)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
