"use client";
import { useSearchParams } from "next/navigation";

export default function PaymentResult() {
  const params = useSearchParams();
  // MPGS appends ?resultIndicator=xxx to this URL after challenge
  const resultIndicator = params.get("resultIndicator");
  
  // TODO: Compare resultIndicator against your stored successIndicator
  // (for Hosted Session, verify by calling Retrieve Order API)
  
  return (
    <div>
      <h1>Payment Result</h1>
      <p>Result Indicator: {resultIndicator}</p>
    </div>
  );
}