"use client";
import { useSearchParams } from "next/navigation";

export default function PaymentResultContent() {
  const params = useSearchParams();
  const resultIndicator = params.get("resultIndicator");

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Payment Result</h1>
      <p>Result Indicator: {resultIndicator}</p>
    </div>
  );
}