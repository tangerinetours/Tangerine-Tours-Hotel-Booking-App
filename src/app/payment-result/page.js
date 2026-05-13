import { Suspense } from "react";
import PaymentResultContent from "./PaymentResultContent";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}