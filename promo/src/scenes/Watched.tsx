import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Backdrop, Glow, Grain } from "../components/FX";
import { OddsBar, LeaderRow } from "../components/UI";
import { Vo } from "../components/Vo";
import { C, FONT } from "../brand";

const ROWS = [
  { rank: 1, handle: "blknoiz06", bal: "586.6M", role: "KINGPIN" },
  { rank: 2, handle: "0xYOU.sol", bal: "250K", role: "FRESH BAG", you: true },
  { rank: 3, handle: "cryptowhizz", bal: "9.5M", role: "VOCAL HOLDER" },
  { rank: 4, handle: "Whale_8wLP", bal: "5.2M", role: "GHOST WALLET" },
];

export const Watched: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headIn = spring({ frame, fps, config: { damping: 16 } });
  const oddsT = spring({ frame: frame - 96, fps, config: { damping: 20, mass: 1.1 } });
  const oddsFill = interpolate(oddsT, [0, 1], [0, 0.62]);
  const glowT = interpolate(Math.sin(frame / 8), [-1, 1], [0, 1]);

  return (
    <Backdrop tint="#1a0e18">
      <Vo file="s3_watched" />
      <Glow color="rgba(255,69,96,0.35)" y="50%" size={1200} intensity={0.4} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
        <div style={{ width: 900, fontFamily: FONT }}>
          <div
            style={{
              opacity: headIn,
              transform: `translateY(${interpolate(headIn, [0, 1], [-24, 0])}px)`,
              marginBottom: 34,
            }}
          >
            <div style={{ color: C.alarm, fontSize: 26, fontWeight: 900, letterSpacing: 5 }}>
              THE BETRAYAL REGISTER
            </div>
            <div style={{ color: C.ink, fontSize: 60, fontWeight: 900, lineHeight: 1.05, marginTop: 8 }}>
              Your wallet is public.
              <br />
              <span style={{ color: C.alarm }}>CT already called it.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
            {ROWS.map((r, i) => {
              const rowT = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 18 } });
              return (
                <div
                  key={r.handle}
                  style={{
                    opacity: rowT,
                    transform: `translateX(${interpolate(rowT, [0, 1], [60, 0])}px)`,
                  }}
                >
                  <LeaderRow
                    rank={r.rank}
                    handle={r.handle}
                    bal={r.bal}
                    role={r.role}
                    highlight={r.you}
                    glowT={r.you ? glowT : 0}
                  />
                </div>
              );
            })}
          </div>

          {oddsT > 0 && (
            <div style={{ display: "flex", justifyContent: "center", opacity: oddsT }}>
              <OddsBar p={0.62} live={oddsFill} width={820} />
            </div>
          )}
        </div>
      </AbsoluteFill>
      <Grain />
    </Backdrop>
  );
};
