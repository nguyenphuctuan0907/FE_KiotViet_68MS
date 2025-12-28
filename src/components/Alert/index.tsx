import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle, Info, AlertTriangle, XCircle, X } from "lucide-react"; // icon từ lucide-react

export type AlertType = "info" | "success" | "warning" | "error";
export type AlertPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";

export interface AlertProps {
  type?: AlertType;
  message?: string; // có thể truyền hoặc không
  closable?: boolean;
  position?: AlertPosition;
  duration?: number;
  id: number;
}

const defaultConfig: Record<AlertType, { message: string; icon: React.ReactNode }> = {
  info: { message: "Đây là thông báo thông tin.", icon: <Info size={20} /> },
  success: {
    message: "Yêu cầu thực hiện thành công!",
    icon: <CheckCircle size={20} />,
  },
  warning: { message: "Cảnh báo!", icon: <AlertTriangle size={20} /> },
  error: {
    message: "Đã có lỗi xảy ra. Vui lòng liên hệ quản trị viên.",
    icon: <XCircle size={20} />,
  },
};

const Alert: React.FC<AlertProps> = ({ type = "info", message, closable = true, position = "top-right", duration = 100000 }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const positionClasses: Record<AlertPosition, string> = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  // lấy message + icon
  const finalMessage = message || defaultConfig[type].message;
  const finalIcon = defaultConfig[type].icon;

  // Fade-in khi mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto close
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => setIsMounted(false), 300);
  };

  if (!isMounted && !isClosing) return null;

  // animation theo position
  const getAnimation = () => {
    if (position.includes("right")) {
      return isMounted && !isClosing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-5";
    }
    if (position.includes("left")) {
      return isMounted && !isClosing ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5";
    }
    if (position === "top-center") {
      return isMounted && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5";
    }
    if (position === "bottom-center") {
      return isMounted && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5";
    }
    return "";
  };

  return (
    <div className={clsx("fixed z-999 w-fit max-w-sm alert shadow-lg transform transition-all duration-300", type === "info" && "alert-info", type === "success" && "alert-success", type === "warning" && "alert-warning", type === "error" && "alert-error", positionClasses[position], getAnimation())}>
      <span>{finalIcon}</span>
      <div className="text-md font-semibold">{finalMessage}</div>
      {closable && (
        <span onClick={handleClose} className="cursor-pointer">
          <X size={16} />
        </span>
      )}
    </div>
  );
};

export default Alert;
