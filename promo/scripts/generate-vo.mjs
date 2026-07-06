// Generates the WHO SOLD? promo voiceover with ElevenLabs.
// Writes public/vo/<id>.wav for each line and src/audio/vo-durations.json
// (seconds per line) which calculateMetadata reads to size each scene.
//
// Reads ELEVENLABS_API_KEY / ELEVEN_VOICE_ID / ELEVEN_MODEL_ID from .env.
// Run: node scripts/generate-vo.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, isAbsolute } from "node:path";

const ROOT = process.cwd();

// --- config ------------------------------------------------------------------
function envFile() {
  try {
    return readFileSync(join(ROOT, ".env"), "utf8");
  } catch {
    return "";
  }
}
const ENV = envFile();
function envVar(name, fallback) {
  if (process.env[name]) return process.env[name];
  const m = ENV.match(new RegExp("^" + name + "=(.+)$", "m"));
  return m ? m[1].trim() : fallback;
}

const KEY = envVar("ELEVENLABS_API_KEY");
const VOICE_ID = envVar("ELEVEN_VOICE_ID", "iP95p4xoKVk53GoZ742B"); // Chris
const MODEL_ID = envVar("ELEVEN_MODEL_ID", "eleven_multilingual_v2");
const OUTPUT_FORMAT = "mp3_44100_128";
// Low stability = cold, menacing, dynamic delivery. Style pushes expressiveness.
const VOICE_SETTINGS = {
  stability: 0.3,
  similarity_boost: 0.85,
  style: 0.5,
  use_speaker_boost: true,
};

if (!KEY) {
  console.error("ELEVENLABS_API_KEY not found in env or .env");
  process.exit(1);
}

const ffmpeg = (() => {
  const local = join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
  return existsSync(local) ? local : "ffmpeg";
})();

function wavDurationSeconds(path) {
  const b = readFileSync(path);
  let p = 12,
    sr = 22050,
    ch = 1,
    bps = 16,
    dataLen = 0;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4);
    const len = b.readUInt32LE(p + 4);
    if (id === "fmt ") {
      ch = b.readUInt16LE(p + 10);
      sr = b.readUInt32LE(p + 12);
      bps = b.readUInt16LE(p + 22);
    }
    if (id === "data") dataLen = len;
    p += 8 + len + (len % 2);
  }
  return dataLen / (sr * ch * (bps / 8));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, mp3Path) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
    });
    if (res.ok) {
      writeFileSync(mp3Path, Buffer.from(await res.arrayBuffer()));
      return;
    }
    const body = await res.text();
    if (res.status === 429 && attempt < 4) {
      console.warn(`  rate limited, retry ${attempt}...`);
      await sleep(2500 * attempt);
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }
}

const cfg = JSON.parse(readFileSync(join(ROOT, "scripts/vo-lines.json"), "utf8"));
const outDir = isAbsolute(cfg.outDir) ? cfg.outDir : join(ROOT, cfg.outDir);
mkdirSync(outDir, { recursive: true });

console.log(`voice ${VOICE_ID} · model ${MODEL_ID}`);
const durations = {};
for (const line of cfg.lines) {
  const mp3 = join(outDir, line.id + ".mp3");
  const wav = join(outDir, line.id + ".wav");
  await tts(line.text, mp3);
  execFileSync(ffmpeg, ["-y", "-i", mp3, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", wav], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  rmSync(mp3, { force: true });
  durations[line.id] = +wavDurationSeconds(wav).toFixed(3);
  console.log(`  ${line.id}  ${durations[line.id]}s`);
  await sleep(400);
}

mkdirSync(join(ROOT, "src/audio"), { recursive: true });
writeFileSync(join(ROOT, "src/audio/vo-durations.json"), JSON.stringify(durations, null, 2) + "\n");
console.log("updated src/audio/vo-durations.json\ndone.");
