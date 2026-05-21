// app/api/process-payment/route.js
// This is called AFTER the session has been updated with card data via session.js
// and AFTER 3DS authentication (if required).

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { sessionId, orderId, amount, bookingDetails } = await request.json();

    const merchantId = process.env.MPGS_MERCHANT_ID;
    const apiUsername = process.env.MPGS_API_USERNAME;
    const apiPassword = process.env.MPGS_API_PASSWORD;
    const baseUrl = process.env.MPGS_BASE_URL;

    if (!merchantId || !apiUsername || !apiPassword || !baseUrl) {
      return NextResponse.json(
        { error: "Missing MPGS environment variables" },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64");

    // Transaction ID must be unique per order. Use "1" for first transaction on this order.
    const transactionId = "1";

    // -----------------------------------------------------------------------
    // STEP A: Initiate Authentication (3DS)
    // -----------------------------------------------------------------------
    const initiateAuthUrl = `${baseUrl}/merchant/${merchantId}/order/${orderId}/transaction/${transactionId}`;

    const initiateAuthBody = {
      apiOperation: "INITIATE_AUTHENTICATION",
      authentication: {
        acceptVersions: "3DS1,3DS2",
        channel: "PAYER_BROWSER",
        purpose: "PAYMENT_TRANSACTION",
      },
      correlationId: `corr-${Date.now()}`,
      order: {
        currency: "USD",
      },
      session: {
        id: sessionId,
      },
    };

    console.log("[MPGS] Initiating authentication...");
    const initiateAuthResponse = await fetch(initiateAuthUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(initiateAuthBody),
    });

    const initiateAuthData = await initiateAuthResponse.json();
    console.log("[MPGS] Initiate Auth response:", JSON.stringify(initiateAuthData, null, 2));

    if (!initiateAuthResponse.ok) {
      return NextResponse.json(
        { error: "Failed to initiate authentication", details: initiateAuthData },
        { status: initiateAuthResponse.status }
      );
    }

    // -----------------------------------------------------------------------
    // STEP B: Authenticate Payer (3DS) 
    // -----------------------------------------------------------------------
    const authenticatePayerBody = {
      apiOperation: "AUTHENTICATE_PAYER",
      
      authentication: {
          redirectResponseUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://tangerine-tours-hotel-booking-app-1094214581019.europe-west1.run.app"}/payment-result`,
        },

      correlationId: `corr-${Date.now()}`,
      device: {
        browser: "MOZILLA",
        browserDetails: {
          "3DSecureChallengeWindowSize": "FULL_SCREEN",
          acceptHeaders: "application/json",
          colorDepth: 24,
          javaEnabled: true,
          language: "en-US",
          screenHeight: 640,
          screenWidth: 480,
          timeZone: 330, // Sri Lanka UTC+5:30 = 330 minutes offset
        },
        ipAddress: "127.0.0.1",
      },
      order: {
        amount: amount.toFixed(2),
        currency: "USD",
      },
      session: {
        id: sessionId,
      },
    };

    console.log("[MPGS] Authenticating payer...");
    const authenticatePayerResponse = await fetch(initiateAuthUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(authenticatePayerBody),
    });

    const authenticatePayerData = await authenticatePayerResponse.json();
    console.log("[MPGS] Authenticate Payer response:", JSON.stringify(authenticatePayerData, null, 2));

    if (!authenticatePayerResponse.ok) {
      return NextResponse.json(
        { error: "Failed to authenticate payer", details: authenticatePayerData },
        { status: authenticatePayerResponse.status }
      );
    }

    const transactionStatus = authenticatePayerData?.authentication?.["3ds2"]?.transactionStatus;
    const payerInteraction = authenticatePayerData?.authentication?.payerInteraction;

    // Challenge Flow: user must complete OTP. Return the HTML to render.
    if (transactionStatus === "C" && payerInteraction === "REQUIRED") {
      return NextResponse.json({
        requiresChallenge: true,
        challengeHtml: authenticatePayerData.authentication.redirect?.html,
        orderId,
        transactionId,
        sessionId,
      });
    }

    // Frictionless Flow: proceed directly to PAY
    if (transactionStatus === "Y" && payerInteraction === "NOT_REQUIRED") {
      return await executePay({ baseUrl, merchantId, credentials, orderId, transactionId, sessionId, amount });
    }

    // Unknown state — return full response for debugging
    return NextResponse.json({
      requiresChallenge: false,
      authStatus: transactionStatus,
      details: authenticatePayerData,
    });

  } catch (error) {
    console.error("[MPGS] Error processing payment:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------
// Execute the final PAY operation
// -----------------------------------------------------------------------
async function executePay({ baseUrl, merchantId, credentials, orderId, transactionId, sessionId, amount }) {
  const payUrl = `${baseUrl}/merchant/${merchantId}/order/${orderId}/transaction/${transactionId}`;

  const payBody = {
    apiOperation: "PAY",
    authentication: {
      transactionId: transactionId,
    },
    order: {
      amount: amount.toFixed(2),
      currency: "USD",
      reference: orderId,
    },
    session: {
      id: sessionId,
    },
    sourceOfFunds: {
      type: "CARD",
    },
    transaction: {
      reference: orderId,
    },
  };

  console.log("[MPGS] Executing PAY...");
  const payResponse = await fetch(payUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payBody),
  });

  const payData = await payResponse.json();
  console.log("[MPGS] PAY response:", JSON.stringify(payData, null, 2));

  const gatewayCode = payData?.response?.gatewayCode;
  const result = payData?.result;

  return NextResponse.json({
    requiresChallenge: false,
    success: result === "SUCCESS" && gatewayCode === "APPROVED",
    gatewayCode,
    result,
    orderId,
    details: payData,
  });
}
