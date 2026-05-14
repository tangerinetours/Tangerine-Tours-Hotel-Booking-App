"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Image from "next/image";
import styles from "./page.module.css";
import { BedDouble } from "lucide-react";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { getNames } from "country-list";


const PhoneInput = dynamic(() => import("react-phone-number-input"), { ssr: false });




// ─── Constants ────────────────────────────────────────────────────────────────
const MERCHANT_ID = process.env.NEXT_PUBLIC_MPGS_MERCHANT_ID;
const SESSION_JS_URL = `https://cbcmpgs.gateway.mastercard.com/form/version/100/merchant/TESTTANGERINELKR/session.js`;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROOM_PRICES = { SINGLE: 60, DOUBLE: 60, TRIPLE: 85 };
const GALLERY_IMAGES = [
  "/Gallery_1.webp", "/Gallery_2.webp", "/Gallery_3.webp", "/Gallery_4.webp",
  "/Gallery_5.webp", "/Gallery_6.webp", "/Gallery_7.webp", "/Gallery_8.webp",
];

// ─── Payment status enum ──────────────────────────────────────────────────────
const PAY_STATUS = {
  IDLE: "idle",
  LOADING_SESSION: "loading_session",    // fetching session from our API
  SESSION_READY: "session_ready",        // session.js configured, waiting for user input
  PROCESSING: "processing",             // calling process-payment API
  CHALLENGE: "challenge",               // 3DS OTP challenge in progress
  SUCCESS: "success",
  FAILED: "failed",
};

export default function Home() {
  // ── UI state ────────────────────────────────────────────────────────────────
  const [isBooking, setIsBooking] = useState(false);
  const [isPayment, setIsPayment] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("SINGLE");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedImage, setSelectedImage] = useState("/Cover_Image.webp");

  // ── Booking form state ───────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    nationality: "", adults: 1, children: 0,
  });
  const [errors, setErrors] = useState({ phone: "", email: "", nationality: "" });
  const [bookingDetails, setBookingDetails] = useState(null);

  // ── Payment state ────────────────────────────────────────────────────────────
  const [payStatus, setPayStatus] = useState(PAY_STATUS.IDLE);
  const [payError, setPayError] = useState("");
  const [challengeHtml, setChallengeHtml] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [orderId, setOrderId] = useState("");

  // Refs to avoid stale closures in callbacks
  const sessionIdRef = useRef("");
  const orderIdRef = useRef("");
  const amountRef = useRef(0);

  // ── Calculations ─────────────────────────────────────────────────────────────
  const nights = (() => {
    if (!startDate || !endDate) return 0;
    return Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
  })();
  const totalCost = nights * ROOM_PRICES[selectedRoom];
  const formatDate = (d) => (d ? d.toISOString().split("T")[0] : "");
  const countries = getNames();

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 ─ User clicks "Confirm Booking" → validate form → show payment panel
  // ────────────────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.phone || !isValidPhoneNumber(formData.phone))
      newErrors.phone = "Please enter a valid phone number";
    if (!formData.email || !EMAIL_REGEX.test(formData.email))
      newErrors.email = "Please enter a valid email";
    if (!formData.nationality)
      newErrors.nationality = "Please select a country";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const parsed = parsePhoneNumber(formData.phone);
    const booking = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: parsed?.formatInternational() || formData.phone,
      email: formData.email,
      nationality: formData.nationality,
      adults: formData.adults,
      children: formData.children,
      roomType: selectedRoom,
      checkIn: formatDate(startDate),
      checkOut: formatDate(endDate),
      nights,
      totalCost,
    };
    setBookingDetails(booking);
    setIsBooking(false);
    setIsPayment(true);
    amountRef.current = totalCost;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 ─ When payment panel mounts → create session on the server
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPayment) return;

    const createSession = async () => {
      setPayStatus(PAY_STATUS.LOADING_SESSION);
      setPayError("");
      try {
        const res = await fetch("/api/create-payment-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: totalCost }),
        });
        const data = await res.json();
        if (!res.ok || !data.sessionId) {
          throw new Error(data.error || "Failed to create payment session");
        }
        setSessionId(data.sessionId);
        setOrderId(data.orderId);
        sessionIdRef.current = data.sessionId;
        orderIdRef.current = data.orderId;
        // session.js will be configured once the script loads (see onScriptLoad)
        setPayStatus(PAY_STATUS.SESSION_READY);
      } catch (err) {
        console.error("[Payment] Session error:", err);
        setPayError(err.message || "Could not initialise payment. Please try again.");
        setPayStatus(PAY_STATUS.FAILED);
      }
    };

    createSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayment]);

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 ─ Configure PaymentSession once BOTH script AND sessionId are ready
  // ────────────────────────────────────────────────────────────────────────────
  const configurePaymentSession = useCallback((sid) => {
    if (!window.PaymentSession) {
      console.error("[Payment] PaymentSession not available on window");
      return;
    }

    window.PaymentSession.configure({
      session: sid,
      fields: {
        card: {
          number: "#card-number",
          securityCode: "#security-code",
          expiryMonth: "#expiry-month",
          expiryYear: "#expiry-year",
          nameOnCard: "#cardholder-name",
        },
      },
      frameEmbeddingMitigation: ["javascript"],
      callbacks: {
        initialized: (response) => {
          console.log("[PaymentSession] Initialized:", response);
        },
        formSessionUpdate: async (response) => {
          console.log("[PaymentSession] formSessionUpdate:", response);

          if (response.status === "ok") {
            // Card data is now inside the session → call our process-payment API
            await processPayment(sessionIdRef.current, orderIdRef.current, amountRef.current);
          } else if (response.status === "fields_in_error") {
            const fieldErrors = [];
            if (response.errors?.cardNumber) fieldErrors.push("Invalid card number");
            if (response.errors?.expiryYear) fieldErrors.push("Invalid expiry year");
            if (response.errors?.expiryMonth) fieldErrors.push("Invalid expiry month");
            if (response.errors?.securityCode) fieldErrors.push("Invalid security code");
            setPayError(fieldErrors.join(" · ") || "Please check your card details");
            setPayStatus(PAY_STATUS.SESSION_READY);
          } else if (response.status === "request_timeout") {
            setPayError("Request timed out. Please try again.");
            setPayStatus(PAY_STATUS.SESSION_READY);
          } else {
            setPayError("An error occurred. Please try again.");
            setPayStatus(PAY_STATUS.SESSION_READY);
          }
        },
      },
      interaction: {
        displayControl: {
          formatCard: "EMBOSSED",
          invalidFieldCharacters: "REJECT",
        },
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps




  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4 ─ "PAY NOW" button → tell session.js to capture card fields
  // ────────────────────────────────────────────────────────────────────────────
  const handlePayNow = () => {
    if (!window.PaymentSession) {
      setPayError("Payment library not loaded. Please refresh and try again.");
      return;
    }
    setPayError("");
    setPayStatus(PAY_STATUS.PROCESSING);
    // This triggers formSessionUpdate callback above
    window.PaymentSession.updateSessionFromForm("card");
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 5 ─ After session updated with card, run 3DS + PAY on the server
  // ────────────────────────────────────────────────────────────────────────────
  const processPayment = async (sid, oid, amount) => {
    try {
      const res = await fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, orderId: oid, amount }),
      });
      const data = await res.json();
      console.log("[Payment] process-payment response:", data);

      if (data.requiresChallenge) {
        // 3DS OTP challenge required — render the HTML the gateway returned
        setChallengeHtml(data.challengeHtml);
        setPayStatus(PAY_STATUS.CHALLENGE);
      } else if (data.success) {
        setPayStatus(PAY_STATUS.SUCCESS);
      } else {
        const code = data.gatewayCode || data.result || "UNKNOWN";
        setPayError(`Payment failed (${code}). Please try again or use a different card.`);
        setPayStatus(PAY_STATUS.FAILED);
      }
    } catch (err) {
      console.error("[Payment] processPayment error:", err);
      setPayError("Network error. Please try again.");
      setPayStatus(PAY_STATUS.FAILED);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────────────────────────
  const isInputDisabled = payStatus === PAY_STATUS.PROCESSING || payStatus === PAY_STATUS.CHALLENGE;
  const isBtnDisabled =
    payStatus === PAY_STATUS.LOADING_SESSION ||
    payStatus === PAY_STATUS.PROCESSING ||
    payStatus === PAY_STATUS.CHALLENGE ||
    payStatus === PAY_STATUS.SUCCESS;


    
// ─── Payment session ────────────────────────────────────────────────────────────────

useEffect(() => {
  if (!isPayment || !sessionId) return;

  console.log("[Payment] Loading session.js from:", SESSION_JS_URL);

  const existing = document.getElementById("mpgs-session-js");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = "mpgs-session-js";
  script.src = SESSION_JS_URL;
  script.async = true;

  script.onload = () => {
    console.log("[Payment] session.js loaded successfully");
    setTimeout(() => {
      configurePaymentSession(sessionId);
    }, 300);
  };

  script.onerror = (e) => {
    console.error("[Payment] session.js failed to load:", e);
    setPayError("Failed to load payment library. Please refresh.");
  };

  document.body.appendChild(script);

  return () => {
    const s = document.getElementById("mpgs-session-js");
    if (s) s.remove();
  };
}, [isPayment, sessionId]);



  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div>
        {/* Background */}
        <div className={styles.imageContainer}>
          <Image
            src="/background_image.jpg"
            alt="Background"
            width={1920} height={1080}
            className={styles.background_image}
            priority
          />
        </div>

        <div className={styles.content_body} suppressHydrationWarning>
          <div className={styles.left_wrapper}>

            {/* ── PANEL 1: Room & Date Picker ── */}
            <div className={`${styles.left_content} ${(isBooking || isPayment) ? styles.slideDown : ""}`}>
              <div className={styles.room_catogaries}>
                <div className={styles.form_group}>
                  <div>
                    <DatePicker
                      inline selectsRange
                      startDate={startDate} endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      monthsShown={1} minDate={new Date()}
                    />
                    <div className={styles.form_group_inputs}>
                      <h3 className={styles.room_catogary_text}>{selectedRoom} ROOM</h3>
                      <h3 className={styles.room_nights_text}>
                        ({nights > 0 ? `${nights} NIGHT${nights > 1 ? "S" : ""}` : "0 NIGHTS"})
                      </h3>
                      <h3 className={styles.room_price_text}>{totalCost}$</h3>
                    </div>
                  </div>

                  <div className={styles.room_catogaries_container}>
                    {[
                      { key: "SINGLE", icons: 1 },
                      { key: "DOUBLE", icons: 2 },
                      { key: "TRIPLE", icons: 3 },
                    ].map(({ key, icons }) => (
                      <div
                        key={key}
                        className={`${styles.room_catogary} ${selectedRoom === key ? styles.selected : ""}`}
                        onClick={() => setSelectedRoom(key)}
                      >
                        <div className={icons > 1 ? styles.room_catogary_icons : styles.room_icon}>
                          {Array.from({ length: icons }).map((_, i) => (
                            <div key={i} className={styles.room_icon}>
                              <BedDouble size={icons === 3 ? 20 : icons === 2 ? 22 : 24} color="#670770c0" />
                            </div>
                          ))}
                        </div>
                        <h3 className={styles.room_catogary_title}>{key}</h3>
                        <div className={styles.room_catogary_price}>
                          <h3>{ROOM_PRICES[key]}$</h3><h4>Per Night</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className={styles.book_now_btn} onClick={() => {
                if (!startDate || !endDate) return;
                setIsBooking(true);
              }} fdprocessedid="16zy">
                BOOK NOW 
              </button>
            </div>

            {/* ── PANEL 2: Booking Details Form ── */}
            <div className={`${styles.booking_form} ${isBooking ? styles.slideUp : ""}`}>
              <h2 className={styles.booking_details_title}>BOOKING DETAILS</h2>

              <div className={styles.summary}>
                <div className={styles.summary_line}>
                  <p className={styles.room_period_text_2}>Dates: {formatDate(startDate)} – {formatDate(endDate)}</p>
                  <p className={styles.room_catogary_text_2}>Room: {selectedRoom}</p>
                  <p className={styles.room_nights_text_2}>Nights: {nights}</p>
                </div>
                <div className={styles.cost_summary_line}>
                  <p className={styles.room_cost_text_2}><span className={styles.room_cost_text_3}>Total: </span>${totalCost}</p>
                </div>
              </div>

              <div className={styles.booking_form_2}>
                <div className={styles.form_group_name_inputs}>
                  <input placeholder="First Name" value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  <input placeholder="Last Name" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>

                <PhoneInput
                  placeholder="Phone Number" international countryCallingCodeEditable={false}
                  defaultCountry={undefined} value={formData.phone}
                  onChange={(value) => {
                    setFormData({ ...formData, phone: value });
                    setErrors((prev) => ({
                      ...prev,
                      phone: !value || !isValidPhoneNumber(value) ? "Invalid phone number" : "",
                    }));
                  }}
                />
                {errors.phone && <p style={{ color: "red", fontSize: "0.9rem", fontWeight: "bold", paddingBottom: "0.5rem" }}>{errors.phone}</p>}

                <input className={styles.form_group_email_input} placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, email: v });
                    setErrors((prev) => ({ ...prev, email: !v || !EMAIL_REGEX.test(v) ? "Invalid email address" : "" }));
                  }}
                />
                {errors.email && <p style={{ color: "red", fontSize: "0.9rem", fontWeight: "bold", paddingBottom: "0.5rem" }}>{errors.email}</p>}

                <div className={styles.form_group_name_inputs}>
                  <div style={{ width: "100%" }}>
                    <select value={formData.nationality} className={styles.select_input}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, nationality: v });
                        setErrors((prev) => ({ ...prev, nationality: !v ? "Please select a country" : "" }));
                      }}>
                      <option value="" disabled>Nationality</option>
                      {countries.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    {errors.nationality && <p style={{ color: "red", fontSize: "0.9rem", fontWeight: "bold", paddingBottom: "0.5rem" }}>{errors.nationality}</p>}
                  </div>

                  <div className={styles.form_group_name_inputs}>
                    <input placeholder="Adults" type="number" min={1} value={formData.adults}
                      onChange={(e) => setFormData({ ...formData, adults: e.target.value })} />
                    <input placeholder="Children" type="number" min={0} value={formData.children}
                      onChange={(e) => setFormData({ ...formData, children: e.target.value })} />
                  </div>
                </div>

                <input className={styles.form_group_email_input} placeholder="Special Notes" type="text" />
              </div>

              <button className={styles.back_btn} onClick={handleSubmit}>Confirm Booking</button>
              <button className={styles.back_btn} onClick={() => setIsBooking(false)}>Back</button>
            </div>

            {/* ── PANEL 3: Payment Form ── */}
            {isPayment && bookingDetails && (
              <div className={`${styles.payment_form} ${isPayment ? styles.slideUp : ""}`}>



                <h2 className={styles.booking_details_title}>PAYMENT DETAILS</h2>

                {/* Booking summary */}
                <div className={styles.summary}>
                  <div className={styles.summary_line}>
                    <p className={styles.room_period_text_2}>Dates: {formatDate(startDate)} – {formatDate(endDate)}</p>
                    <p className={styles.room_catogary_text_2}>Room: {selectedRoom}</p>
                    <p className={styles.room_nights_text_2}>Nights: {nights}</p>
                  </div>
                  <div className={styles.cost_summary_line}>
                    <p className={styles.room_cost_text_2}><span className={styles.room_cost_text_3}>Total: </span>${totalCost}</p>
                  </div>
                </div>

                {/* Guest summary */}
                <div className={styles.payment_summary}>
                  <p><span>Name:</span> {bookingDetails.firstName} {bookingDetails.lastName}</p>
                  <p><span>Phone:</span> {bookingDetails.phone}</p>
                  <p><span>Email:</span> {bookingDetails.email}</p>
                  <div className={styles.payment_summary_2}>
                    <p><span>Nationality:</span> {bookingDetails.nationality}</p>
                    <p><span>Adults:</span> {bookingDetails.adults}</p>
                    <p><span>Children:</span> {bookingDetails.children}</p>
                  </div>
                </div>

                {/* ── Status messages ── */}
                {payStatus === PAY_STATUS.LOADING_SESSION && (
                  <p style={{ color: "#670770", marginBottom: "1rem" }}>⏳ Initialising secure payment...</p>
                )}
                {payStatus === PAY_STATUS.PROCESSING && (
                  <p style={{ color: "#670770", marginBottom: "1rem" }}>⏳ Processing your payment...</p>
                )}
                {payStatus === PAY_STATUS.SUCCESS && (
                  <div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "0.5rem", padding: "0.5rem", marginBottom: "1rem" }}>
                    <p style={{ color: "#155724", fontWeight: "bold", fontSize: "1.1rem" }}>✅ Payment Successful!</p>
                    <p style={{ color: "#155724" }}>Thank you, {bookingDetails.firstName}. Your booking is confirmed.</p>
                    <p style={{ color: "#155724" }}>Order ID: {orderId}</p>
                  </div>
                )}
                {payStatus === PAY_STATUS.FAILED && payError && (
                  <div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "0.5rem", padding: "0.5rem", marginBottom: "1rem" }}>
                    <p style={{ color: "#721c24", fontWeight: "bold" }}>❌ {payError}</p>
                  </div>
                )}
                {payStatus === PAY_STATUS.SESSION_READY && payError && (
                  <div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "0.5rem", padding: "0.5rem", marginBottom: "1rem" }}>
                    <p style={{ color: "#721c24", fontWeight: "bold" }}>⚠️ {payError}</p>
                  </div>
                )}

                {/* ── 3DS Challenge iframe ── */}
                {payStatus === PAY_STATUS.CHALLENGE && challengeHtml && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "#670770", fontWeight: "bold", marginBottom: "0.5rem" }}>
                      🔒 Please complete 3D Secure verification:
                    </p>
                    <iframe
                      srcDoc={challengeHtml}
                      style={{
                        width: "100%",
                        height: "fit-content",
                        border: "2px solid #670770",
                        borderRadius: "0.5rem",
                      }}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation"
                      title="3D Secure Verification"
                    />
                  </div>
                )}
                {/* ── Card fields (hidden during challenge/success) ── */}
                {payStatus !== PAY_STATUS.SUCCESS && payStatus !== PAY_STATUS.CHALLENGE && (
                  <>
                    {/* Card Number */}
                    <div className={styles.payment_inputs}>
                      <label htmlFor="card-number">Card Number</label>
                      {/*
                        IMPORTANT: These inputs must have readonly attribute and the exact IDs.
                        session.js replaces them with secure iframes — do NOT remove readonly.
                      */}
                      <input
                        className={styles.gateway_input}
                        id="card-number"
                        type="text"
                        readOnly
                        disabled={isInputDisabled}
                        title="Card Number"
                        aria-label="Enter your card number"
                      />
                    </div>

                    {/* Expiry + CVV on same row */}
                    <div className={styles.payment_inputs_2}>
                      <label htmlFor="expiry-month">Expiry Month</label>
                      <input
                        className={styles.gateway_input}
                        id="expiry-month"
                        type="text"
                        readOnly
                        disabled={isInputDisabled}
                        title="Expiry Month (MM)"
                        aria-label="Two digit expiry month"
                        style={{ width: "80px" }}
                      />
                      <label htmlFor="expiry-year">Year</label>
                      <input
                        className={styles.gateway_input}
                        id="expiry-year"
                        type="text"
                        readOnly
                        disabled={isInputDisabled}
                        title="Expiry Year (YY)"
                        aria-label="Two digit expiry year"
                        style={{ width: "80px" }}
                      />
                      <label htmlFor="security-code">CVV</label>
                      <input
                        className={styles.gateway_input}
                        id="security-code"
                        type="text"
                        readOnly
                        disabled={isInputDisabled}
                        title="Security Code"
                        aria-label="Three digit CVV security code"
                        style={{ width: "80px" }}
                      />
                    </div>

                    {/* Cardholder Name */}
                    <div className={styles.payment_inputs}>
                      <label htmlFor="cardholder-name">Name on Card</label>
                      <input
                        className={styles.gateway_input}
                        id="cardholder-name"
                        type="text"
                        readOnly
                        disabled={isInputDisabled}
                        title="Cardholder Name"
                        aria-label="Enter name on card"
                      />
                    </div>
                  </>
                )}

                {/* ── Action buttons ── */}
                <div className={styles.payment_buttons}>
                  {payStatus !== PAY_STATUS.SUCCESS && payStatus !== PAY_STATUS.CHALLENGE && (
                    <button
                      className={styles.back_btn}
                      onClick={handlePayNow}
                      disabled={isBtnDisabled}
                      style={{ opacity: isBtnDisabled ? 0.6 : 1 }}
                    >
                      {payStatus === PAY_STATUS.PROCESSING ? "Processing..." : "PAY NOW"}
                    </button>
                  )}

                  {payStatus !== PAY_STATUS.SUCCESS && (
                    <button
                      className={styles.back_btn}
                      disabled={isInputDisabled}
                      style={{ opacity: isInputDisabled ? 0.6 : 1 }}
                      onClick={() => {
                        setIsPayment(false);
                        setIsBooking(true);
                        setPayStatus(PAY_STATUS.IDLE);
                        setPayError("");
                        setSessionId("");
                        setOrderId("");
                        setScriptLoaded(false);
                        setChallengeHtml("");
                      }}
                    >
                      BACK
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* ── Right: Image gallery ── */}
          <div className={styles.right_content}>
            <div className={styles.preview_image}>
              <div className={styles.preview_image_container}>
                <div className={styles.title_container}>
                  <h1 className={styles.title}>FAIRVIEW <span className={styles.highlight}>HOTEL</span></h1>
                  <h5 className={styles.sub_title}>COLOMBO</h5>
                </div>
                <Image
                  src={selectedImage} alt="Preview"
                  width={1920} height={1920}
                  className={styles.image} priority
                />
              </div>
            </div>
            <div className={styles.gallery}>
              {GALLERY_IMAGES.map((img, i) => (
                <Image key={i} src={img} alt={`Gallery ${i + 1}`}
                  width={300} height={200}
                  className={`${styles.thumbnail} ${selectedImage === img ? styles.active : ""}`}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
