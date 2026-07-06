import React from "react";
import { interpolate } from "remotion";
import { C, FONT, MONO } from "../brand";

/** The DUMPS / HOLDS parimutuel odds bar. `p` = fraction to DUMPS (0..1). */
export const OddsBar: React.FC<{ p: number; width?: number; live?: number }> = ({
  p,
  width = 720,
  live = p,
}) => {
  const pct = Math.round(live * 100);
  return (
    <div style={{ width, fontFamily: FONT }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 1,
          marginBottom: 14,
        }}
      >
        <span style={{ color: C.alarm }}>DUMPS</span>
        <span style={{ color: C.lime }}>HOLDS</span>
      </div>
      <div
        style={{
          height: 46,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          border: "1px solid rgba(125,139,176,0.25)",
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: `${p * 100}%`,
            background: `linear-gradient(90deg, #b41630, ${C.alarm})`,
            boxShadow: `0 0 30px ${C.alarm}`,
          }}
        />
        <div style={{ flex: 1, background: `linear-gradient(90deg, #1c7a12, ${C.lime})` }} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          fontWeight: 700,
          marginTop: 12,
          fontFamily: MONO,
        }}
      >
        <span style={{ color: C.alarm }}>{pct}% · say you dump</span>
        <span style={{ color: C.lime }}>{100 - pct}%</span>
      </div>
    </div>
  );
};

/** A single wallet row on the betrayal leaderboard. */
export const LeaderRow: React.FC<{
  rank: number;
  handle: string;
  bal: string;
  role: string;
  highlight?: boolean;
  glowT?: number; // 0..1 pulse for the highlighted (you) row
}> = ({ rank, handle, bal, role, highlight, glowT = 0 }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "70px 1fr 150px 210px",
      alignItems: "center",
      gap: 16,
      padding: "20px 26px",
      borderRadius: 14,
      background: highlight ? "rgba(255,69,96,0.14)" : "rgba(17,26,46,0.7)",
      border: highlight
        ? `2px solid ${C.alarm}`
        : "1px solid rgba(125,139,176,0.16)",
      boxShadow: highlight
        ? `0 0 ${interpolate(glowT, [0, 1], [10, 46])}px rgba(255,69,96,${interpolate(
            glowT,
            [0, 1],
            [0.3, 0.75]
          )})`
        : "none",
      fontFamily: FONT,
    }}
  >
    <span style={{ color: C.muted, fontSize: 30, fontFamily: MONO }}>#{rank}</span>
    <span
      style={{
        color: highlight ? C.alarm : C.ink,
        fontSize: 32,
        fontWeight: 800,
        fontFamily: MONO,
      }}
    >
      {handle}
    </span>
    <span style={{ color: C.ink, fontSize: 28, fontWeight: 700, textAlign: "right", opacity: 0.9 }}>
      {bal}
    </span>
    <span
      style={{
        justifySelf: "end",
        color: highlight ? C.alarm : C.muted,
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: 1,
        border: `1px solid ${highlight ? C.alarm : "rgba(125,139,176,0.3)"}`,
        borderRadius: 999,
        padding: "6px 16px",
      }}
    >
      {role}
    </span>
  </div>
);

/** The big WHO SOLD? lockup — matches the landing hero. */
export const WhoSoldLogo: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 900,
      lineHeight: 0.86,
      fontSize: 210 * scale,
      letterSpacing: -6,
      color: C.ink,
      textAlign: "center",
      textShadow: `8px 8px 0 rgba(255,69,96,0.28)`,
    }}
  >
    WHO
    <br />
    SOLD
    <span style={{ color: C.alarm }}>?</span>
  </div>
);
