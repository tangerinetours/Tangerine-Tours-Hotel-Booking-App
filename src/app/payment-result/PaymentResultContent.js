"use client";
import { useSearchParams } from "next/navigation";

export default function PaymentResultContent() {
  const params = useSearchParams();
  const resultIndicator = params.get("resultIndicator");

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      {resultIndicator ? (
        <>
          <h1>Payment Complete</h1>
          <p>Your booking has been processed. Thank you!</p>
        </>
      ) : (
        <>
          <h1>Payment Result</h1>
          <p>No result received.</p>
        </>
      )}
    </div>
  );
}