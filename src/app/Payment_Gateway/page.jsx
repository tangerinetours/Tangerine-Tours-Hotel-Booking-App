if (data.requiresChallenge) {
        // Save data so payment-result page can complete the capture after redirect
        sessionStorage.setItem("mpgs_order_id", oid);
        sessionStorage.setItem("mpgs_transaction_id", "1");
        sessionStorage.setItem("mpgs_session_id", sid);
        sessionStorage.setItem("mpgs_amount", amount);
        // 3DS OTP challenge required — render the HTML the gateway returned
        setChallengeHtml(data.challengeHtml);
        setPayStatus(PAY_STATUS.CHALLENGE);
}

export default function Page() {
  return 
  <>

  </>;
}