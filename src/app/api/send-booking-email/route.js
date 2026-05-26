// src/app/api/send-booking-email/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { bookingDetails, orderId, amount } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const bookingHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: #670770; color: #fff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 1.8rem; letter-spacing: 2px; }
          .header p { margin: 5px 0 0; opacity: 0.85; font-size: 0.95rem; }
          .badge { display: inline-block; background: #4caf50; color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; margin-top: 12px; }
          .body { padding: 30px; }
          .section-title { color: #670770; font-size: 1rem; font-weight: bold; border-bottom: 2px solid #f0e0f0; padding-bottom: 6px; margin: 24px 0 14px; text-transform: uppercase; letter-spacing: 1px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.92rem; }
          .row .label { color: #888; }
          .row .value { color: #222; font-weight: 600; }
          .total-row { background: #f8f0fa; padding: 14px 16px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 16px; }
          .total-row .label { color: #670770; font-weight: bold; font-size: 1rem; }
          .total-row .value { color: #670770; font-weight: bold; font-size: 1.1rem; }
          .order-box { background: #f8f0fa; border-left: 4px solid #670770; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 0.9rem; }
          .order-box strong { color: #670770; }
          .footer { background: #670770; color: #fff; text-align: center; padding: 20px; font-size: 0.82rem; opacity: 0.95; }
          .footer a { color: #f0c0f8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FAIRVIEW HOTEL</h1>
            <p>Colombo, Sri Lanka</p>
            <div class="badge">✅ Booking Confirmed</div>
          </div>
          <div class="body">
            <div class="order-box">
              <strong>Order Reference:</strong> ${orderId}<br>
              <strong>Payment Status:</strong> Confirmed & Paid
            </div>

            <div class="section-title">Guest Details</div>
            <div class="row"><span class="label">Full Name</span><span class="value">${bookingDetails.firstName} ${bookingDetails.lastName}</span></div>
            <div class="row"><span class="label">Email</span><span class="value">${bookingDetails.email}</span></div>
            <div class="row"><span class="label">Phone</span><span class="value">${bookingDetails.phone}</span></div>
            <div class="row"><span class="label">Nationality</span><span class="value">${bookingDetails.nationality}</span></div>
            <div class="row"><span class="label">Adults</span><span class="value">${bookingDetails.adults}</span></div>
            <div class="row"><span class="label">Children</span><span class="value">${bookingDetails.children}</span></div>

            <div class="section-title">Booking Details</div>
            <div class="row"><span class="label">Room Type</span><span class="value">${bookingDetails.roomType} Room</span></div>
            <div class="row"><span class="label">Check-In</span><span class="value">${bookingDetails.checkIn}</span></div>
            <div class="row"><span class="label">Check-Out</span><span class="value">${bookingDetails.checkOut}</span></div>
            <div class="row"><span class="label">Number of Nights</span><span class="value">${bookingDetails.nights}</span></div>

            <div class="total-row">
              <span class="label">Total Amount Paid</span>
              <span class="value">$${amount} USD</span>
            </div>
          </div>
          <div class="footer">
            Fairview Hotel &bull; Colombo, Sri Lanka<br>
            <a href="mailto:hello@tangerinetours.com">hello@tangerinetours.com</a><br><br>
            This is an automated booking confirmation. Please keep this for your records.
          </div>
        </div>
      </body>
      </html>
    `;

    // Email to hotel
    await transporter.sendMail({
      from: `"Fairview Hotel Bookings" <${process.env.SMTP_USER}>`,
      to: "hello@tangerinetours.com",
      subject: `New Booking Confirmed — ${bookingDetails.firstName} ${bookingDetails.lastName} | ${orderId}`,
      html: bookingHtml,
    });

    // Email to guest
    await transporter.sendMail({
      from: `"Fairview Hotel" <${process.env.SMTP_USER}>`,
      to: bookingDetails.email,
      subject: `Your Booking is Confirmed — Fairview Hotel, Colombo`,
      html: bookingHtml,
    });

    console.log("[Email] Booking confirmation sent to hotel and guest:", bookingDetails.email);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Email] Failed to send booking email:", error);
    return NextResponse.json(
      { error: "Failed to send email", message: error.message },
      { status: 500 }
    );
  }
}