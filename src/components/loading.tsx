import React from "react";

interface TransparentLoadingProps {
  /** Text hiển thị */
  text?: string;
  /** Opacity của overlay (0-1) */
  opacity?: number;
  /** Màu nền */
  bgColor?: string;
  /** Hiệu ứng blur cho background */
  blurBackground?: boolean;
  /** Hiển thị backdrop filter */
  withBackdrop?: boolean;
  /** Kiểu loading */
  type?: "spinner" | "dots" | "ring" | "bars";
  /** Kích thước */
  size?: "sm" | "md" | "lg" | "xl";
  /** Màu loading */
  color?: string;
}

const TransparentLoading: React.FC<TransparentLoadingProps> = ({ opacity = 0.7, bgColor = "bg-base-100", blurBackground = false, withBackdrop = true, type = "spinner", size = "lg", color = "primary" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  const loadingClasses = {
    spinner: "loading-spinner",
    dots: "loading-dots",
    ring: "loading-ring",
    bars: "loading-bars",
  };

  const colorClasses: Record<string, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    white: "text-white",
    black: "text-black",
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${bgColor} transition-all duration-300`}
      style={{
        opacity,
        zIndex: 9999,
        backgroundColor: `rgba(var(--color-base-100) / ${opacity})`,
      }}
    >
      {/* Backdrop blur effect */}
      {withBackdrop && <div className={`absolute inset-0 ${blurBackground ? "backdrop-blur-sm" : ""}`} style={{ opacity: 0.5 }} />}

      {/* Loading content */}
      <div className={`relative z-10 flex flex-col items-center justify-center p-8 rounded-2xl ${blurBackground ? "bg-base-100 bg-opacity-30" : "bg-base-100 bg-opacity-20"} backdrop-blur-md border border-base-300 border-opacity-30 shadow-2xl`}>
        {/* Loading animation */}
        <div className={`loading ${loadingClasses[type]} ${sizeClasses[size]} ${colorClasses[color] || colorClasses.primary}`}></div>
      </div>
    </div>
  );
};

export default TransparentLoading;
