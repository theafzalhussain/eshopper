import React from "react";

export default function PremiumHeader({ title, subtitle }) {
  return (
    <div style={{ textAlign: "center", margin: "32px 0 24px 0" }}>
      <div style={{ letterSpacing: 2, color: "#C9A84C", fontWeight: 600, fontSize: 13, textTransform: "uppercase", marginBottom: 8 }}>
        THE COLLECTION
      </div>
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 700,
          fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
          color: "#fff",
          background: "linear-gradient(90deg, #fff 60%, #C9A84C 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          letterSpacing: "-0.5px",
        }}
      >
        {title}
      </h1>
      <div style={{ width: 64, height: 3, background: "linear-gradient(90deg, #C9A84C, #fff 80%)", margin: "18px auto 0 auto", borderRadius: 2 }} />
      {subtitle && <div style={{ color: "#e5e5e5", fontSize: 18, marginTop: 12 }}>{subtitle}</div>}
    </div>
  );
}
