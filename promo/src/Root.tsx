import React from "react";
import { Composition } from "remotion";
import { FPS, W, H } from "./brand";
import { WhoSold, TOTAL_FRAMES } from "./WhoSold";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* WHO SOLD? — Airdrop Betrayal Market promo. Vertical 9:16 for X/social.
          Fully code-animated; ElevenLabs VO (voice Chris) drives scene lengths. */}
      <Composition
        id="WhoSold"
        component={WhoSold}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={W}
        height={H}
      />
    </>
  );
};
