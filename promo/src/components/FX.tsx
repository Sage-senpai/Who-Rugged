import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, random } from "remotion";
import { C } from "../brand";

/** Full-bleed dark base with a subtle vertical vignette + navy gradient. */
export const Backdrop: React.FC<{ children?: React.ReactNode; tint?: string }> = ({
  children,
  tint,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 80% at 50% 0%, ${
        tint ?? "#0c1730"
      } 0%, ${C.bg} 45%, ${C.bgDeep} 100%)`,
    }}
  >
    {children}
    <Scanlines />
    <Vignette />
  </AbsoluteFill>
);

/** CRT scanlines — ties the film to the game's terminal aesthetic. */
export const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 2px, transparent 4px)",
      opacity: 0.5,
      mixBlendMode: "multiply",
    }}
  />
);

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      boxShadow: "inset 0 0 320px 90px rgba(0,0,0,0.85)",
    }}
  />
);

/** Animated film grain via many tiny drifting dots (cheap, deterministic). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  const dots = new Array(70).fill(0).map((_, i) => {
    const x = random(`gx${seed}-${i}`) * 100;
    const y = random(`gy${seed}-${i}`) * 100;
    return `radial-gradient(1.5px 1.5px at ${x}% ${y}%, rgba(255,255,255,0.5), transparent)`;
  });
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", opacity, backgroundImage: dots.join(",") }}
    />
  );
};

/** A soft pulsing glow blob used behind focal elements. */
export const Glow: React.FC<{
  color: string;
  size?: number;
  x?: string;
  y?: string;
  intensity?: number;
}> = ({ color, size = 900, x = "50%", y = "50%", intensity = 0.5 }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 14), [-1, 1], [0.7, 1]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          transform: "translate(-50%,-50%)",
          background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
          opacity: intensity * pulse,
          filter: "blur(14px)",
        }}
      />
    </AbsoluteFill>
  );
};
