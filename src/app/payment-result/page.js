import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PaymentResultContent() {
  const params = useSearchParams();
  const resultIndicator = params.get("resultIndicator");

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Payment Result</h1>
      <p>Result Indicator: {resultIndicator}</p>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}