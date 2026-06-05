"use client";
import { useEffect, useState } from "react";

export default function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#670770",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 0,
      animation: visible ? "none" : "fadeOut 0.4s ease forwards",
    }}>
      <style>{`
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ringRotateReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.92); } }
        @keyframes dotFade { 0%,80%,100% { opacity:0.15; transform:scale(0.7); } 40% { opacity:1; transform:scale(1); } }
        @keyframes progressFill { from { width:0%; } to { width:100%; } }
        @keyframes preloaderFadeOut { from { opacity:1; } to { opacity:0; pointer-events:none; } }
      `}</style>

      {/* Rings */}
      <div style={{ position: "relative", width: 120, height: 120, marginBottom: 32 }}>
        {[
          { inset: 0, color: "rgba(255,255,255,0.9)", dir: 1, dur: "1.4s" },
          { inset: 14, color: "rgba(255,255,255,0.7)", dir: -1, dur: "1.8s", side: "bottom" },
          { inset: 28, color: "rgba(255,255,255,0.5)", dir: 1, dur: "2.2s" },
        ].map((r, i) => (
          <div key={i} style={{
            position: "absolute", inset: r.inset, borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: r.side ? "transparent" : r.color,
            borderRightColor: r.side ? "transparent" : "rgba(255,255,255,0.2)",
            borderBottomColor: r.side ? r.color : "transparent",
            borderLeftColor: r.side ? "rgba(255,255,255,0.15)" : "transparent",
            animation: `${r.dir === 1 ? "ringRotate" : "ringRotateReverse"} ${r.dur} linear infinite`,
          }} />
        ))}
        <div style={{
          position: "absolute", inset: 42, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>

      {/* Brand */}
      <div style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.95)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>
        Fairview Hotel
      </div>
      <div style={{ fontFamily: "sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 5, textTransform: "uppercase", marginBottom: 36 }}>
        Colombo
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            animation: `dotFade 1.4s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: 180, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "rgba(255,255,255,0.8)", borderRadius: 2, animation: "progressFill 2.5s cubic-bezier(0.4,0,0.2,1) forwards" }} />
      </div>
      <div style={{ fontFamily: "sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginTop: 14 }}>
        Loading your experience
      </div>
    </div>
  );
}