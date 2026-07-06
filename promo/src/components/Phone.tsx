import React from "react";
import { C, FONT } from "../brand";

/** A minimalist phone shell used as the stage for the notification pings. */
export const Phone: React.FC<{
  children?: React.ReactNode;
  time?: string;
  glow?: string;
}> = ({ children, time = "3:00", glow }) => (
  <div
    style={{
      width: 640,
      height: 1300,
      borderRadius: 68,
      background: "linear-gradient(180deg, #0a1120 0%, #060a13 100%)",
      border: "3px solid rgba(125,139,176,0.28)",
      boxShadow: glow
        ? `0 0 120px -10px ${glow}, inset 0 0 60px rgba(0,0,0,0.6)`
        : "0 40px 120px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.6)",
      position: "relative",
      overflow: "hidden",
      fontFamily: FONT,
    }}
  >
    {/* status bar */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "34px 46px 0",
        color: C.ink,
        fontSize: 30,
        fontWeight: 700,
        opacity: 0.85,
      }}
    >
      <span>{time}</span>
      <span style={{ letterSpacing: 2, fontSize: 24 }}>◍ ◍ ◍ ▮</span>
    </div>
    {/* notch */}
    <div
      style={{
        position: "absolute",
        top: 26,
        left: "50%",
        transform: "translateX(-50%)",
        width: 190,
        height: 34,
        borderRadius: 20,
        background: "#04060d",
      }}
    />
    <div style={{ padding: "24px 30px", display: "flex", flexDirection: "column", gap: 20 }}>
      {children}
    </div>
  </div>
);

/** An X / Twitter–style push notification card. */
export const XPush: React.FC<{
  title: string;
  body: string;
  time: string;
  accent?: string;
}> = ({ title, body, time, accent = C.ink }) => (
  <div
    style={{
      background: "rgba(20,28,48,0.92)",
      backdropFilter: "blur(8px)",
      borderRadius: 26,
      padding: "24px 26px",
      display: "flex",
      gap: 20,
      alignItems: "flex-start",
      border: "1px solid rgba(125,139,176,0.22)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontSize: 40,
        fontWeight: 800,
      }}
    >
      𝕏
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <span style={{ color: accent, fontWeight: 800, fontSize: 27 }}>{title}</span>
        <span style={{ color: C.muted, fontSize: 22 }}>{time}</span>
      </div>
      <div style={{ color: C.ink, fontSize: 26, lineHeight: 1.32, opacity: 0.92 }}>{body}</div>
    </div>
  </div>
);
