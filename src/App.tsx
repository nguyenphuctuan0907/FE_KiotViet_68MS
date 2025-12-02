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

interface Order {
  name: string;
  price: number;
  id: string;
  value?: number;
}

function App() {
  // const socket = useSocket(import.meta.env.VITE_URL_SOCKET || "http://localhost:3000"); // server NestJS
  const [timeMinute, setTimeMinute] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order[]>([]);

  const rooms: Room[] = [...Array.from({ length: 19 }, (_, i) => ({ id: i + 1, name: `BOX ${i + 1}` }))];
  const orders: any[] = [
    { name: "Coca Cola", price: 15000, id: "abc" },
    { name: "Pepsi", price: 12000, id: "cdx" },
  ];
  // const prices: any[] = [
  //   { label: "1 người", amount: 60000 },
  //   { label: "2-3 người", amount: 85000 },
  //   { label: "4-6 người", amount: 115000 },
  //   { label: "7-10 người", amount: 135000 },
  // ];

  console.log({ timeMinute });

  // useEffect(() => {
  //   if (!socket) return;

  //   // Lắng nghe event 'time' từ server
  //   socket.on("minute_tick", (msg: string) => {
  //     setTimeMinute((prev) => [...prev, msg]);
  //   });

  //   return () => {
  //     socket.off("minute_tick");
  //   };
  // }, [socket]);

  const handleClickOrder = (order: Order) => {
    const orderIndex = selectedOrder.findIndex((o) => o.id === order.id);
    const updatedOrders = [...selectedOrder];
    if (orderIndex !== -1) {
      updatedOrders[orderIndex].value = (updatedOrders[orderIndex].value || 0) + 1;
      setSelectedOrder(updatedOrders);
    } else {
      order.value = 1;
      updatedOrders.push(order);
      setSelectedOrder(updatedOrders);
    }
  };

  return (
    <div>
      <div className="w-screen h-screen flex text-gray-800 select-none">
        {/* LEFT SIDE – ROOM + MENU */}

        <div className="w-3/5 border-r bg-amber-300">
          {/* TOP FILTER */}
          <div className="tabs tabs-lift h-full ">
            <label className="tab text-lg font-bold">
              <input type="radio" name="my_tabs_4" defaultChecked />
              Phòng bàn
            </label>
            <div className="tab-content  p-6 bg-[#f4f7fc]">
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
            <div className="tab-content  border-base-300 p-6 bg-[#f4f7fc]">
              <div className="tabs tabs-lift h-full">
                <label className="tab">
                  <input type="radio" name="my_tabs_3" defaultChecked />
                  Giá theo giờ
                </label>

                <div className="tab-content border-base-300 p-6">Tab 1 content</div>

                <label className="tab">
                  <input type="radio" name="my_tabs_3" />
                  Đồ ăn thức uống
                </label>

                <div className="tab-content border-base-300 p-6">
                  <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto">
                    {orders.map((order) => (
                      <div key={order.name} onClick={() => handleClickOrder(order)} className={`cursor-pointer h-24 rounded-2xl border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg`}>
                        <div className="text-sm font-semibold">{order.name}</div>
                        <div className="text-sm font-semibold">{order.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
          <div className="text-gray text-sm">
            {!selectedRoom
              ? "Vui lòng chọn phòng bên trái"
              : selectedOrder.length > 0
              ? selectedOrder.map((order, index) => (
                  <div key={order.id} className="flex justify-between w-full px-4 py-2 border-b">
                    <div className="font-bold">
                      {index + 1}. {order.name}
                    </div>

                    <div>
                      <input
                        type="number"
                        className="input bg-white text-black border-black"
                        placeholder="Số lượng"
                        min="1"
                        title="Nhập số lượng"
                        value={order.value}
                        onVolumeChangeCapture={() => {}}
                        // onChange={(e) => {
                        //   const quantity = parseInt(e.target.value) || 1;
                        // }}
                      />
                    </div>

                    <div>{order.price.toLocaleString()}đ</div>
                    <div>{Number(Number(order.price) * Number(order.value)).toLocaleString()}đ</div>
                  </div>
                ))
              : "Chưa có món trong đơn"}
          </div>

          {/* BOTTOM: PAYMENT */}
          <div className="border-t p-4 flex justify-between items-center bg-white shadow-lg mt-auto">
            <div className="text-lg font-bold">Tổng tiền: 0đ</div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition">Thanh toán (F9)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
