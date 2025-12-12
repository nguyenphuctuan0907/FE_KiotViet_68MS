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
