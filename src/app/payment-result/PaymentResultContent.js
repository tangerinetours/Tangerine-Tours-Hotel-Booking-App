"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentResultContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Completing your payment...");
  const [orderRef, setOrderRef] = useState("");

  useEffect(() => {
    const orderId      = sessionStorage.getItem("mpgs_order_id");
    const transactionId = sessionStorage.getItem("mpgs_transaction_id") || "1";
    const sessionId    = sessionStorage.getItem("mpgs_session_id");
    const amount       = sessionStorage.getItem("mpgs_amount");

    setOrderRef(orderId || "");

    if (!orderId || !sessionId) {
      setStatus("failed");
      setMessage("Session expired or payment data missing. Please try again.");
      return;
    }

    fetch("/api/capture-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, transactionId, sessionId, amount }),
    })
      .then((r) => r.json())
      .then((data) => {
        sessionStorage.removeItem("mpgs_order_id");
        sessionStorage.removeItem("mpgs_transaction_id");
        sessionStorage.removeItem("mpgs_session_id");
        sessionStorage.removeItem("mpgs_amount");

        if (data.success) {
          setStatus("success");
          setMessage("Your payment was successful! Your booking is confirmed.");
        } else {
          setStatus("failed");
          setMessage(`Payment not completed. Code: ${data.gatewayCode || "Unknown"}. Please contact support.`);
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("A network error occurred. Please contact support.");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      {status === "processing" && (
        <>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <h2>Completing Payment...</h2>
          <p style={{ color: "#666" }}>Please do not close this page.</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ color: "#2e7d32" }}>Booking Confirmed!</h2>
          <p>{message}</p>
          {orderRef && <p style={{ color: "#666" }}>Order Reference: <strong>{orderRef}</strong></p>}
        </>
      )}
      {status === "failed" && (
        <>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>❌</div>
          <h2 style={{ color: "#c62828" }}>Payment Failed</h2>
          <p>{message}</p>
          {orderRef && <p style={{ color: "#666" }}>Order Reference: <strong>{orderRef}</strong></p>}
          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: "1rem", padding: "0.6rem 1.5rem",
              background: "#670770", color: "#fff",
              border: "none", borderRadius: "6px", cursor: "pointer"
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}