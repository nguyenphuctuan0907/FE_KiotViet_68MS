import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface PayOSQrBoxProps {
  checkoutUrl: string;
  loading?: boolean;
}

const PayOSQrBox: React.FC<PayOSQrBoxProps> = ({ checkoutUrl, loading }) => {
  return (
    <div
      style={{
        width: 280,
        padding: 20,
        background: "#F5F7FA",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {loading && <span className="loading loading-spinner loading-xl text-secondary absolute self-center"></span>}
        {checkoutUrl && <QRCodeCanvas value={checkoutUrl} size={200} level="H" includeMargin={false} style={{ borderRadius: 8 }} />}
      </div>
    </div>
  );
};

export default PayOSQrBox;
