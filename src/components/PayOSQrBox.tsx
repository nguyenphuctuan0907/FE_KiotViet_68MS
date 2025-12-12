import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface PayOSQrBoxProps {
  checkoutUrl: string;
}

const PayOSQrBox: React.FC<PayOSQrBoxProps> = ({ checkoutUrl }) => {
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
        }}
      >
        <QRCodeCanvas value={checkoutUrl} size={200} level="H" includeMargin={false} style={{ borderRadius: 8 }} />
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Quét QR để thanh toán</div>
      </div>
    </div>
  );
};

export default PayOSQrBox;
