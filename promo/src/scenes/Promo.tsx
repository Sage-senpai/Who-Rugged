import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Backdrop, Glow, Grain } from "../components/FX";
import { WhoSoldLogo } from "../components/UI";
import { Vo } from "../components/Vo";
import { C, FONT, MONO } from "../brand";

const BADGES = ["$ANSEM AIRDROP", "ON-CHAIN ORACLE", "PARIMUTUEL", "WINDOW / 12H"];

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoT = spring({ frame: frame - 4, fps, config: { damping: 15 } });
  const tagT = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const badgeBase = 46;
  const ctaT = spring({ frame: frame - 74, fps, config: { damping: 14 } });
  const ctaPulse = 1 + Math.sin(frame / 7) * 0.02;

  return (
    <Backdrop tint="#0c1730">
      <Vo file="s5_promo" />
      <Glow color="rgba(255,69,96,0.35)" y="34%" size={1300} intensity={0.45} />
      <Glow color="rgba(255,215,0,0.18)" y="70%" size={900} intensity={0.4} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, textAlign: "center", width: 940 }}>
          <div
            style={{
              color: C.gold,
              fontSize: 26,
              letterSpacing: 8,
              fontWeight: 800,
              opacity: logoT,
              marginBottom: 22,
            }}
          >
            AIRDROP BETRAYAL MARKET
          </div>

          <div
            style={{
              transform: `scale(${interpolate(logoT, [0, 1], [0.85, 1])})`,
              opacity: logoT,
            }}
          >
            <WhoSoldLogo scale={1} />
          </div>

          <div
            style={{
              marginTop: 34,
              color: C.ink,
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.25,
              opacity: tagT,
              transform: `translateY(${interpolate(tagT, [0, 1], [22, 0])}px)`,
            }}
          >
            The bet isn't on a price.
            <br />
            <span style={{ color: C.alarm }}>It's on a person.</span>
          </div>

          {/* badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              justifyContent: "center",
              marginTop: 40,
            }}
          >
            {BADGES.map((b, i) => {
              const bt = spring({ frame: frame - badgeBase - i * 6, fps, config: { damping: 16 } });
              return (
                <span
                  key={b}
                  style={{
                    opacity: bt,
                    transform: `translateY(${interpolate(bt, [0, 1], [16, 0])}px)`,
                    color: C.muted,
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    border: "1px solid rgba(125,139,176,0.3)",
                    borderRadius: 999,
                    padding: "12px 22px",
                  }}
                >
                  {b}
                </span>
              );
            })}
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: 54,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
              opacity: ctaT,
              transform: `translateY(${interpolate(ctaT, [0, 1], [24, 0])}px)`,
            }}
          >
            <div
              style={{
                background: `linear-gradient(180deg, ${C.gold}, #d9af00)`,
                color: "#1a1400",
                fontSize: 46,
                fontWeight: 900,
                letterSpacing: 2,
                padding: "26px 64px",
                borderRadius: 18,
                transform: `scale(${ctaPulse})`,
                boxShadow: "0 0 60px rgba(255,215,0,0.4)",
              }}
            >
              ▶ ENTER THE MARKET
            </div>
            <div style={{ color: C.muted, fontSize: 28, fontFamily: MONO }}>
              who-rugged · <span style={{ color: C.cyan }}>WHO RUGGED?</span> universe
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </Backdrop>
  );
};
