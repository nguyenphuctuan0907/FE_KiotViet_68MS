import React from "react";
import Button from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: any;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  position?: "center" | "top" | "bottom";
  backdrop?: "opaque" | "blur" | "transparent";
  className?: string;
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, children, size = "md", position = "center", backdrop = "opaque", className = "", closeOnBackdropClick = true }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    xs: "max-w-xs",
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full",
  };

  const positionClasses = {
    center: "modal-middle",
    top: "modal-top",
    bottom: "modal-bottom",
  };

  const backdropClasses = {
    opaque: "backdrop-opacity-50 backdrop-brightness-50",
    blur: "backdrop-blur-sm",
    transparent: "",
  };

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className={`modal-backdrop ${backdropClasses[backdrop]}`} onClick={handleBackdropClick} />
      <div className={`modal-box ${sizeClasses[size]} ${positionClasses[position]} ${className}`}>
        {children}

        <div className="modal-action">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
          >
            Đồng ý
          </Button>
        </div>
      </div>
    </dialog>
  );
};

export default Modal;
