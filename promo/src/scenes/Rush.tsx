import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { Backdrop, Glow, Grain } from "../components/FX";
import { Vo } from "../components/Vo";
import { C, FONT, MONO } from "../brand";

/** Wallet close-up: balance confirmed, finger lunges for the red SELL button. */
export const Rush: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame, fps, config: { damping: 16 } });
  const bal = Math.round(interpolate(frame, [8, 34], [0, 250000], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  const checkIn = spring({ frame: frame - 34, fps, config: { damping: 12 } });

  // SELL button pulse + a "finger" that lunges in at the end.
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  const fingerT = spring({ frame: frame - 70, fps, config: { damping: 18, mass: 1.2 } });
  const fingerX = interpolate(fingerT, [0, 1], [420, 40]);
  const fingerY = interpolate(fingerT, [0, 1], [520, 250]);
  const press = frame > 100 ? Math.max(0, Math.sin((frame - 100) / 3)) * 0.06 : 0;

  return (
    <Backdrop tint="#0e1830">
      <Vo file="s2_rush" />
      <Glow color="rgba(255,69,96,0.4)" y="66%" size={900} intensity={interpolate(frame, [60, 100], [0.2, 0.6], { extrapolateRight: "clamp" })} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 760,
            borderRadius: 34,
            background: "linear-gradient(180deg,#101a30,#0a1120)",
            border: "1px solid rgba(125,139,176,0.22)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
            padding: 52,
            fontFamily: FONT,
            transform: `scale(${interpolate(cardIn, [0, 1], [0.9, 1])})`,
            opacity: cardIn,
          }}
        >
          <div style={{ color: C.muted, fontSize: 26, letterSpacing: 3, fontWeight: 700 }}>
            YOUR WALLET
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 18 }}>
            <span style={{ color: C.ink, fontSize: 88, fontWeight: 900, fontFamily: MONO }}>
              {bal.toLocaleString()}
            </span>
            <span style={{ color: C.gold, fontSize: 40, fontWeight: 800 }}>$ANSEM</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            <span style={{ color: C.lime, fontSize: 34, fontWeight: 800, opacity: checkIn }}>
              ✓ received
            </span>
            <span style={{ color: C.muted, fontSize: 32, fontFamily: MONO }}>≈ $250,000</span>
          </div>

          {/* SELL button */}
          <div
            style={{
              marginTop: 54,
              height: 128,
              borderRadius: 20,
              background: `linear-gradient(180deg, ${C.alarm}, #c21733)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 58,
              fontWeight: 900,
              letterSpacing: 6,
              transform: `scale(${pulse - press})`,
              boxShadow: `0 0 60px rgba(255,69,96,0.6)`,
            }}
          >
            SELL ALL
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginTop: 18,
              opacity: 0.5,
            }}
          >
            <div style={{ height: 90, borderRadius: 16, border: "1px solid rgba(125,139,176,0.25)" }} />
            <div style={{ height: 90, borderRadius: 16, border: "1px solid rgba(125,139,176,0.25)" }} />
          </div>
        </div>
      </AbsoluteFill>

      {/* the lunging finger */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        {fingerT > 0 && (
          <div
            style={{
              transform: `translate(${fingerX}px, ${fingerY}px)`,
              fontSize: 150,
              filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.6))",
            }}
          >
            👆
          </div>
        )}
      </AbsoluteFill>
      <Grain />
    </Backdrop>
  );
};
