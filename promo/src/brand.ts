import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const inter = loadInter("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

// WHO SOLD? palette — pulled from src/sold/sold-landing.css.
export const C = {
  bg: "#070b16",
  bgDeep: "#04060d",
  panel: "#0d1424",
  panelSoft: "#111a2e",
  ink: "#eef2ff",
  muted: "#7d8bb0",
  line: "rgba(125,139,176,0.18)",

  alarm: "#ff4560", // DUMPS / red betrayal
  gold: "#ffd700", // window / money
  lime: "#39ff14", // HOLDS / paid
  cyan: "#00d4ff", // who rugged accent
} as const;

export const FONT = inter.fontFamily;
export const MONO = mono.fontFamily;
export const FPS = 30;
export const W = 1080;
export const H = 1920;
