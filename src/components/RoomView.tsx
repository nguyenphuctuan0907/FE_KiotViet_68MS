// RoomView.tsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Search, ShoppingCart, Bell, Pause, SkipForward, TrashIcon } from "lucide-react";
import { calculateHoursRounded, calculateMinutesRounded, calculatePrice, debounce, getActiveAndNextRules, groupByType, swapObjectsInPlace, type Rule } from "../common";
import { useRobustSocket } from "../hooks/useSocket";
import Modal from "./Modal";
import { useApi } from "../hooks/useApi";
import { billDishService, billService, boxsService, dishService, payosService, priceService } from "../service";
import PayOSQrBox from "./PayOSQrBox";
import Button from "./Button";
import { useAlert } from "../hooks/useAlert";
import Loading from "./loading";
import { useStateRef } from "../hooks/useStateRef";

interface Room {
  id: number;
  name: string;
  using?: boolean;
  total?: number;
  minutes?: number;
  start?: Date;
  end?: Date;
  orders?: Order[];
  priceRule?: Rule;
  qrCodeUrl?: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  billStatus: "DRAFT" | "RUNNING" | "PAID" | "PAYING" | "CANCELED" | null;
  discountType?: "VND" | "PERCENT";
  discountAmount?: number;
  discountPercent?: number;
}

interface Order {
  id: number;
  name: string;
  price: number;
  value?: number;
  total?: number;
  quantity?: number;
  dishId?: number;
}

function RoomView() {
  const { socket, isConnected } = useRobustSocket({
    url: import.meta.env.VITE_URL_SOCKET || "https://d23e55d4cc33.ngrok-free.app",
    heartbeatInterval: 30000, // 30 giây
    maxReconnectAttempts: 20,
  });
  const visibilityRef = useRef(!document.hidden);

  const [rooms, setRooms, roomsRef] = useStateRef<Room[]>([]);
  const [timeMinute, setTimeMinute] = useState<number | Date>(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomDiscount, setRoomDiscount] = useState<Room | null>(null);
  const [newTotalDiscount, setNewTotalDiscount] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenDelete, setIsOpenDelete] = useState<boolean>(false);
  const [itemDelete, setItemDelete] = useState<Order | null>(null);
  const [openPopupDiscount, setOpenPopupDiscount] = useState<boolean>(false);
  const [type, setType] = useState<"VND" | "PERCENT">("VND");

  const showAlert = useAlert();

  const { callApi: apiCreatePaymentTransfer, data: resPaymentTransfer, loading: loadingTransfer } = useApi<any>(payosService.createPayment);
  const { callApi: apiGetBoxs, data: resBoxs } = useApi<any>(boxsService.getBoxs);
  const { callApi: apiGetDishs, data: resDishs } = useApi<any>(dishService.getDishs);
  const { callApi: apiGetPrices, data: resPrices } = useApi<any>(priceService.getPrices);
  const { callApi: apiCreateBill } = useApi<any>(boxsService.createBillUpsert);
  const { callApi: apiDeleteBillDish } = useApi<any>(billDishService.deleteBillDish);
  const { callApi: apiUpdateBillStatus } = useApi<any>(billService.updateStatusBill);
  const { callApi: apiFnishedPaymentCash, loading: loadingPaymentCash } = useApi<any>(billService.finishedPayment);
  const { callApi: apiCancelPayment } = useApi<any>(billService.cancelPayment);
  const { callApi: apiUpdateDiscountBill } = useApi<any>(billService.updateDiscountBill);
  const { callApi: apiClearDiscountBill, loading: loadingClearDiscountBill } = useApi<any>(billService.clearDiscountBill);
  const { callApi: apiChangeBox, loading: loadingChangeBox } = useApi<any>(boxsService.changeBox);

  const debouncedAddDish = useMemo(() => debounce((params: any, options) => apiCreateBill(params, options), 1000), []);
  const debouncedDeleteBillDish = useMemo(() => debounce((params: any, options) => apiDeleteBillDish(params, options), 1000), []);
  const debouncedUpdateBillStatus = useMemo(() => debounce((params: any) => apiUpdateBillStatus(params), 1000), []);
  const debouncedfinshedPaymentCash = useMemo(() => debounce((params: any, options) => apiFnishedPaymentCash(params, options), 1000), []);
  const debouncedCreatePaymentTransfer = useMemo(() => debounce((params: any) => apiCreatePaymentTransfer(params), 1000), []);
  const debouncedChangeBox = useMemo(() => debounce((params: any, options) => apiChangeBox(params, options), 1000), []);
  const debouncedUpdateDiscountBill = useMemo(() => debounce((params: any, options) => apiUpdateDiscountBill(params, options), 1000), []);

  const existRoom = selectedRoom ? rooms.find((room) => room.id === selectedRoom.id) : null;
  const orders = groupByType(resDishs);

  useEffect(() => {
    const onVisibility = () => {
      visibilityRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    console.log("Connection status:", isConnected ? "✅ Connected" : "❌ Disconnected");
  }, [isConnected]);

  useEffect(() => {
    async function run() {
      await apiGetBoxs();
      await apiGetPrices();
      await apiGetDishs();
    }
    setTimeMinute(Date.now());
    run();
  }, []);

  function buildBillInfo(bill: any, timeMinute: number | Date) {
    let totalDish = 0;

    const orders =
      bill?.billdish?.map((item: any) => {
        const total = Number(item.price) * Number(item.quantity);
        totalDish += total;

        return {
          ...item,
          name: item.dish?.name,
          total,
        };
      }) || [];

    let minutes = 0;
    let priceTotal = 0;

    if (["RUNNING", "PAYING"].includes(bill.status)) {
      const startMs = typeof bill.start === "number" ? bill.start : new Date(bill.start).getTime();

      const endMs = bill.end ? new Date(bill.end).getTime() : typeof timeMinute === "number" ? timeMinute : timeMinute.getTime();

      minutes = calculateMinutesRounded(startMs, endMs);

      if (bill.discountType) {
        priceTotal = calculatePrice(minutes, caculateDiscount(bill.discountType, bill.discountType === "VND" ? bill.discountAmount || 0 : bill.discountPercent || 0, bill.priceRule?.pricePerHour || 0));
      } else {
        priceTotal = calculatePrice(minutes, bill.priceRule?.pricePerHour || 0);
      }
    }

    return {
      orders,
      minutes,
      total: totalDish + priceTotal,
      priceRule: bill.priceRule ? { ...bill.priceRule, total: priceTotal } : null,
      totalDish,
    };
  }

  useEffect(() => {
    if (!Array.isArray(resBoxs)) return;

    const mappedRooms = resBoxs.map((box) => {
      const bill = box.bill?.[0];
      if (!bill) return box;

      const billInfo = buildBillInfo(bill, timeMinute);

      return {
        ...box,
        using: box.status === "OCCUPIED",
        start: bill.start,
        end: bill.end,
        billStatus: bill.status,
        qrCodeUrl: bill.qrCodeUrl,
        priceRule: billInfo.priceRule,
        orders: billInfo.orders,
        minutes: billInfo.minutes,
        total: billInfo.total,
        discountType: bill.discountType,
        discountAmount: bill.discountAmount,
        discountPercent: bill.discountPercent,
      };
    });

    setRooms(mappedRooms);
  }, [resBoxs]);

  useEffect(() => {
    if (resPaymentTransfer?.qrCode) {
      const boxId = Math.floor(resPaymentTransfer.orderCode / 1_000_000);
      const existRoom = rooms.find((room) => room.id === boxId);
      if (existRoom) {
        existRoom.qrCodeUrl = resPaymentTransfer.qrCode;
        setRooms([...rooms]);
      }
    }
  }, [resPaymentTransfer]);

  useEffect(() => {
    setRooms((prevRooms: any) =>
      prevRooms.map((room: Room) => {
        if (!room.using || !room.start) return room;

        const startMs = typeof room.start === "number" ? room.start : new Date(room.start).getTime();

        const endMs = room.end ? new Date(room.end).getTime() : typeof timeMinute === "number" ? timeMinute : timeMinute.getTime();

        const minutes = calculateMinutesRounded(startMs, endMs);

        let pricePerHour = room.priceRule?.pricePerHour || 0;
        if (room.discountType) {
          pricePerHour = caculateDiscount(room.discountType, room.discountType === "VND" ? room.discountAmount || 0 : room.discountPercent || 0, pricePerHour);
        }
        const priceTotal = calculatePrice(minutes, pricePerHour);

        const orderTotal = room.orders?.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) || 0;

        return {
          ...room,
          minutes,
          priceRule: room.priceRule ? { ...room.priceRule, total: priceTotal } : null,
          total: priceTotal + orderTotal,
        };
      })
    );
  }, [timeMinute]);

  useEffect(() => {
    if (!socket) return;
    const minuteHandler = (msg: number) => {
      setTimeMinute(msg);
    };

    const paymentStatusHandle = (data: any) => {
      // thông báo, clear form
      if (data.status) {
        const room = roomsRef.current.find((room) => room.id === data.boxId);
        if (!room) return;
        clearBox(room);
        setRooms([...roomsRef.current]);
        showAlert({
          type: "success",
          message: "Thanh toán thành công",
        });
      }
    };

    socket.on("minute_tick", minuteHandler);
    socket.on("payment_status", paymentStatusHandle);

    return () => {
      socket.off("minute_tick", minuteHandler);
      socket.off("payment_status", paymentStatusHandle);
    };
  }, [socket]);

  const handleClickOrder = (order: Order) => {
    if (!selectedRoom) return;

    const newOrder = { ...order };

    const findRoom = existRoom;
    if (!findRoom) return;

    if (findRoom.orders) {
      const existingOrder = findRoom.orders.find((o) => o.name === order.name);
      if (existingOrder) {
        existingOrder.quantity = (existingOrder.quantity || 0) + 1;
        existingOrder.total = (existingOrder.quantity || 0) * existingOrder.price;
      } else {
        newOrder.quantity = 1;
        newOrder.total = newOrder.price;
        findRoom.orders.push(newOrder);
      }
    } else {
      newOrder.quantity = 1;
      newOrder.total = newOrder.price;
      findRoom.orders = [newOrder];
      findRoom.using = true;
    }

    findRoom.total = (findRoom.total || 0) + (newOrder.total || newOrder.price);

    setRooms([...rooms]);

    debouncedAddDish(
      {
        boxId: selectedRoom.id,
        orders: findRoom.orders,
      },
      {
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu
          showAlert({
            type: "error",
            message: "Thêm đồ không thành công. Vui lòng thử lại.",
          });
        },
      }
    );
  };

  const handleOnChangeInput = (order: Order, value: string, roomId: number) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;
    const findRoom = rooms.find((room) => room.id === roomId);
    if (!findRoom?.orders) return;

    const existOrder = findRoom.orders.find((o) => o.name === order.name);
    if (existOrder) {
      if (numValue === 0) {
        findRoom.orders = findRoom.orders.filter((o) => o.name !== order.name);
      } else {
        existOrder.quantity = numValue;
        existOrder.total = numValue * existOrder.price;
      }
    }

    findRoom.total = findRoom.orders.reduce((sum: number, o: Order) => sum + (o.total || 0), 0) + (findRoom.priceRule?.total || 0);

    setRooms([...rooms]);

    debouncedAddDish(
      {
        boxId: roomId,
        orders: findRoom.orders,
      },
      {
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu
          showAlert({
            type: "error",
            message: "Thêm đồ không thành công. Vui lòng thử lại.",
          });
        },
      }
    );
  };

  const handleClickActiveRule = async (rule: Rule) => {
    if (!selectedRoom) return;

    const roomsUpdateStatus: Room[] = rooms.map((room: Room) => {
      if (room.id === selectedRoom.id) {
        room.using = true;
        const start = room.start || new Date();
        room.start = typeof start === "number" ? new Date(start) : start;

        const minutes = calculateMinutesRounded(typeof room.start === "number" ? room.start : new Date(room.start).getTime(), typeof timeMinute === "number" ? timeMinute : timeMinute.getTime());

        rule.total = calculatePrice(minutes, rule.pricePerHour);
        room.priceRule = rule;
        room.total = room.orders ? rule.total + room.orders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) : rule.total;
      }

      return room;
    });

    setRooms(roomsUpdateStatus);

    apiCreateBill(
      {
        boxId: selectedRoom.id,
        minutes: 0,
        total: 0,
        start: new Date(),
        boxPriceId: rule.id,
      },
      {
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu
          showAlert({
            type: "error",
            message: "Thêm giờ không thành công. Vui lòng thử lại.",
          });
        },
      }
    );
  };

  const handleClickOpenPopupPayment = (selectedRoom: Room) => {
    if (!selectedRoom.id) return;
    if (!existRoom) return;
    if (existRoom.using) {
      setIsOpen(true);
    } else {
      showAlert({
        type: "warning",
        message: "Vui lòng chọn thực đơn để thanh toán.",
      });
    }
  };

  const onClickConfirmDelete = (order: Order) => {
    setIsOpenDelete(true);
    setItemDelete(order);
  };

  const handleConfirm = () => {
    setIsOpen(false);

    if (!selectedRoom) return;
    if (!existRoom) return;

    existRoom.billStatus = "PAYING";
    existRoom.end = new Date(timeMinute);

    setRooms([...rooms]);

    debouncedUpdateBillStatus({
      boxId: existRoom.id,
      data: {
        status: "PAYING",
      },
    });
  };

  function clearBox(room: Room) {
    room.start = undefined;
    room.end = undefined;
    room.minutes = 0;
    room.status = "AVAILABLE";
    room.using = false;
    room.total = 0;
    room.priceRule = undefined;
    room.orders = undefined;
    room.billStatus = null;
    room.qrCodeUrl = undefined;
    room.discountAmount = undefined;
    room.discountPercent = undefined;
    room.discountType = undefined;
  }

  const handleConfirmCash = async (type: string) => {
    const room = rooms.find((room) => room.id === selectedRoom?.id);
    if (!room) return;
    const total = room.total;

    debouncedfinshedPaymentCash(
      {
        boxId: room.id,
        total,
        paymentMethod: type,
      },
      {
        onSuccess: () => {
          clearBox(room);
          setRooms([...rooms]);
          showAlert({
            type: "success",
            message: `Thanh toán thành công ${total?.toLocaleString("vi-VN")} VNĐ`,
          });
        },
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu

          showAlert({
            type: "error",
            message: `Thanh toán không thành công ${total?.toLocaleString("vi-VN")} VNĐ`,
          });
        },
      }
    );
  };

  const handleConfirmDelete = async () => {
    const room = rooms.find((room) => room.id === selectedRoom?.id);
    if (!room) return;
    let isAvailable = false;
    if (room.orders) {
      const filterOrder = room.orders.filter((order) => order.name !== itemDelete?.name);
      room.orders = filterOrder;
      const totalOrder = room.orders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
      room.total = (room.priceRule?.total || 0) + totalOrder;

      if (room.orders.length === 0 && (!room.priceRule || Object.keys(room.priceRule).length === 0)) {
        isAvailable = true;
        room.status = "AVAILABLE";
        room.using = false;
      }
    }

    setRooms([...rooms]);
    setIsOpenDelete(false);
    setItemDelete(null);

    debouncedDeleteBillDish(
      {
        boxId: selectedRoom?.id,
        dishId: itemDelete?.dishId || itemDelete?.id,
        isAvailable,
      },
      {
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu
          showAlert({
            type: "error",
            message: "Xóa đồ không thành công. Vui lòng thử lại.",
          });
        },
      }
    );
  };

  const handleClickCancelPayment = (selectedRoom: Room) => {
    const room = rooms.find((room) => room.id === selectedRoom?.id);
    if (!room) return;
    if (room.billStatus === "PAYING") {
      room.end = undefined;
      room.billStatus = room.priceRule?.id ? "RUNNING" : "DRAFT";
      room.qrCodeUrl = undefined;

      setRooms([...rooms]);

      apiCancelPayment(
        {
          boxId: room.id,
        },
        {
          onError: async () => {
            await apiGetBoxs(); // reload dữ liệu
            showAlert({
              type: "error",
              message: "Hủy thanh toán không thành công. Vui lòng thử lại.",
            });
          },
        }
      );
    }
  };

  const handleClickTransfer = async () => {
    const room = rooms.find((room) => room.id === selectedRoom?.id);
    if (!room) return;
    if (!room.qrCodeUrl) {
      debouncedCreatePaymentTransfer({
        amount: room.total || 0,
        cancelUrl: "",
        returnUrl: "",
        boxId: room.id,
      });
    }
  };

  const handleRecreateQr = () => {
    const room = rooms.find((room) => room.id === selectedRoom?.id);
    if (!room) return;
    apiCreatePaymentTransfer({
      amount: room.total || 0,
      cancelUrl: "",
      returnUrl: "",
      boxId: room.id,
    });
  };

  const handleChangeBox = (e: any) => {
    const roomId = Number(e.target.value);
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !selectedRoom?.id) return;

    debouncedChangeBox(
      {
        currentBoxId: selectedRoom.id,
        newBoxId: roomId,
      },
      {
        onSuccess: () => {
          const currentRoom = rooms.find((r) => r.id === selectedRoom.id);
          if (!currentRoom) return;
          swapObjectsInPlace(currentRoom, room, ["using", "end", "minutes", "orders", "priceRule", "qrCodeUrl", "start", "status", "total", "discountAmount", "discountPercent", "discountType", "billStatus"]);
          setRooms([...rooms]);
          setSelectedRoom(room);
          showAlert({
            type: "success",
            message: `Chuyển phòng thành công`,
          });
        },
        onError: (error: any) => {
          showAlert({
            type: "error",
            message: `Chuyển phòng thất bại ${error?.message}`,
          });
        },
      }
    );
  };

  const handleClickDiscount = (roomId: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !room.priceRule) return;

    setRoomDiscount(room);
    setOpenPopupDiscount(true);
  };

  const caculateDiscount = (type: "VND" | "PERCENT", numValue: number, pricePerHour: number) => {
    let newTotal = 0;
    if (type === "VND") {
      newTotal = Math.max(0, (pricePerHour || 0) - numValue);
    } else {
      newTotal = Math.max(0, (pricePerHour || 0) * (1 - numValue / 100));
    }

    return newTotal;
  };

  const onClosePopupDiscount = () => {
    setOpenPopupDiscount(false);
    setType("VND");
    setDiscountValue(0);
    setNewTotalDiscount(0);
  };

  const handleChangeDiscountValue = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setDiscountValue(numValue);
    if (roomDiscount?.priceRule?.pricePerHour !== undefined) {
      setNewTotalDiscount(caculateDiscount(type, numValue, roomDiscount.priceRule.pricePerHour));
    }
  };

  const handleChangeTypeDiscount = (discountType: "VND" | "PERCENT") => {
    setNewTotalDiscount(caculateDiscount(discountType, discountValue, roomDiscount?.priceRule?.pricePerHour || 0));
    setType(discountType);
  };

  const handleConfirmChangeDiscount = () => {
    if (!roomDiscount || !roomDiscount.priceRule) return;
    const room = rooms.find((r) => r.id === roomDiscount.id);
    if (!room) return;
    if (discountValue <= 0) return;
    room.discountType = type;
    room.discountAmount = type === "VND" ? Number(discountValue) : 0;
    room.discountPercent = type === "PERCENT" ? Number(discountValue) : 0;

    debouncedUpdateDiscountBill(
      {
        boxId: room.id,
        discountType: type,
        discountAmount: room.discountAmount || 0,
        discountPercent: room.discountPercent || 0,
      },
      {
        onSuccess: () => {
          const minutes = calculateMinutesRounded(typeof room.start === "number" ? room.start : new Date(room.start || 0).getTime(), typeof timeMinute === "number" ? timeMinute : timeMinute.getTime());
          const totalPrice = calculatePrice(minutes, newTotalDiscount);
          room.priceRule && (room.priceRule.total = totalPrice);

          room.total = (totalPrice || 0) + (room.orders ? room.orders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) : 0);
          setRooms([...rooms]);
          onClosePopupDiscount();
          showAlert({
            type: "success",
            message: "Cập nhật giảm giá thành công",
          });
          return;
        },
        onError: () => {
          showAlert({
            type: "error",
            message: "Cập nhật giảm giá thất bại",
          });
        },
      }
    );
  };

  const currentDiscountType = existRoom?.discountType ?? type ?? "VND";

  const handleClickClearDiscount = () => {
    if (!existRoom) return;
    apiClearDiscountBill(
      {
        boxId: existRoom?.id,
      },
      {
        onSuccess: () => {
          const room = rooms.find((r) => r.id === existRoom.id);
          if (!room) return;
          room.discountType = undefined;
          room.discountAmount = undefined;
          room.discountPercent = undefined;
          const minutes = calculateMinutesRounded(typeof room.start === "number" ? room.start : new Date(room.start || 0).getTime(), typeof timeMinute === "number" ? timeMinute : timeMinute.getTime());
          const priceTotal = calculatePrice(minutes, room.priceRule?.pricePerHour || 0);
          room.priceRule && (room.priceRule!.total = priceTotal);
          room.total = (priceTotal || 0) + (room.orders ? room.orders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) : 0);
          setRooms([...rooms]);
          showAlert({
            type: "success",
            message: "Xóa giảm giá thành công",
          });
        },
        onError: async () => {
          await apiGetBoxs(); // reload dữ liệu
          showAlert({
            type: "error",
            message: "Xóa giảm giá không thành công. Vui lòng thử lại.",
          });
        },
      }
    );
  };

  return (
    <div>
      {loadingPaymentCash && <Loading />}
      <div className="w-screen h-screen flex text-red-800 select-none">
        <div className="w-3/5 border-r">
          <div className="tabs tabs-lift h-full bg-[#f4f7fc] ">
            <input type="radio" name="my_tabs" role="tab" className="tab checked:bg-blue-600 checked:text-white font-bold text-lg" aria-label="🌟 Phòng bàn" defaultChecked />
            <div className="tab-content bg-[#f4f7fc] border-base-300 p-6">
              <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto ">
                {rooms.map((room) => (
                  <div key={room.id} onClick={() => setSelectedRoom(room)} className={`cursor-pointer h-24 rounded-2xl border relative flex flex-col items-center justify-end shadow-sm transition hover:shadow-lg ${selectedRoom?.id === room.id ? "bg-blue-500 text-white border-blue-600" : room.using ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-300"}`}>
                    {room.using && (
                      <div className="absolute top-2 text-[10px] font-medium opacity-90">
                        {room.start && (
                          <div className="flex gap-6">
                            <span>
                              💰<span className="text-sm">{room.total?.toLocaleString()}</span>đ
                            </span>
                            <span>
                              🕐<span className="text-sm">{room.minutes}</span>m
                            </span>
                          </div>
                        )}
                        {(room.orders?.length ?? 0) > 0 && (
                          <div className="flex gap-6">
                            <span>
                              🍽️ <span className="text-sm font-light">{room.orders?.length}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-sm font-semibold items-end pb-3">
                      {room.using && room.start && "🕒"}
                      {room.name.toLocaleUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <input type="radio" name="my_tabs" role="tab" className="tab checked:bg-blue-600 checked:text-white font-bold text-lg" aria-label="🥂 Thực đơn" />
            <div className="tab-content border-base-300 p-6">
              <div className="tabs tabs-lift h-full">
                <input type="radio" name="my_tabs_3" className="tab checked:bg-blue-500 checked:text-white font-bold text-sm" aria-label="⌛ Giá giờ hát" defaultChecked />

                <div className="tab-content border-base-300 p-6">
                  <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto ">
                    {resPrices &&
                      getActiveAndNextRules(resPrices).active.map((rule: Rule) => (
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
                <input type="radio" name="my_tabs_3" className="tab checked:bg-blue-500 checked:text-white font-bold text-sm" aria-label="🍶 Chọn món" />
                <div className="tab-content border-amber-500 p-6 overflow-y-auto h-[800px]">
                  <div className="">
                    {Object.entries(orders).map(([type, items]) => (
                      <div key={type} className="menu-category">
                        <h2 className="text-lg font-bold">{type === "DRINK" ? "Đồ uống" : type === "FOOD" ? "Đồ ăn" : type === "SNACK" ? "Đồ ăn nhanh" : type}</h2>
                        <div className="grid grid-cols-7 gap-4 p-4 overflow-y-auto">
                          {items.map((item, index) => (
                            <div key={`${type}-${index}`} className="cursor-pointer h-42 rounded-2xl relative flex flex-col items-center justify-center shadow-sm transition hover:shadow-lg" onClick={() => handleClickOrder(item)}>
                              <img className="h-28 w-32" src={`/public/BANH_TRANG.jpg`} alt="" />
                              <p className="text-sm font-semibold mb-1">{item.price.toLocaleString("vi-VN")}</p>
                              <h3 className="text-sm font-semibold text-cyan-700">{item.name}</h3>
                            </div>
                          ))}
                        </div>
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
              <ShoppingCart size={35} />
              {selectedRoom ? (
                <select value={selectedRoom.id ?? ""} disabled={selectedRoom.billStatus === "PAYING" || !selectedRoom.using} className="select select-primary cursor-pointer" onChange={handleChangeBox}>
                  {rooms.map((room: Room) => (
                    <option key={room.id} disabled={room.using} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              ) : (
                "Chưa chọn phòng"
              )}
              {loadingChangeBox && (
                <div className="relative">
                  <span className="loading loading-spinner loading-sm absolute bg-amber-700 right-0 mr-4.5 -mt-2.5"></span>
                </div>
              )}
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
              <div className="h-[850px] overflow-y-auto">
                <div>
                  {existRoom?.priceRule && (
                    <div key={existRoom?.priceRule?.id} className="w-full px-4 py-2 border-b text-black mt-3">
                      <div className="flex justify-between items-center">
                        <div className="font-bold ">{existRoom?.priceRule?.name}</div>
                        <div className="flex items-center gap-1 border-2 p-2 rounded-2xl">
                          <span className="cursor-pointer">{existRoom?.end ? <SkipForward size={16} strokeWidth={2.5} /> : <Pause size={16} strokeWidth={2.5} />}</span>
                          <span className="font-bold ml-4">{calculateHoursRounded(existRoom?.minutes ?? 0)}</span>
                        </div>
                        <div className="font-semibold p-2 cursor-pointer indicator text-end">
                          {existRoom?.discountType && (
                            <span className="indicator-item badge border-2 border-amber-400">
                              {loadingClearDiscountBill && <span className="loading loading-spinner loading-xs absolute bg-amber-700"></span>}

                              {existRoom?.discountType === "VND" ? `${existRoom?.discountAmount?.toLocaleString()}đ` : `${existRoom?.discountPercent}%`}
                              <span className="absolute -top-2.5 -right-2.5 bottom-12 bg-amber-300 h-full rounded-full" onClick={() => handleClickClearDiscount()}>
                                ❌
                              </span>
                            </span>
                          )}
                          <div className="place-items-center border-2 rounded-2xl p-2" onClick={() => handleClickDiscount(selectedRoom.id)}>
                            <span
                              style={{
                                textDecoration: existRoom?.discountType ? "line-through" : "none",
                              }}
                            >
                              {existRoom?.priceRule?.pricePerHour.toLocaleString()}đ
                            </span>
                            {existRoom?.discountType && <span> ➡️ {caculateDiscount(existRoom?.discountType || "VND", existRoom?.discountType === "VND" ? existRoom?.discountAmount || 0 : existRoom?.discountPercent || 0, existRoom?.priceRule?.pricePerHour || 0).toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="font-semibold">{existRoom?.priceRule?.total?.toLocaleString()}đ</div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  {rooms
                    .find((room) => room.id === selectedRoom.id)
                    ?.orders?.map((order: Order) => {
                      return (
                        <div key={`${order.id}`} className="w-full px-4 py-2 border-b text-black">
                          <div className="flex justify-between items-center">
                            <div className="font-bold ">{order.name}</div>
                            <div className="mt-4">
                              <input type="number" className="input validator text-red-500" required placeholder="Type a number" min="1" title="Must be number" value={order.quantity || 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOnChangeInput(order, e.currentTarget.value, selectedRoom.id)} />
                              <p className="validator-hint">Must be number</p>
                            </div>

                            <div className="font-semibold">{order.price.toLocaleString()}đ</div>
                            <div className="relative group w-24 text-right">
                              {/* Total */}
                              <span className="font-semibold transition-opacity duration-200 group-hover:opacity-0">{(order.total || 0).toLocaleString()}đ</span>

                              {/* Delete icon */}
                              <button
                                onClick={() => onClickConfirmDelete(order)}
                                className="absolute inset-0 flex items-center justify-end opacity-0 
                   group-hover:opacity-100 transition-opacity duration-200
                   text-red-500 hover:text-red-700 hover:cursor-pointer"
                              >
                                <TrashIcon size={34} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div>
                  {existRoom?.billStatus === "PAYING" && (
                    <div>
                      {/* Hiển thị QR */}
                      <div className="tabs tabs-border">
                        <input type="radio" name="my_tabs_2" className="tab text-blue-600 font-bold" aria-label="Tiền mặt" defaultChecked />
                        <div className="tab-content p-5">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              handleConfirmCash("CASH");
                            }}
                            className="font-bold"
                          >
                            Hoàn tất thanh toán
                          </Button>
                        </div>

                        <input type="radio" name="my_tabs_2" className="tab text-blue-600 font-bold" aria-label="Chuyển khoản" onClick={() => handleClickTransfer()} />
                        <div className="tab-content p-5 relative">
                          <PayOSQrBox loading={loadingTransfer} checkoutUrl={existRoom?.qrCodeUrl || ""} />
                          {existRoom?.qrCodeUrl && (
                            <div>
                              <div>
                                <Button onClick={handleRecreateQr}>Tạo lại mã QR</Button>
                                <span> Nếu bạn thay đổi số lượng order hoặc lỗi tạo mã.</span>
                              </div>
                              <div className="mt-16">
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    handleConfirmCash("TRANSFER");
                                  }}
                                  className="font-bold"
                                >
                                  Hoàn tất thanh toán
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              "Chưa có món trong đơn"
            )}
          </div>

          <div className="border-t p-4 flex justify-between items-center bg-white shadow-lg mt-auto">
            <div className="text-lg font-bold">Tổng tiền: {selectedRoom ? existRoom?.total?.toLocaleString() : "0"}đ</div>
            <button onClick={() => selectedRoom && (rooms.find((room) => room.id === selectedRoom?.id)?.billStatus === "PAYING" ? handleClickCancelPayment(selectedRoom) : handleClickOpenPopupPayment(selectedRoom))} className="px-6 py-4 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition cursor-pointer font-bold">
              {rooms.find((room) => room.id === selectedRoom?.id)?.billStatus === "PAYING" ? "Huỷ thanh toán" : "Thanh toán"}
            </button>
          </div>
        </div>

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConfirm={handleConfirm} size="lg" position="center">
          <div className="font-bold">Bạn có muốn dừng tính giờ và thanh toán đơn hàng này không?</div>
        </Modal>

        <Modal isOpen={isOpenDelete} onClose={() => setIsOpenDelete(false)} onConfirm={handleConfirmDelete} size="lg" position="center">
          <div className="font-bold">Bạn có muốn xóa đơn hàng này không?</div>
        </Modal>

        <Modal isOpen={openPopupDiscount} onClose={onClosePopupDiscount} onConfirm={handleConfirmChangeDiscount} size="lg" position="center">
          <div className="w-full font-bold text-lg">
            <h1 className="mb-4 text-xl text-purple-900">
              {roomDiscount?.priceRule?.name} / {roomDiscount?.priceRule?.dayType === "WEEKEND" ? "T7-CN" : "Ngày thường"}
            </h1>
            <div className="flex items-center justify-between">
              <label>Giá bán</label>
              <input type="text" value={roomDiscount?.priceRule?.pricePerHour?.toLocaleString() || "0"} className="input text-end text-xl" disabled />
            </div>
            <div className="flex items-center justify-between mt-2 mb-2">
              <label>Giảm giá</label>
              <div className="join flex items-center">
                <div className="mb-2">
                  <input type="radio" name="discountType" className="join-item btn btn-md" aria-label="VND" checked={currentDiscountType === "VND"} onChange={() => handleChangeTypeDiscount("VND")} />
                  <input type="radio" name="discountType" className="join-item btn btn-md" aria-label="%" checked={currentDiscountType === "PERCENT"} onChange={() => handleChangeTypeDiscount("PERCENT")} />
                </div>
                <div className="w-53 mt-5">
                  <input type="number" className="input validator" defaultValue={existRoom?.discountAmount || existRoom?.discountPercent} min="1" title="Chỉ nhập số lơn hơn 0" placeholder={type === "VND" ? "Nhập số tiền" : "Nhập %"} onChange={(e) => handleChangeDiscountValue(e.target.value)} />
                  <p className="validator-hint">Chỉ nhập số lơn hơn 0</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label>Giá mới</label>
              <input type="text" value={newTotalDiscount?.toLocaleString() || "0"} className="input text-end text-xl" disabled />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default RoomView;
