// app/api/create-payment-session/route.js
// Next.js App Router API Route

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { amount, orderId } = await request.json();

    const merchantId = process.env.MPGS_MERCHANT_ID;
    const apiUsername = process.env.MPGS_API_USERNAME;
    const apiPassword = process.env.MPGS_API_PASSWORD;
    const baseUrl = process.env.MPGS_BASE_URL; // https://cbcmpgs.gateway.mastercard.com/api/rest/version/100

    if (!merchantId || !apiUsername || !apiPassword || !baseUrl) {
      return NextResponse.json(
        { error: "Missing MPGS environment variables" },
        { status: 500 }
      );
    }

    // Basic Auth header: "merchant.TESTTANGERINELKR:password" base64 encoded
    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64");

    // Generate a unique order ID if not provided
    const generatedOrderId = orderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const url = `${baseUrl}/merchant/${merchantId}/session`;

    // For Hosted Session (session.js) integration, we only need to create a bare session.
    // The session.authenticationLimit field is how many times session.js can update the session.
    const requestBody = {
      session: {
        authenticationLimit: 25,
      },
    };

    console.log("[MPGS] Creating session at:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log("[MPGS] Session response:", JSON.stringify(data, null, 2));

    if (!response.ok || data.result !== "SUCCESS") {
      return NextResponse.json(
        { error: "Failed to create payment session", details: data },
        { status: response.status || 500 }
      );
    }

    // Return session ID and the generated order ID to the frontend
    return NextResponse.json({
      sessionId: data.session.id,
      orderId: generatedOrderId,
      result: data.result,
    });
  } catch (error) {
    console.error("[MPGS] Error creating session:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
