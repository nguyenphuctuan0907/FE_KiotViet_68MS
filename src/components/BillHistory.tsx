import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useApi } from "../hooks/useApi";
import { billService } from "../service";
import dayjs from "../dayjs";
import { DatePicker } from "react-datepicker";
import Button from "./Button";

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

export const BillHistory: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { callApi: apiGetBoxs, data: resBoxs, loading } = useApi<any>(billService.getBills);
  useEffect(() => {
    // Fetch bills from API
    apiGetBoxs({
      date: dayjs(new Date()).format("YYYY-MM-DD"),
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  console.log({ resBoxs });

  const onChangeTime = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      apiGetBoxs({
        date: dayjs(date).format("YYYY-MM-DD"),
      });
    }
  };

  const handleSearch = () => {
    if (selectedDate) {
      apiGetBoxs({
        date: dayjs(selectedDate).format("YYYY-MM-DD"),
      });
    }
  };

  const formatVN = (date?: string | Date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const exportBillsToExcel = (bills: Bill[]) => {
    const data = bills.map((bill, index) => ({
      STT: index + 1,
      "Thời gian": formatVN(bill.createdAt),
      Phòng: bill.box.name,
      "Tổng tiền": bill.total,
      "Phương thức": bill.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản",
      "Trạng thái": bill.status === "PAID" ? "Đã thanh toán" : "Chưa thanh toán",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

    XLSX.writeFile(workbook, "bills.xlsx");
  };

  return (
    <div className="bill-history">
      <h1 className="text-lg font-bold">
        Lịch sử hóa đơn
        <DatePicker selected={selectedDate} onChange={onChangeTime} className="text-green-600 cursor-pointer ml-2" dateFormat="dd/MM/yyyy" />
        <Button onClick={handleSearch}>Tìm kiếm</Button>
      </h1>
      <Button className="ml-auto" onClick={() => exportBillsToExcel(resBoxs)}>
        Xuất file
      </Button>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>THỜI GIAN</th>
            <th>PHÒNG</th>
            <th>TỔNG TIỀN</th>
            <th>PHƯƠNG THỨC</th>
            <th>TRẠNG THÁI</th>
          </tr>
        </thead>
        <tbody>
          {(resBoxs || []).map((bill: Bill, index: number) => (
            <tr key={bill.id}>
              <th>{index + 1}</th>
              <td>{dayjs(bill.createdAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")}</td>
              <td>{bill?.box?.name}</td>
              <td>{bill.total.toLocaleString("vi-VN")}đ</td>
              <td>{bill?.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}</td>
              <td>
                <label>{bill.status === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
