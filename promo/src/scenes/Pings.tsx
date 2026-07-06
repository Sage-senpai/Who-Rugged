import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Backdrop, Glow, Grain } from "../components/FX";
import { Phone, XPush } from "../components/Phone";
import { Vo } from "../components/Vo";
import { C, FONT } from "../brand";

const PINGS = [
  { at: 12, title: "Airdrop", body: "🪂 You received 250,000 $ANSEM", time: "now", accent: C.gold },
  { at: 40, title: "@blknoiz06", body: "the $ANSEM drop is LIVE. check your wallets 👀", time: "3:01", accent: C.ink },
  { at: 70, title: "Solscan Alerts", body: "Incoming transfer confirmed · +250,000 ANSEM", time: "3:01", accent: C.lime },
];

/** A single ping: springs in from the top with a short buzz-shake. */
const Ping: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - at;
  if (local < 0) return null;
  const s = spring({ frame: local, fps, config: { damping: 14, mass: 0.7 } });
  const y = interpolate(s, [0, 1], [-90, 0]);
  const shake = local < 10 ? Math.sin(local * 3) * (10 - local) * 0.8 : 0;
  return (
    <div style={{ transform: `translate(${shake}px, ${y}px)`, opacity: s }}>{children}</div>
  );
};

export const Pings: React.FC = () => {
  const frame = useCurrentFrame();
  const glowUp = interpolate(frame, [10, 90], [0.2, 0.7], { extrapolateRight: "clamp" });
  return (
    <Backdrop tint="#141026">
      <Vo file="s1_pings" />
      <Glow color="rgba(255,215,0,0.5)" y="30%" size={1100} intensity={glowUp} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Phone time="3:01" glow={`rgba(255,215,0,${glowUp})`}>
          {PINGS.map((p) => (
            <Ping key={p.title} at={p.at}>
              <XPush title={p.title} body={p.body} time={p.time} accent={p.accent} />
            </Ping>
          ))}
        </Phone>
      </AbsoluteFill>

      {/* opening line */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 90 }}>
        <div
          style={{
            fontFamily: FONT,
            color: C.muted,
            fontSize: 30,
            letterSpacing: 6,
            fontWeight: 700,
            opacity: interpolate(frame, [0, 20, 120, 140], [0, 1, 1, 0.6]),
          }}
        >
          3:00 AM
        </div>
      </AbsoluteFill>
      <Grain />
    </Backdrop>
  );
};
