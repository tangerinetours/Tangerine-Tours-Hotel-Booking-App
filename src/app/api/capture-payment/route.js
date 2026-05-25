// /app/api/capture-payment/route.js
import { NextResponse } from "next/server";



export async function POST(req) {
  
  try {
    const { orderId, transactionId, sessionId, amount } = await req.json();

    const merchantId = process.env.MPGS_MERCHANT_ID;
    const apiUsername = process.env.MPGS_API_USERNAME;
    const apiPassword = process.env.MPGS_API_PASSWORD;
    const baseUrl = process.env.MPGS_BASE_URL;

    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64");

    const payTransactionId = "2"; // must be different from auth transaction "1"
    const payUrl = `${baseUrl}/merchant/${merchantId}/order/${orderId}/transaction/${payTransactionId}`;

    

    const payBody = {
      apiOperation: "PAY",
      authentication: { transactionId: transactionId }, // keep original "1" here for auth reference
      order: {
        amount: parseFloat(amount).toFixed(2),
        currency: "USD",
        reference: orderId,
      },
      session: { id: sessionId },
      sourceOfFunds: { type: "CARD" },
      transaction: { reference: orderId },
    };

    console.log("[MPGS] Capture PAY calling...", payUrl);
    const payResponse = await fetch(payUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(payBody),
    });

    const payData = await payResponse.json();
    console.log("[MPGS] Capture PAY response:", JSON.stringify(payData, null, 2));

    return NextResponse.json({
      success: payData?.result === "SUCCESS" && payData?.response?.gatewayCode === "APPROVED",
      gatewayCode: payData?.response?.gatewayCode,
      result: payData?.result,
      orderId,
      details: payData,
    });

  } catch (error) {
    console.error("[MPGS] Capture error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}