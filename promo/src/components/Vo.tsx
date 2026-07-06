import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

/** Plays a scene's voiceover, delayed a few frames so visuals land first. */
export const Vo: React.FC<{ file: string; delay?: number }> = ({ file, delay = 6 }) => (
  <Sequence from={delay} name={`vo:${file}`}>
    <Audio src={staticFile(`vo/${file}.wav`)} />
  </Sequence>
);
