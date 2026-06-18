/* Chiptune music engine, synthesized with Web Audio. No audio assets, no
   licensing: every theme is generated from note patterns at runtime, which
   fits the 1986 arcade identity. Each screen gets its own looping track.

   A real-audio path is intentionally easy to add later: replace start()/stop()
   with an <audio> element per track if CC-licensed files are dropped in. */

type TrackName = 'attract' | 'menu' | 'settings' | 'stats' | 'how' | 'play'

interface Voice {
  pattern: (string | null)[] // 16 steps of note names or null (rest)
  type: OscillatorType
  gain: number
  dur: number // seconds
}

interface Track {
  tempo: number // bpm
  bass: Voice
  lead: Voice
  hat: boolean[]
  kick: boolean[]
}

// note name -> MIDI -> frequency
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function freq(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  if (!m) return 0
  let n = SEMI[m[1]]
  if (m[2] === '#') n += 1
  if (m[2] === 'b') n -= 1
  const midi = (Number(m[3]) + 1) * 12 + n
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const _ = null
const X = true
const o = false

// 16-step themes. Each is a distinct key, tempo, and mood.
const TRACKS: Record<TrackName, Track> = {
  // landing attract loop: A major, bright and catchy
  attract: {
    tempo: 116,
    bass: { type: 'triangle', gain: 0.09, dur: 0.16,
      pattern: ['A2', _, 'A2', _, 'E2', _, 'E2', _, 'F#2', _, 'F#2', _, 'D2', _, 'E2', _] },
    lead: { type: 'square', gain: 0.05, dur: 0.13,
      pattern: ['A4', 'C#5', 'E5', 'A5', 'E5', 'C#5', _, 'B4', 'D5', 'F#5', _, 'A5', 'F#5', 'D5', 'C#5', _] },
    hat: [o, X, o, X, o, X, o, X, o, X, o, X, o, X, o, X],
    kick: [X, o, o, o, X, o, o, o, X, o, o, o, X, o, o, o],
  },
  // menu: A minor, calm but cool
  menu: {
    tempo: 100,
    bass: { type: 'triangle', gain: 0.09, dur: 0.18,
      pattern: ['A2', _, _, _, 'A2', _, _, _, 'F2', _, _, _, 'G2', _, _, _] },
    lead: { type: 'square', gain: 0.045, dur: 0.14,
      pattern: ['A4', 'C5', 'E5', 'C5', 'A4', 'C5', 'E5', 'C5', 'F4', 'A4', 'C5', 'A4', 'G4', 'B4', 'D5', 'B4'] },
    hat: [o, o, X, o, o, o, X, o, o, o, X, o, o, o, X, o],
    kick: [X, o, o, o, o, o, o, o, X, o, o, o, o, o, o, o],
  },
  // settings: C major, slow ambient pads
  settings: {
    tempo: 82,
    bass: { type: 'triangle', gain: 0.07, dur: 0.5,
      pattern: ['C2', _, _, _, _, _, _, _, 'G2', _, _, _, _, _, _, _] },
    lead: { type: 'triangle', gain: 0.04, dur: 0.6,
      pattern: ['E4', _, _, _, 'G4', _, _, _, 'D4', _, _, _, 'E4', _, _, _] },
    hat: [o, o, o, o, o, o, X, o, o, o, o, o, o, o, X, o],
    kick: [X, o, o, o, o, o, o, o, o, o, o, o, o, o, o, o],
  },
  // stats: G major, reflective and a touch bright
  stats: {
    tempo: 94,
    bass: { type: 'triangle', gain: 0.08, dur: 0.18,
      pattern: ['G2', _, _, _, 'D3', _, _, _, 'E3', _, _, _, 'C3', _, _, _] },
    lead: { type: 'square', gain: 0.045, dur: 0.14,
      pattern: ['G4', 'B4', 'D5', _, 'D5', 'B4', 'G4', _, 'C5', 'E5', 'G5', _, 'B4', 'D5', 'G5', _] },
    hat: [o, o, X, o, o, o, X, o, o, o, X, o, o, o, X, o],
    kick: [X, o, o, o, o, o, o, o, X, o, o, o, o, o, o, o],
  },
  // how to play: D major, light and instructional
  how: {
    tempo: 108,
    bass: { type: 'triangle', gain: 0.08, dur: 0.16,
      pattern: ['D2', _, 'D2', _, 'A2', _, _, _, 'B2', _, 'B2', _, 'G2', _, _, _] },
    lead: { type: 'square', gain: 0.045, dur: 0.13,
      pattern: ['D5', 'F#5', 'A5', 'F#5', 'A4', 'C#5', 'E5', _, 'B4', 'D5', 'G5', _, 'A4', 'D5', 'F#5', _] },
    hat: [o, X, o, X, o, X, o, X, o, X, o, X, o, X, o, X],
    kick: [X, o, o, o, X, o, o, o, X, o, o, o, X, o, o, o],
  },
  // gameplay: D minor, tense and driving
  play: {
    tempo: 130,
    bass: { type: 'square', gain: 0.08, dur: 0.12,
      pattern: ['D2', _, 'D2', _, 'D2', _, 'F2', _, 'C2', _, 'C2', _, 'A1', _, 'A1', _] },
    lead: { type: 'square', gain: 0.04, dur: 0.12,
      pattern: ['D5', _, _, _, _, _, 'F5', _, 'E5', _, _, _, 'A4', _, 'C5', _] },
    hat: [X, o, X, o, X, o, X, o, X, o, X, o, X, o, X, o],
    kick: [X, o, o, o, X, o, o, o, X, o, o, o, X, o, o, o],
  },
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

let enabled = true
let desired: TrackName | null = null
let playing: TrackName | null = null
let timer: number | null = null
let nextNoteTime = 0
let step = 0

const VOLUME = 0.5
const LOOKAHEAD = 25 // ms
const AHEAD = 0.12 // s

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    // short noise buffer for the hat
    const len = Math.floor(ctx.sampleRate * 0.05)
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

function tone(f: number, type: OscillatorType, gain: number, dur: number, when: number): void {
  if (!ctx || !master || f <= 0) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f, when)
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(g).connect(master)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

function kick(when: number): void {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, when)
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.11)
  g.gain.setValueAtTime(0.13, when)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13)
  osc.connect(g).connect(master)
  osc.start(when)
  osc.stop(when + 0.15)
}

function hat(when: number): void {
  if (!ctx || !master || !noiseBuf) return
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 7000
  src.buffer = noiseBuf
  g.gain.setValueAtTime(0.03, when)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03)
  src.connect(hp).connect(g).connect(master)
  src.start(when)
  src.stop(when + 0.04)
}

function scheduleStep(t: Track, s: number, when: number): void {
  const b = t.bass.pattern[s]
  if (b) tone(freq(b), t.bass.type, t.bass.gain, t.bass.dur, when)
  const l = t.lead.pattern[s]
  if (l) tone(freq(l), t.lead.type, t.lead.gain, t.lead.dur, when)
  if (t.hat[s]) hat(when)
  if (t.kick[s]) kick(when)
}

function scheduler(): void {
  if (!ctx || !playing) return
  const t = TRACKS[playing]
  const sixteenth = (60 / t.tempo) * 0.25
  while (nextNoteTime < ctx.currentTime + AHEAD) {
    scheduleStep(t, step, nextNoteTime)
    nextNoteTime += sixteenth
    step = (step + 1) % 16
  }
}

function begin(track: TrackName): void {
  const a = ensure()
  if (!a || !master) return
  if (playing === track && timer !== null) return
  if (timer !== null) window.clearInterval(timer)
  playing = track
  step = 0
  nextNoteTime = a.currentTime + 0.05
  master.gain.cancelScheduledValues(a.currentTime)
  master.gain.setValueAtTime(master.gain.value, a.currentTime)
  master.gain.linearRampToValueAtTime(VOLUME, a.currentTime + 0.4)
  timer = window.setInterval(scheduler, LOOKAHEAD)
}

export const music = {
  /** Pick the track for the current screen. Starts only once the context is
   *  running (after a user gesture); otherwise it waits for resume(). */
  play(track: TrackName): void {
    desired = track
    if (!enabled) return
    const a = ensure()
    if (!a) return
    if (a.state === 'running') begin(track)
  },
  stop(): void {
    const a = ctx
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
    playing = null
    if (a && master) {
      master.gain.cancelScheduledValues(a.currentTime)
      master.gain.linearRampToValueAtTime(0, a.currentTime + 0.25)
    }
  },
  /** Call from a user gesture so the browser allows audio. */
  resume(): void {
    const a = ensure()
    if (!a) return
    if (a.state === 'suspended') {
      void a.resume().then(() => {
        if (enabled && desired) begin(desired)
      })
    } else if (enabled && desired && playing !== desired) {
      begin(desired)
    }
  },
  setEnabled(v: boolean): void {
    enabled = v
    if (!v) this.stop()
    else if (desired) this.play(desired)
  },
  isEnabled(): boolean {
    return enabled
  },
}
