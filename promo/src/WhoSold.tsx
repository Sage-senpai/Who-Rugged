import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { FPS } from "./brand";
import durations from "./audio/vo-durations.json";
import { Pings } from "./scenes/Pings";
import { Rush } from "./scenes/Rush";
import { Watched } from "./scenes/Watched";
import { Oracle } from "./scenes/Oracle";
import { Promo } from "./scenes/Promo";

const VO_DELAY = 6; // frames before VO starts inside a scene (see Vo.tsx)
const XFADE = 12; // cross-fade frames between scenes

// Extra hold after each scene's narration finishes (frames).
const TAIL = { s1_pings: 24, s2_rush: 18, s3_watched: 20, s4_oracle: 30, s5_promo: 70 };

const d = durations as Record<string, number>;
const len = (id: keyof typeof TAIL) =>
  VO_DELAY + Math.ceil(d[id] * FPS) + TAIL[id];

export const SCENES = [
  { id: "s1_pings", Comp: Pings, frames: len("s1_pings") },
  { id: "s2_rush", Comp: Rush, frames: len("s2_rush") },
  { id: "s3_watched", Comp: Watched, frames: len("s3_watched") },
  { id: "s4_oracle", Comp: Oracle, frames: len("s4_oracle") },
  { id: "s5_promo", Comp: Promo, frames: len("s5_promo") },
] as const;

export const TOTAL_FRAMES =
  SCENES.reduce((sum, s) => sum + s.frames, 0) - XFADE * (SCENES.length - 1);

export const WhoSold: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <TransitionSeries>
        {SCENES.map((s, i) => (
          <React.Fragment key={s.id}>
            <TransitionSeries.Sequence durationInFrames={s.frames}>
              <s.Comp />
            </TransitionSeries.Sequence>
            {i < SCENES.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: XFADE })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
