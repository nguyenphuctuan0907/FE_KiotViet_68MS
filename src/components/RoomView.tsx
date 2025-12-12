// RoomView.tsx
import React, { useEffect, useState, useRef } from "react";
import { Search, ShoppingCart, Bell, Pause, SkipForward } from "lucide-react";
import { calculateHoursRounded, calculateMinutesRounded, calculatePrice, getActiveAndNextRules, priceRules, type Rule } from "../common";
import { useRobustSocket } from "../hooks/useSocket";
import Modal from "./Modal";
import { useApi } from "../hooks/useApi";
import { payosService } from "../service";
import PayOSQrBox from "./PayOSQrBox";
import Button from "./Button";

interface Room {
  id: number;
  name: string;
  using?: boolean;
  total?: number;
  minutes?: number;
  start?: number | Date;
  orders?: Order[];
  priceRule?: Rule;
}

interface Order {
  id: string;
  name: string;
  price: number;
  value?: number;
  total?: number;
}

interface ResPayment {
  qrCode: string;
}

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 phút
const ROOMS: Room[] = [...Array.from({ length: 19 }, (_, i) => ({ id: i + 1, name: `BOX ${i + 1}` }))];
const orders: Order[] = [
  { id: "order-1", name: "Trà chanh", price: 15000 },
  { id: "order-2", name: "Nước ngọt", price: 20000 },
];

function RoomView() {
  // const socket: any = useRoomHeartbeatSocket(import.meta.env.VITE_URL_SOCKET || "https://2ec99c5ee883.ngrok-free.app");
  const { socket, isConnected, lastError, emit } = useRobustSocket({
    url: import.meta.env.VITE_URL_SOCKET || "https://9f0758255ae0.ngrok-free.app",
    heartbeatInterval: 30000, // 30 giây
    maxReconnectAttempts: 20,
  });

  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [timeMinute, setTimeMinute] = useState<number | Date>(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const visibilityRef = useRef(!document.hidden);

  const { callApi: apiCreatePayment, data: resPayment } = useApi<any>(payosService.createPayment);
  console.log({ resPayment });
  // Hiển thị connection status
  useEffect(() => {
    console.log("Connection status:", isConnected ? "✅ Connected" : "❌ Disconnected");
  }, [isConnected]);

  useEffect(() => {
    const onVisibility = () => {
      visibilityRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  console.log({ rooms });

  useEffect(() => {
    console.log("Selected Room:", timeMinute, rooms);

    const newRooms = rooms.map((room) => {
      if (room.using && room.start) {
        const minutes = calculateMinutesRounded(typeof room.start === "number" ? room.start : room.start.getTime(), typeof timeMinute === "number" ? timeMinute : timeMinute.getTime());
        room.minutes = minutes;
        const priceRule = room.priceRule || null;
        const priceOrder = room.orders || [];
        if (priceRule || priceOrder) {
          const priceTotal = calculatePrice(minutes, priceRule?.pricePerHour || 0);
          const total = priceTotal + priceOrder.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
          room.priceRule!.total = priceTotal;
          room.total = total;
        }
      }

      return room;
    });

    setRooms(newRooms);
  }, [timeMinute]);

  // build heartbeat payload
  // const buildHeartbeat = useCallback(() => {
  //   if (!selectedRoom) return null;
  //   return {
  //     roomId: `box-${selectedRoom.id}`,
  //     roomNumericId: selectedRoom.id,
  //     name: selectedRoom.name,
  //     using: selectedRoom.using ?? false,
  //     total: selectedRoom.total ?? 0,
  //     minutes: selectedRoom.minutes ?? 0,
  //     ts: new Date().toISOString(),
  //     client: "pos-client-v1",
  //   };
  // }, [selectedRoom]);

  // send heartbeat via socket
  // const sendHeartbeat = useCallback(() => {
  //   const payload = buildHeartbeat();
  //   if (!payload || !socket) return;
  //   try {
  //     socket.emit("room:heartbeat", payload);
  //     // optional: track local history of ticks
  //     setTimeMinute((prev) => {
  //       const next = [...prev, new Date().toISOString()];
  //       // keep small history
  //       return next.slice(-10);
  //     });
  //   } catch (err) {
  //     console.warn("Emit heartbeat failed", err);
  //   }
  // }, [buildHeartbeat, socket]);

  // When selectedRoom changes -> send immediate heartbeat
  // useEffect(() => {
  //   if (!selectedRoom) return;
  //   // send immediate on selection
  //   sendHeartbeat();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedRoom]);

  // interval heartbeat (respect visibility)
  // useEffect(() => {
  //   if (!socket) return;
  //   const id = window.setInterval(() => {
  //     // skip when page hidden to save bandwidth — optional
  //     if (!visibilityRef.current) return;
  //     // only send when a room selected
  //     if (!selectedRoom) return;
  //     sendHeartbeat();
  //   }, HEARTBEAT_INTERVAL_MS);

  //   return () => {
  //     window.clearInterval(id);
  //   };
  // }, [socket, selectedRoom, sendHeartbeat]);

  // also listen server events (optional)
  useEffect(() => {
    if (!socket) return;
    const minuteHandler = (msg: number) => {
      setTimeMinute(msg);
    };
    socket.on("minute_tick", minuteHandler);

    return () => {
      socket.off("minute_tick", minuteHandler);
    };
  }, [socket]);

  const handleClickOrder = (order: Order) => {
    if (!selectedRoom) return;

    const newOrder = { ...order };

    const findRoom = rooms.find((room) => room.id === selectedRoom.id);
    if (!findRoom) return;

    if (findRoom.orders) {
      const existingOrder = findRoom.orders.find((o) => o.id === order.id);
      if (existingOrder) {
        existingOrder.value = (existingOrder.value || 0) + 1;
        existingOrder.total = (existingOrder.value || 0) * existingOrder.price;
      } else {
        newOrder.value = 1;
        newOrder.total = newOrder.price;
        findRoom.orders.push(newOrder);
      }
    } else {
      newOrder.value = 1;
      newOrder.total = newOrder.price;
      findRoom.orders = [newOrder];
    }

    findRoom.total = (findRoom.total || 0) + (newOrder.total || newOrder.price);

    setRooms([...rooms]);
  };

  const handleOnChangeInput = (order: Order, value: string, roomId: number) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;
    const findRoom = rooms.find((room) => room.id === roomId);
    if (!findRoom) return;

    if (!findRoom.orders) return;

    const existOrder = findRoom.orders.find((o) => o.id === order.id);
    if (existOrder) {
      if (numValue === 0) {
        findRoom.orders = findRoom.orders.filter((o) => o.id !== order.id);
      } else {
        existOrder.value = numValue;
        existOrder.total = numValue * existOrder.price;
      }
    }

    findRoom.total = findRoom.orders.reduce((sum: number, o: Order) => sum + (o.total || 0), 0) + (findRoom.priceRule?.total || 0);

    setRooms([...rooms]);
  };

  const handleClickActiveRule = (rule: Rule) => {
    if (!selectedRoom) return;

    const roomsUpdateStatus: Room[] = rooms.map((room: Room) => {
      if (room.id === selectedRoom.id) {
        room.using = true;
        room.start = Date.now();

        rule.total = calculatePrice(0, rule.pricePerHour);
        room.priceRule = rule;
        room.total = room.orders ? rule.total + room.orders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) : rule.total;
      }

      return room;
    });

    setRooms(roomsUpdateStatus);
  };

  const handleClickOpenPopupPayment = (roomId: number) => {
    if (!roomId) return;
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    setIsOpen(false);

    if (!selectedRoom) return;
    const findRoom = rooms.find((room) => room.id === selectedRoom.id);
    if (!findRoom) return;

    await apiCreatePayment({
      amount: findRoom.total || 0,
      cancelUrl: "",
      returnUrl: "",
      boxId: findRoom.id,
    });
  };

  const handleConfirmCash = async () => {};

  return (
    <div>
      <div className="w-screen h-screen flex text-red-800 select-none">
        <div className="w-3/5 border-r">
          <div className="tabs tabs-lift h-full bg-[#f4f7fc]">
            <label className="tab text-red-800">
              <input type="radio" name="my_tabs_4" defaultChecked />
              Phòng bàn
            </label>
            <div className="tab-content bg-[#f4f7fc] border-base-300 p-6">
              <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto ">
                {rooms.map((room) => (
                  <div key={room.id} onClick={() => setSelectedRoom(room)} className={`cursor-pointer h-24 rounded-2xl border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg ${selectedRoom?.id === room.id ? "bg-blue-500 text-white border-blue-600" : room.using ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-300"}`}>
                    <div className="text-sm font-semibold">{room.name}</div>
                    {room.using && room.start && (
                      <div className="absolute bottom-2 flex gap-2 text-[10px] font-medium opacity-90">
                        <span>{room.total?.toLocaleString()}đ</span>
                        <span>{room.minutes}p</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="tab text-red-800">
              <input type="radio" name="my_tabs_4" />
              Thực đơn
            </label>
            <div className="tab-content border-base-300 p-6">
              <div className="tabs tabs-lift h-full">
                <label className="tab text-red-800">
                  <input type="radio" name="my_tabs_3" defaultChecked />
                  Giá giờ hát
                </label>

                <div className="tab-content border-base-300 p-6">
                  <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto ">
                    {getActiveAndNextRules(priceRules).active.map((rule: Rule) => (
                      <div
                        key={rule.id}
                        className={`cursor-pointer h-24 rounded-2xl 
                    border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg`}
                        onClick={() => handleClickActiveRule(rule)}
                      >
                        <div className="text-sm font-semibold">{rule.pricePerHour.toLocaleString()}</div>
                        <div className="text-xs font-semibold">{rule.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="tab text-red-800">
                  <input type="radio" name="my_tabs_3" defaultChecked />
                  Chọn món
                </label>
                <div className="tab-content border-base-300 p-6">
                  <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto ">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className={`cursor-pointer h-24 rounded-2xl 
                    border relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg`}
                        onClick={() => handleClickOrder(order)}
                      >
                        <div className="text-sm font-semibold">{order.name}</div>
                        <div className="text-xs font-semibold">{order.price.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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

          <div className="text-gray-400 text-sm">
            {!selectedRoom ? (
              "Vui lòng chọn phòng bên trái"
            ) : selectedRoom.id ? (
              <div>
                <div>
                  {rooms.find((room) => room.id === selectedRoom.id)?.priceRule && (
                    <div key={rooms.find((room) => room.id === selectedRoom.id)?.priceRule?.id} className="w-full px-4 py-2 border-b text-black">
                      <div className="flex justify-between items-center">
                        <div className="font-bold ">{rooms.find((room) => room.id === selectedRoom.id)?.priceRule?.name}</div>
                        <div className="flex items-center gap-1 border-2 p-2 rounded-2xl">
                          <span className="cursor-pointer">
                            <Pause size={16} strokeWidth={2.5} />
                            {/* <SkipForward size={16} strokeWidth={2.5} /> */}
                          </span>
                          <span className="font-bold ml-4">{calculateHoursRounded(rooms.find((room) => room.id === selectedRoom.id)?.minutes ?? 0)}</span>
                        </div>
                        <div className="font-semibold">{rooms.find((room) => room.id === selectedRoom.id)?.priceRule?.pricePerHour.toLocaleString()}đ</div>
                        <div className="font-semibold">{rooms.find((room) => room.id === selectedRoom.id)?.priceRule?.total?.toLocaleString()}đ</div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  {rooms
                    .find((room) => room.id === selectedRoom.id)
                    ?.orders?.map((order: Order) => {
                      return (
                        <div key={`${order.id}_${selectedRoom.id}`} className="w-full px-4 py-2 border-b text-black">
                          <div className="flex justify-between items-center">
                            <div className="font-bold ">{order.name}</div>
                            <div>
                              <input type="number" className="input validator text-red-500" required placeholder="Type a number" min="1" title="Must be number" value={order.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOnChangeInput(order, e.currentTarget.value, selectedRoom.id)} />
                              <p className="validator-hint">Must be number</p>
                            </div>

                            <div className="font-semibold">{order.price.toLocaleString()}đ</div>
                            <div className="font-semibold">{(order.total || 0).toLocaleString()}đ</div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div>
                  {/* Hiển thị QR */}
                  <div className="tabs tabs-border">
                    <input type="radio" name="my_tabs_2" className="tab text-blue-600 font-bold" aria-label="Tiền mặt" defaultChecked />
                    <div className="tab-content p-5">
                      <Button
                        variant="primary"
                        onClick={() => {
                          handleConfirmCash();
                        }}
                      >
                        Hoàn thành
                      </Button>
                    </div>

                    <input type="radio" name="my_tabs_2" className="tab text-blue-600 font-bold" aria-label="Chuyển khoản" />
                    <div className="tab-content p-5">Chuyển khoản</div>
                  </div>
                  {resPayment && (
                    <div>
                      <PayOSQrBox checkoutUrl={resPayment.qrCode} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              "Chưa có món trong đơn"
            )}
          </div>

          <div className="border-t p-4 flex justify-between items-center bg-white shadow-lg mt-auto">
            <div className="text-lg font-bold">Tổng tiền: {selectedRoom ? rooms.find((room) => room.id === selectedRoom.id)?.total?.toLocaleString() : "0"}đ</div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition" onClick={() => selectedRoom && handleClickOpenPopupPayment(selectedRoom.id)}>
              Thanh toán
            </button>
          </div>
        </div>

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConfirm={handleConfirm} size="lg" position="center">
          <div className="font-bold">Bạn có muốn dừng tính giờ và thanh toán đơn hàng này không?</div>
        </Modal>
      </div>
    </div>
  );
}

export default RoomView;
