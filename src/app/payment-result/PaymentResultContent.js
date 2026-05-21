"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentResultContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState("processing"); // processing | success | failed
  const [message, setMessage] = useState("Completing your payment...");
  const [orderRef, setOrderRef] = useState("");

  useEffect(() => {
    const resultIndicator = params.get("resultIndicator");

    // Retrieve values saved to sessionStorage before the 3DS challenge redirect
    const orderId     = sessionStorage.getItem("mpgs_order_id");
    const transactionId = sessionStorage.getItem("mpgs_transaction_id") || "1";
    const sessionId   = sessionStorage.getItem("mpgs_session_id");
    const amount      = sessionStorage.getItem("mpgs_amount");

    setOrderRef(orderId || "");

    // If nothing in sessionStorage, something went wrong before redirect
    if (!orderId || !sessionId) {
      setStatus("failed");
      setMessage("Session expired or payment data missing. Please try again.");
      return;
    }

    // Call capture-payment — this executes the actual PAY operation on MPGS
    fetch("/api/capture-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, transactionId, sessionId, amount }),
    })
      .then((r) => r.json())
      .then((data) => {
        // Clear sessionStorage after capture attempt
        sessionStorage.removeItem("mpgs_order_id");
        sessionStorage.removeItem("mpgs_transaction_id");
        sessionStorage.removeItem("mpgs_session_id");
        sessionStorage.removeItem("mpgs_amount");

        if (data.success) {
          setStatus("success");
          setMessage("Your payment was successful! Your booking is confirmed.");
        } else {
          setStatus("failed");
          setMessage(
            `Payment was not completed. Reason: ${data.gatewayCode || "Unknown"}. Please contact support.`
          );
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("A network error occurred while completing payment. Please contact support.");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      {status === "processing" && (
        <>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <h2>Processing Payment...</h2>
          <p style={{ color: "#666" }}>{message}</p>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>Please do not close this page.</p>
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
              background: "#1976d2", color: "#fff",
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