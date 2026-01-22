import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useApi } from "../hooks/useApi";
import { billService } from "../service";
import dayjs from "../dayjs";
import Button from "./Button";
import Modal from "./Modal";
import {
  calculateDiscount,
  calculateHoursRounded,
  calculateMinutesRounded,
  calculatePrice,
} from "../common";

interface Bill {
  id: string;
  createdAt: Date;
  total: number;
  status: "PAID" | "UNPAID" | "CANCELLED";
  paymentMethod: "CASH" | "TRANSFER";
  box: {
    id: string;
    name: string;
  };
}

interface BillDetailRow {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const BillHistory: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [detailRows, setDetailRows] = useState<BillDetailRow[]>([]);

  const { callApi: getBills, data: bills = [], loading } =
    useApi<any>(billService.getBills);

  const {
    callApi: getBillById,
    data: billDetail,
    loading: loadingDetail,
  } = useApi<any>(billService.getBillById);

  useEffect(() => {
    fetchBills(selectedDate);
  }, []);

  const fetchBills = (date: Date) => {
    getBills({ date: dayjs(date).format("YYYY-MM-DD") });
  };

  const formatVN = (date?: string | Date) =>
    date
      ? new Date(date).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })
      : "";

  const exportBillsToExcel = (data: Bill[]) => {
    const excelData = data.map((bill, index) => ({
      STT: index + 1,
      "Thời gian": formatVN(bill.createdAt),
      Phòng: bill.box.name,
      "Tổng tiền": bill.total,
      "Phương thức":
        bill.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản",
      "Trạng thái":
        bill.status === "PAID" ? "Đã thanh toán" : "Chưa thanh toán",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");
    XLSX.writeFile(workbook, "lich_su_hoa_don.xlsx");
  };

  const openDetail = (billId: string) => {
    setIsOpen(true);
    getBillById(
      { id: billId },
      {
        onSuccess: (data: any) => {
          const rows: BillDetailRow[] = [];

          if (data?.priceRule) {
            const minutes = calculateMinutesRounded(data.start, data.end);
            const basePrice = data.priceRule.pricePerHour || 0;

            const finalPrice = data.discountType
              ? calculatePrice(
                  minutes,
                  calculateDiscount(
                    data.discountType,
                    data.discountType === "VND"
                      ? data.discountAmount || 0
                      : data.discountPercent || 0,
                    basePrice
                  )
                )
              : calculatePrice(minutes, basePrice);

            rows.push({
              name: data.priceRule.name,
              quantity: calculateHoursRounded(minutes),
              unitPrice: basePrice,
              totalPrice: finalPrice,
            });
          }

          data?.billdish?.forEach((d: any) => {
            rows.push({
              name: d.dish.name,
              quantity: d.quantity,
              unitPrice: d.dish.price,
              totalPrice: d.quantity * d.dish.price,
            });
          });

          setDetailRows(rows);
        },
      }
    );
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="bill-history p-4 space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Lịch sử hóa đơn</h1>

        <DatePicker
          selected={selectedDate}
          onChange={(d: any) => d && setSelectedDate(d)}
          dateFormat="dd/MM/yyyy"
          className="border px-2 py-1 rounded"
        />

        <Button onClick={() => fetchBills(selectedDate)}>Tìm kiếm</Button>

        <Button className="ml-auto" onClick={() => exportBillsToExcel(bills)}>
          Xuất file
        </Button>
      </div>

      {/* TABLE */}
      <table className="table w-full overflow-y-auto">
        <thead className="bg-gray-100">
          <tr>
            <th>#</th>
            <th>Thời gian</th>
            <th>Phòng</th>
            <th>Tổng tiền</th>
            <th>Phương thức</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {(bills || []).map((bill: Bill, i: number) => (
            <tr
              key={bill.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => openDetail(bill.id)}
            >
              <td>{i + 1}</td>
              <td className="italic text-green-600">
                {dayjs(bill.createdAt)
                  .tz("Asia/Ho_Chi_Minh")
                  .format("DD/MM/YYYY HH:mm")}
              </td>
              <td>{bill.box.name}</td>
              <td>{bill.total.toLocaleString("vi-VN")}đ</td>
              <td>
                {bill.paymentMethod === "CASH"
                  ? "Tiền mặt"
                  : "Chuyển khoản"}
              </td>
              <td>
                <span
                  className={`font-semibold ${
                    bill.status === "PAID"
                      ? "text-green-600"
                      : "text-orange-500"
                  }`}
                >
                  {bill.status === "PAID"
                    ? "Đã thanh toán"
                    : "Chưa thanh toán"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="4xl"
        position="center"
        cancelText="Đóng"
      >
        <h2 className="text-lg font-bold mb-4 text-black">✔️ Chi tiết hóa đơn</h2>

        {loadingDetail ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* INFO */}
            <div className="grid grid-cols-2 gap-4 p-4 text-gray-600 rounded bg-gray-100 shadow-sm mb-4">
              <div>
                <p>
                  <b>Mã hóa đơn:</b> SP{billDetail?.id}
                </p>
                <p>
                  <b>Phòng:</b> {billDetail?.box?.name}
                </p>
                <p>
                  <b>Giờ đến:</b> {formatVN(billDetail?.start)}
                </p>
              </div>
              <div>
                <p>
                  <b>Phương thức:</b>{" "}
                  {billDetail?.paymentMethod === "CASH"
                    ? "Tiền mặt"
                    : "Chuyển khoản"}
                </p>
                <p>
                  <b>Trạng thái:</b>{" "}
                  {billDetail?.status === "PAID"
                    ? "Đã thanh toán"
                    : "Chưa thanh toán"}
                </p>
                <p>
                  <b>Giờ out:</b> {formatVN(billDetail?.end)}
                </p>
              </div>
            </div>

            {/* DETAIL TABLE */}
            <table className="table w-full text-black shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th>Tên</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.quantity}</td>
                    <td>{row.unitPrice.toLocaleString("vi-VN")}đ</td>
                    <td>{row.totalPrice.toLocaleString("vi-VN")}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right mt-3">
              Tổng tiền: <strong>{billDetail?.total?.toLocaleString("vi-VN")}đ</strong>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
