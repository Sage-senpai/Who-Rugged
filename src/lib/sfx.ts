/* Tiny arcade sound effects, synthesized with Web Audio so the bundle ships
   zero audio assets and dodges licensing. Blips only. Off by default until a
   user gesture, and fully gated by the Settings "sound" toggle. */

type Sound = 'select' | 'back' | 'toggle' | 'scan' | 'seal' | 'win' | 'lose' | 'buzz' | 'warn'

let ctx: AudioContext | null = null
let enabled = true

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  // browsers suspend the context until a gesture resumes it
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(freq: number, dur: number, type: OscillatorType, when = 0, gain = 0.06): void {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + when
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur)
}

/** Two-note arpeggio helper for the resolution stings. */
function chord(freqs: number[], step: number, dur: number, type: OscillatorType): void {
  freqs.forEach((f, i) => blip(f, dur, type, i * step))
}

export const sfx = {
  setEnabled(v: boolean): void {
    enabled = v
  },
  isEnabled(): boolean {
    return enabled
  },
  play(sound: Sound): void {
    if (!enabled) return
    switch (sound) {
      case 'select':
        blip(660, 0.06, 'square')
        blip(990, 0.07, 'square', 0.045)
        break
      case 'back':
        blip(520, 0.06, 'square')
        blip(390, 0.08, 'square', 0.045)
        break
      case 'toggle':
        blip(740, 0.05, 'square', 0, 0.05)
        break
      case 'scan':
        blip(880, 0.05, 'square')
        blip(1180, 0.06, 'square', 0.05)
        blip(1560, 0.08, 'square', 0.1)
        break
      case 'seal':
        blip(240, 0.14, 'sawtooth', 0, 0.08)
        blip(120, 0.18, 'square', 0.02, 0.07)
        break
      case 'win':
        chord([523, 659, 784, 1046], 0.085, 0.18, 'square')
        break
      case 'lose':
        chord([392, 311, 233, 196], 0.1, 0.22, 'sawtooth')
        break
      case 'buzz':
        blip(170, 0.2, 'sawtooth', 0, 0.1)
        blip(120, 0.26, 'sawtooth', 0.13, 0.1)
        break
      case 'warn':
        blip(900, 0.08, 'square', 0, 0.06)
        break
    }
  },
}
