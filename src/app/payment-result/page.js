// Inside PaymentResultContent.js - on component mount:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  // MPGS sends these back after 3DS challenge redirect
  const orderId = params.get("order_id") || sessionStorage.getItem("mpgs_order_id");
  const transactionId = sessionStorage.getItem("mpgs_transaction_id") || "1";
  const sessionId = sessionStorage.getItem("mpgs_session_id");
  const amount = sessionStorage.getItem("mpgs_amount");

  if (orderId && sessionId) {
    // 3DS is done — now capture the payment
    fetch("/api/capture-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, transactionId, sessionId, amount }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          // show success UI
        } else {
          // show failure UI with data.gatewayCode
        }
      });
  }
}, []);