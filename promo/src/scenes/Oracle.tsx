import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { Backdrop, Glow, Grain } from "../components/FX";
import { Vo } from "../components/Vo";
import { C, FONT, MONO } from "../brand";

const PAYOUTS = [
  { at: 96, who: "@degen_seer", amt: "+420", y: -120 },
  { at: 108, who: "@onchain_owl", amt: "+185", y: 0 },
  { at: 120, who: "@rugwatch", amt: "+260", y: 120 },
];

export const Oracle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Balance drains 250,000 -> 0 as the sell lands.
  const bal = Math.round(
    interpolate(frame, [6, 30], [250000, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    })
  );
  const flash = frame < 10 ? interpolate(frame, [0, 4, 10], [0, 0.9, 0]) : 0;

  // DUMPED stamp slams in.
  const stampT = spring({ frame: frame - 30, fps, config: { damping: 9, mass: 0.8 } });
  const stampScale = interpolate(stampT, [0, 1], [2.4, 1]);
  const stampRot = interpolate(stampT, [0, 1], [-18, -9]);

  // Oracle confirmation line.
  const oracleIn = spring({ frame: frame - 66, fps, config: { damping: 16 } });

  return (
    <Backdrop tint="#1c0b12">
      <Vo file="s4_oracle" />
      <Glow color="rgba(255,69,96,0.5)" y="42%" size={1300} intensity={0.5} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, textAlign: "center", width: 900 }}>
          <div style={{ color: C.muted, fontSize: 28, letterSpacing: 4, fontWeight: 700 }}>
            WALLET BALANCE
          </div>
          <div
            style={{
              color: bal === 0 ? C.alarm : C.ink,
              fontSize: 120,
              fontWeight: 900,
              fontFamily: MONO,
              marginTop: 6,
            }}
          >
            {bal.toLocaleString()}
          </div>

          {/* DUMPED stamp */}
          <div style={{ position: "relative", height: 200, marginTop: 10 }}>
            {stampT > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${stampScale}) rotate(${stampRot}deg)`,
                  opacity: Math.min(1, stampT * 1.4),
                }}
              >
                <span
                  style={{
                    color: C.alarm,
                    fontSize: 150,
                    fontWeight: 900,
                    letterSpacing: 8,
                    border: `10px solid ${C.alarm}`,
                    padding: "8px 44px",
                    borderRadius: 16,
                    textShadow: "0 0 40px rgba(255,69,96,0.6)",
                    boxShadow: "0 0 60px rgba(255,69,96,0.4)",
                  }}
                >
                  DUMPED
                </span>
              </div>
            )}
          </div>

          {/* Oracle read confirmation */}
          <div
            style={{
              opacity: oracleIn,
              transform: `translateY(${interpolate(oracleIn, [0, 1], [20, 0])}px)`,
              marginTop: 30,
              color: C.lime,
              fontSize: 34,
              fontWeight: 800,
              fontFamily: MONO,
            }}
          >
            ◎ ORACLE · ALCHEMY READ THE CHAIN ✓
          </div>
        </div>
      </AbsoluteFill>

      {/* payouts flying to the predictors who called it */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        {PAYOUTS.map((p) => {
          const t = spring({ frame: frame - p.at, fps, config: { damping: 15 } });
          if (t <= 0) return null;
          return (
            <div
              key={p.who}
              style={{
                position: "absolute",
                right: interpolate(t, [0, 1], [-40, 90]),
                top: `calc(50% + ${p.y}px)`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: interpolate(t, [0, 0.2, 1], [0, 1, 1]),
                transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`,
                background: "rgba(57,255,20,0.12)",
                border: `1px solid ${C.lime}`,
                borderRadius: 999,
                padding: "12px 22px",
                fontFamily: MONO,
              }}
            >
              <span style={{ color: C.ink, fontSize: 24 }}>{p.who}</span>
              <span style={{ color: C.lime, fontSize: 28, fontWeight: 800 }}>{p.amt} $GG</span>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* white sell-flash */}
      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
      <Grain />
    </Backdrop>
  );
};
