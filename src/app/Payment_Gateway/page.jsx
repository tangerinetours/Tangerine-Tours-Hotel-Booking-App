
if (data.requiresChallenge) {
  // ← ADD THESE 4 LINES before rendering the challenge HTML
  sessionStorage.setItem("mpgs_order_id", data.orderId);
  sessionStorage.setItem("mpgs_transaction_id", data.transactionId);
  sessionStorage.setItem("mpgs_session_id", data.sessionId);
  sessionStorage.setItem("mpgs_amount", amount); // your local amount variable

  // your existing challenge HTML rendering code below...
  setChallengeHtml(data.challengeHtml);
}

export default function Page() {
  return 
  <>

  </>;
}