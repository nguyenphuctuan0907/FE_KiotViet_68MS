import { baseService } from "./axios/baseService";

interface PayOSResponse {
  amount: number;
  cancelUrl?: string;
  returnUrl?: string;
}

// services/userService.ts
export const payosService = {
  createPayment: Object.assign((data: PayOSResponse) => baseService.post("/payos/create-payment", data), { method: "POST" }),
};

export const boxsService = {
  getBoxs: Object.assign(() => baseService.get("/box"), { method: "GET" }),
  createBillUpsert: Object.assign((data: any) => baseService.post("/box/upsert-status", data), { method: "POST" }),
  changeBox: Object.assign((data: any) => baseService.put("/box/change-box", data), { method: "PUT" }),
};

export const priceService = {
  getPrices: Object.assign(() => baseService.get("/price"), { method: "GET" }),
};

export const dishService = {
  getDishs: Object.assign(() => baseService.get("/dish"), { method: "GET" }),
};

export const billDishService = {
  deleteBillDish: Object.assign((data: { dishId: number; boxId: number }) => baseService.delete("/billDish", data), { method: "DELETE" }),
};

export const billService = {
  updateStatusBill: Object.assign((data: { boxId: number; status: string }) => baseService.post("/bill", data), { method: "POST" }),
  finishedPayment: Object.assign((data: { boxId: number; total: number }) => baseService.post("/bill/payment", data), { method: "POST" }),
  cancelPayment: Object.assign((data: { boxId: number }) => baseService.put("/bill/payment", data), { method: "PUT" }),
  updateDiscountBill: Object.assign((data: { boxId: number }) => baseService.put("/bill/discount", data), { method: "PUT" }),
  clearDiscountBill: Object.assign((data: { boxId: number }) => baseService.put("/bill/discount/clear", data), { method: "PUT" }),
};
