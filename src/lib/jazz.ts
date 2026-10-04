/* Generative small-combo jazz, pure Web Audio. No samples, no downloads, no
   licensing: a Rhodes-style FM piano, walking upright bass, brush drums and a
   muted-trumpet lead improvise over original arrangements of common
   progressions (jazz blues, rhythm-changes A section, ii-V turnarounds, bossa
   cycles). Everything is generated at runtime from a lookahead scheduler.

   The engine renders into any BaseAudioContext, so the same code runs live
   (AudioContext) and offline (renderOffline, used by tests).

   Tuning knobs live in TUNING and the MOODS table below. */

export type JazzMood = 'lounge' | 'ballad' | 'bossa'

/* ------------------------------------------------------------------ tuning */
const TUNING = {
  master: 0.5, // default master volume (0..1)
  makeup: 1.4, // pre-compressor gain
  piano: 0.27,
  bass: 0.36,
  drums: 0.8,
  lead: 0.34,
  sendPiano: 0.3,
  sendBass: 0.07,
  sendDrums: 0.22,
  sendLead: 0.42,
  lowpassHz: 9000,
  reverbSecs: 1.4,
  lookahead: 0.2, // schedule this far ahead, seconds
  tickMs: 25,
  maxVoices: 220, // live only; whole bars are scheduled ahead so this is generous
  leadPlayProb: 0.6, // chance a bar gets a lead phrase in an active chorus
  leadChorusProb: 0.6, // chance a chorus has a lead at all
}

type ChordType = 'maj7' | 'm7' | '7' | 'm7b5'
type Chord = [number, ChordType] // [root semitones above tonic, quality]
type Bar = Chord[] // 1 chord (4 beats) or 2 chords (2 beats each)

interface Form {
  id: string
  name: string
  minor: boolean
  bars: Bar[]
}

const FORMS: Record<string, Form> = {
  blues: {
    id: 'blues', name: 'Blues', minor: false,
    bars: [
      [[0, '7']], [[5, '7']], [[0, '7']], [[7, 'm7'], [0, '7']],
      [[5, '7']], [[5, '7']], [[0, '7']], [[4, 'm7b5'], [9, '7']],
      [[2, 'm7']], [[7, '7']], [[0, '7'], [9, '7']], [[2, 'm7'], [7, '7']],
    ],
  },
  rhythm: {
    id: 'rhythm', name: 'Changes', minor: false,
    bars: [
      [[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']], [[4, 'm7'], [9, '7']], [[2, 'm7'], [7, '7']],
      [[0, 'maj7'], [0, '7']], [[5, 'maj7'], [5, 'm7']], [[0, 'maj7'], [7, '7']], [[2, 'm7'], [7, '7']],
    ],
  },
  ballad: {
    id: 'ballad', name: 'Ballad', minor: false,
    bars: [
      [[0, 'maj7'], [4, 'm7']], [[5, 'maj7'], [5, 'm7']], [[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']],
      [[4, 'm7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']],
    ],
  },
  minor: {
    id: 'minor', name: 'Minor', minor: true,
    bars: [
      [[0, 'm7']], [[2, 'm7b5'], [7, '7']], [[0, 'm7']], [[0, 'm7'], [0, '7']],
      [[5, 'm7']], [[10, '7']], [[3, 'maj7']], [[2, 'm7b5'], [7, '7']],
    ],
  },
  bossa: {
    id: 'bossa', name: 'Bossa', minor: false,
    bars: [
      [[0, 'maj7']], [[4, 'm7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7']],
      [[5, 'maj7']], [[5, 'm7'], [10, '7']], [[4, 'm7'], [9, '7']], [[2, 'm7'], [7, '7']],
    ],
  },
  bossaMinor: {
    id: 'bossaMinor', name: 'Bossa', minor: true,
    bars: [
      [[0, 'm7']], [[0, 'm7']], [[2, 'm7b5'], [7, '7']], [[0, 'm7']],
      [[5, 'm7']], [[5, 'm7']], [[2, 'm7b5'], [7, '7']], [[0, 'm7'], [7, '7']],
    ],
  },
}

interface MoodDef {
  title: string
  forms: string[]
  bpm: [number, number]
  swing: number // position of the off-eighth within the beat (0.5 straight, 0.667 triplet)
}

const MOODS: Record<JazzMood, MoodDef> = {
  lounge: { title: 'Lounge', forms: ['blues', 'rhythm'], bpm: [124, 138], swing: 0.655 },
  ballad: { title: 'Ballad', forms: ['ballad', 'minor'], bpm: [62, 66], swing: 0.62 },
  bossa: { title: 'Bossa', forms: ['bossa', 'bossaMinor'], bpm: [122, 126], swing: 0.5 },
}

// tonic pitch class and display name
const MAJOR_KEYS: [number, string][] = [[5, 'F'], [10, 'Bb'], [3, 'Eb']]
const MINOR_KEYS: [number, string][] = [[7, 'Gm'], [0, 'Cm'], [2, 'Dm']]

const CHORD_TONES: Record<ChordType, number[]> = {
  maj7: [0, 4, 7, 11, 14],
  m7: [0, 3, 7, 10, 14],
  '7': [0, 4, 7, 10, 14],
  m7b5: [0, 3, 6, 10],
}
const SCALES: Record<ChordType, number[]> = {
  maj7: [0, 2, 4, 5, 7, 9, 11],
  m7: [0, 2, 3, 5, 7, 9, 10],
  '7': [0, 2, 4, 5, 7, 9, 10],
  m7b5: [0, 1, 3, 5, 6, 8, 10],
}
// comp voicing: third, seventh, and a colour tone chosen from these
const COLOURS: Record<ChordType, number[]> = {
  maj7: [14, 21, 7],
  m7: [14, 17, 7],
  '7': [14, 21, 14],
  m7b5: [6, 17, 6],
}

/* ----------------------------------------------------------------- helpers */
const rnd = () => Math.random()
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
const jit = (r: number) => (rnd() * 2 - 1) * r
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** nearest midi note with pitch class pc to target, within [lo, hi] */
function nearestPc(pc: number, target: number, lo: number, hi: number): number {
  let best = lo
  let bd = 1e9
  for (let m = lo; m <= hi; m++) {
    if ((((m - pc) % 12) + 12) % 12 !== 0) continue
    const d = Math.abs(m - target)
    if (d < bd) { bd = d; best = m }
  }
  return best
}

/** nearest midi note whose pc relative to root is in `set` */
function nearestInSet(rootPc: number, set: number[], est: number): number {
  let best = Math.round(est)
  let bd = 1e9
  const lo = Math.round(est) - 9
  for (let m = lo; m <= lo + 18; m++) {
    const rel = (((m - rootPc) % 12) + 12) % 12
    if (!set.includes(rel)) continue
    const d = Math.abs(m - est)
    if (d < bd) { bd = d; best = m }
  }
  return best
}

interface Motif { pos: number[]; dur: number[]; steps: number[] }

/* ------------------------------------------------------------------ engine */
class Engine {
  readonly ac: BaseAudioContext
  readonly mood: JazzMood
  private def: MoodDef
  private sources = new Set<AudioScheduledSourceNode>()
  private nodes: AudioNode[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private noise!: AudioBuffer
  private volNode!: GainNode
  private fadeNode!: GainNode
  private dry!: GainNode
  private reverbIn!: GainNode
  private pianoBus!: GainNode
  private bassBus!: GainNode
  private drumBus!: GainNode
  private leadBus!: GainNode

  // musical state
  private nextBar = -1
  private bpm = 120
  private beat = 0.5
  private swing = 0.66
  private form!: Form
  private tonic = 5
  private keyName = 'F'
  private barIdx = 0
  private chorus = 0
  private globalBar = 0
  private plan!: { form: Form; tonic: number; keyName: string }
  private compStyle = 'charleston'
  private bassStyle = 'walk'
  private leadOn = false
  private prevVoice: number[] = [58, 64, 69]
  private lastBass = 40
  private lastLead = 74
  private motif: Motif | null = null
  private lastBarHadLead = false
  halted = false
  private live = false

  constructor(ac: BaseAudioContext, mood: JazzMood, vol: number) {
    this.ac = ac
    this.mood = mood
    this.def = MOODS[mood]
    this.buildGraph(vol)
    this.bpm = this.def.bpm[0] + rnd() * (this.def.bpm[1] - this.def.bpm[0])
    this.beat = 60 / this.bpm
    this.chooseFirstForm()
  }

  get voiceCount(): number { return this.sources.size }
  get hasTimer(): boolean { return this.timer !== null }
  get label(): string {
    return `${this.def.title}${this.mood === 'lounge' ? ' ' + this.form.name : ''} in ${this.keyName}`
  }

  /* ---- graph ---- */
  private add<T extends AudioNode>(n: T): T { this.nodes.push(n); return n }

  private src<T extends AudioScheduledSourceNode>(s: T): T {
    this.sources.add(s)
    s.addEventListener('ended', () => { this.sources.delete(s); try { s.disconnect() } catch { /* already gone */ } })
    return s
  }

  private buildGraph(vol: number): void {
    const ac = this.ac
    const sr = ac.sampleRate
    // shared noise buffer (2 s)
    this.noise = ac.createBuffer(1, sr * 2, sr)
    const nd = this.noise.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1

    const comp = this.add(ac.createDynamicsCompressor())
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3
    comp.attack.value = 0.012; comp.release.value = 0.25
    const limiter = this.add(ac.createDynamicsCompressor())
    limiter.threshold.value = -8; limiter.knee.value = 0; limiter.ratio.value = 20
    limiter.attack.value = 0.002; limiter.release.value = 0.1
    const lp = this.add(ac.createBiquadFilter())
    lp.type = 'lowpass'; lp.frequency.value = TUNING.lowpassHz; lp.Q.value = 0.5
    const makeup = this.add(ac.createGain()); makeup.gain.value = TUNING.makeup
    this.volNode = this.add(ac.createGain()); this.volNode.gain.value = vol
    this.fadeNode = this.add(ac.createGain())
    this.fadeNode.gain.setValueAtTime(0, ac.currentTime)
    this.fadeNode.gain.linearRampToValueAtTime(1, ac.currentTime + 0.4)

    this.dry = this.add(ac.createGain())
    this.dry.connect(makeup)
    // reverb
    const conv = this.add(ac.createConvolver())
    conv.buffer = this.makeImpulse()
    this.reverbIn = this.add(ac.createGain())
    const ret = this.add(ac.createGain()); ret.gain.value = 0.9
    this.reverbIn.connect(conv); conv.connect(ret); ret.connect(makeup)
    makeup.connect(comp); comp.connect(limiter); limiter.connect(lp)
    lp.connect(this.volNode); this.volNode.connect(this.fadeNode)
    this.fadeNode.connect(ac.destination)

    const bus = (level: number, send: number): GainNode => {
      const g = this.add(ac.createGain()); g.gain.value = level
      const s = this.add(ac.createGain()); s.gain.value = send
      g.connect(this.dry); g.connect(s); s.connect(this.reverbIn)
      return g
    }
    this.bassBus = bus(TUNING.bass, TUNING.sendBass)
    this.drumBus = bus(TUNING.drums, TUNING.sendDrums)
    this.leadBus = bus(TUNING.lead, TUNING.sendLead)

    // piano: tremolo + chorus on its own bus
    const pianoOut = bus(TUNING.piano, TUNING.sendPiano)
    this.pianoBus = this.add(ac.createGain())
    const trem = this.add(ac.createGain()); trem.gain.value = 0.9
    const tremLfo = this.src(ac.createOscillator()); tremLfo.frequency.value = 4.4
    const tremDepth = this.add(ac.createGain()); tremDepth.gain.value = 0.09
    tremLfo.connect(tremDepth); tremDepth.connect(trem.gain); tremLfo.start()
    this.pianoBus.connect(trem)
    const dryPan = this.add(ac.createStereoPanner()); dryPan.pan.value = -0.25
    trem.connect(dryPan); dryPan.connect(pianoOut)
    const delay = this.add(ac.createDelay(0.1)); delay.delayTime.value = 0.017
    const chLfo = this.src(ac.createOscillator()); chLfo.frequency.value = 0.42
    const chDepth = this.add(ac.createGain()); chDepth.gain.value = 0.0035
    chLfo.connect(chDepth); chDepth.connect(delay.delayTime); chLfo.start()
    const wet = this.add(ac.createGain()); wet.gain.value = 0.45
    const wetPan = this.add(ac.createStereoPanner()); wetPan.pan.value = 0.55
    trem.connect(delay); delay.connect(wet); wet.connect(wetPan); wetPan.connect(pianoOut)

    // continuous brush swirl under the ride (looped noise, bandpassed, pulsing)
    const swirl = this.src(ac.createBufferSource()); swirl.buffer = this.noise; swirl.loop = true
    const bp = this.add(ac.createBiquadFilter()); bp.type = 'bandpass'; bp.frequency.value = 4300; bp.Q.value = 0.6
    const sg = this.add(ac.createGain()); sg.gain.value = this.mood === 'bossa' ? 0.012 : 0.02
    const sl = this.src(ac.createOscillator())
    sl.frequency.value = this.bpmHz() / 2
    const sd = this.add(ac.createGain()); sd.gain.value = this.mood === 'bossa' ? 0.006 : 0.014
    sl.connect(sd); sd.connect(sg.gain)
    swirl.connect(bp); bp.connect(sg); sg.connect(this.drumBus)
    swirl.start(0, rnd()); sl.start()
  }

  private bpmHz(): number { return (this.def.bpm[0] + this.def.bpm[1]) / 2 / 60 }

  private makeImpulse(): AudioBuffer {
    const ac = this.ac
    const sr = ac.sampleRate
    const len = Math.floor(sr * TUNING.reverbSecs)
    const buf = ac.createBuffer(2, len, sr)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let lpState = 0
      for (let i = 0; i < len; i++) {
        const x = i / len
        const env = Math.pow(1 - x, 3.2)
        const coef = 0.55 + 0.4 * x // darker as it decays
        lpState = lpState * coef + (rnd() * 2 - 1) * (1 - coef)
        d[i] = lpState * env * 2.2 * (i < sr * 0.012 ? i / (sr * 0.012) : 1)
      }
    }
    return buf
  }

  /* ---- control ---- */
  setVol(v: number): void {
    this.volNode.gain.setTargetAtTime(v, this.ac.currentTime, 0.05)
  }

  start(live: boolean): void {
    this.live = live
    if (live) this.timer = setInterval(() => this.pump(), TUNING.tickMs)
  }

  /** stop generating; fade out; caller disposes afterwards */
  halt(fade: number): void {
    this.halted = true
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    const g = this.fadeNode.gain
    const t = this.ac.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(0, t + fade)
  }

  dispose(): void {
    this.halted = true
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    for (const s of Array.from(this.sources)) {
      try { s.stop() } catch { /* not started or already stopped */ }
      try { s.disconnect() } catch { /* ignore */ }
    }
    this.sources.clear()
    for (const n of this.nodes) { try { n.disconnect() } catch { /* ignore */ } }
    this.nodes = []
  }

  private pump(): void {
    if (this.halted || this.ac.state !== 'running') return
    if (this.nextBar < 0) this.nextBar = this.ac.currentTime + 0.15
    this.pumpTo(this.ac.currentTime + TUNING.lookahead)
  }

  pumpTo(until: number): void {
    if (this.nextBar < 0) this.nextBar = 0.05
    while (this.nextBar < until) {
      this.scheduleBar(this.nextBar)
      this.nextBar += this.beat * 4
    }
  }

  /* ---- form / key planning ---- */
  private chooseFirstForm(): void {
    const f = FORMS[pick(this.def.forms)]
    const k = pick(f.minor ? MINOR_KEYS : MAJOR_KEYS)
    this.form = f; this.tonic = k[0]; this.keyName = k[1]
    this.plan = this.decideNext()
    this.newChorusParams(true)
  }

  private decideNext(): { form: Form; tonic: number; keyName: string } {
    const sameForm = rnd() < 0.45
    const f = sameForm ? this.form : FORMS[pick(this.def.forms.filter(id => id !== this.form.id))]
    const keys = f.minor ? MINOR_KEYS : MAJOR_KEYS
    const keepKey = f === this.form && rnd() < 0.5
    const k = keepKey ? ([this.tonic, this.keyName] as [number, string]) : pick(keys.filter(x => x[0] !== this.tonic || f.minor !== this.form.minor))
    return { form: f, tonic: k[0], keyName: k[1] }
  }

  private newChorusParams(first: boolean): void {
    this.swing = this.def.swing === 0.5 ? 0.5 : this.def.swing + jit(0.015)
    this.compStyle = this.mood === 'ballad' ? pick(['sparse', 'sparse', 'charleston']) : pick(['charleston', 'charleston', 'sparse', 'active'])
    this.bassStyle = this.mood === 'ballad' ? pick(['twofeel', 'walk', 'twofeel']) : pick(['walk', 'walk', 'walk', 'twofeel'])
    this.leadOn = first ? true : rnd() < TUNING.leadChorusProb
  }

  /* ---- timing ---- */
  private tAt(t0: number, pos: number): number {
    const i = Math.floor(pos + 1e-6)
    const frac = pos - i
    return t0 + (i + (frac > 0.25 ? this.swing : 0)) * this.beat
  }

  private rootOf(c: Chord): number { return (this.tonic + c[0]) % 12 }

  /* ---- bar scheduling ---- */
  private scheduleBar(t0: number): void {
    const bar = this.form.bars[this.barIdx]
    const nextBarChords = this.barIdx + 1 < this.form.bars.length
      ? this.form.bars[this.barIdx + 1]
      : this.plan.form.bars[0]
    const nextTonic = this.barIdx + 1 < this.form.bars.length ? this.tonic : this.plan.tonic
    const nextRoot = (nextTonic + nextBarChords[0][0]) % 12
    const lastBar = this.barIdx === this.form.bars.length - 1
    const firstChorusEarly = this.chorus === 0 && this.barIdx < 3

    this.pianoBar(t0, bar)
    this.bassBar(t0, bar, nextRoot)
    this.drumBar(t0, lastBar)
    if (this.leadOn && !firstChorusEarly) this.leadBar(t0, bar)
    else this.lastBarHadLead = false

    this.globalBar++
    this.barIdx++
    if (this.barIdx >= this.form.bars.length) {
      this.barIdx = 0
      this.chorus++
      this.form = this.plan.form; this.tonic = this.plan.tonic; this.keyName = this.plan.keyName
      this.plan = this.decideNext()
      this.newChorusParams(false)
    }
  }

  /* ---- piano ---- */
  private voicing(c: Chord): number[] {
    const rootPc = this.rootOf(c)
    const ct = CHORD_TONES[c[1]]
    const colour = pick(COLOURS[c[1]])
    const ivs = [ct[1], ct[3], colour]
    const out: number[] = []
    for (let i = 0; i < 3; i++) {
      const pc = (rootPc + ivs[i]) % 12
      let m = nearestPc(pc, this.prevVoice[i], 52, 74)
      if (out.includes(m)) m += m + 12 <= 76 ? 12 : -12
      out.push(m)
    }
    this.prevVoice = out
    return out
  }

  private pianoBar(t0: number, bar: Bar): void {
    const voices = bar.map(c => this.voicing(c))
    let hits: number[]
    if (this.mood === 'bossa') {
      hits = pick([[0, 3, 6], [0, 3, 4, 7], [1, 3, 6], [0, 3, 5, 7], [0, 3, 6, 7]]).map(s => s / 2)
      if (bar.length > 1 && !hits.includes(2)) hits.push(2)
    } else {
      const sets: Record<string, number[][]> = {
        charleston: [[0, 1.5], [0, 1.5], [1.5, 3], [0, 2.5], [1.5], [0, 1.5, 3.5]],
        sparse: this.mood === 'ballad' ? [[0], [0, 2], [1.5], [0, 2.5], [0, 1.5], [2]] : [[1.5], [0], [2.5], [0, 2.5], [1.5, 3.5], [0, 1.5]],
        active: [[0, 1, 2.5], [0, 1.5, 2.5], [1.5, 2.5, 3.5], [0, 1.5, 3]],
      }
      hits = pick(sets[this.compStyle]).slice()
      if (bar.length > 1 && !hits.some(p => p >= 1.5 && p <= 2.5)) hits.push(2)
      if (!hits.length) hits.push(1.5)
    }
    hits.sort((a, b) => a - b)
    const dur = this.mood === 'ballad' ? 2.4 : this.mood === 'bossa' ? 0.5 : 1.0
    hits.forEach((pos, k) => {
      const ci = bar.length > 1 && pos >= 2 ? 1 : 0
      let notes = voices[ci].slice()
      if (k > 0 && rnd() < 0.3) notes = notes.slice(0, 2)
      const vel = clamp(0.6 + jit(0.15) + (Number.isInteger(pos) ? 0.06 : 0), 0.35, 0.95)
      const t = this.tAt(t0, pos) + jit(0.008)
      notes.sort((a, b) => a - b).forEach((m, i) => {
        const roll = this.mood === 'ballad' ? 0.022 : 0.007
        this.rhodes(t + i * roll + jit(0.003), m, vel * (i === notes.length - 1 ? 0.88 : 1), dur * (0.85 + rnd() * 0.3))
      })
    })
  }

  private rhodes(t: number, midi: number, vel: number, dur: number): void {
    if (this.live && this.sources.size > TUNING.maxVoices) return
    const ac = this.ac
    t = Math.max(t, ac.currentTime)
    const f = mtof(midi)
    const car = this.src(ac.createOscillator()); car.type = 'sine'; car.frequency.value = f
    const mod = this.src(ac.createOscillator()); mod.type = 'sine'; mod.frequency.value = f
    const tine = this.src(ac.createOscillator()); tine.type = 'sine'; tine.frequency.value = f * 14
    const modG = ac.createGain()
    modG.gain.setValueAtTime(f * (1.1 + vel * 1.6), t)
    modG.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.55)
    mod.connect(modG); modG.connect(car.frequency)
    const tineG = ac.createGain()
    tineG.gain.setValueAtTime(0.0001, t)
    tineG.gain.linearRampToValueAtTime(0.05 * vel, t + 0.002)
    tineG.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    tine.connect(tineG)
    const amp = ac.createGain()
    const peak = 0.34 * vel
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.linearRampToValueAtTime(peak, t + 0.004)
    amp.gain.exponentialRampToValueAtTime(peak * 0.32, t + 0.28)
    amp.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    car.connect(amp); tineG.connect(amp)
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'
    lp.frequency.value = 1500 + vel * 2400; lp.Q.value = 0.4
    const pan = ac.createStereoPanner(); pan.pan.value = clamp((midi - 62) / 40 + jit(0.25), -0.8, 0.8)
    amp.connect(lp); lp.connect(pan); pan.connect(this.pianoBus)
    const end = t + dur + 0.05
    car.start(t); mod.start(t); tine.start(t)
    car.stop(end); mod.stop(end); tine.stop(end)
  }

  /* ---- bass ---- */
  private bassBar(t0: number, bar: Bar, nextRoot: number): void {
    const ev: { pos: number; midi: number; vel: number; dur: number }[] = []
    const lo = 33, hi = 52
    const c0 = bar[0]
    const c1 = bar[bar.length > 1 ? 1 : 0]
    const r0 = this.rootOf(c0), r1 = this.rootOf(c1)
    const place = (pc: number): number => nearestPc(pc, this.lastBass, lo, hi)
    const push = (pos: number, pc: number, vel: number, dur: number): number => {
      const m = place(pc)
      this.lastBass = m
      ev.push({ pos, midi: m, vel, dur })
      return m
    }
    if (this.mood === 'bossa') {
      const fifth = (r0 + 7) % 12
      push(0, r0, 0.85, 1.4)
      push(1.5, fifth, 0.7, 0.7)
      if (bar.length > 1) {
        push(2, r1, 0.8, 1.3)
        push(3.5, (r1 + 7) % 12, 0.65, 0.5)
      } else {
        push(2, r0, 0.78, 1.3)
        push(3.5, fifth, 0.65, 0.5)
      }
    } else if (this.bassStyle === 'twofeel') {
      push(0, r0, 0.85, 1.7)
      if (bar.length > 1) push(2, r1, 0.78, 1.7)
      else push(2, (r0 + 7) % 12, 0.72, 1.4)
      if (rnd() < 0.6) {
        const app = (nextRoot + (rnd() < 0.5 ? 1 : 11)) % 12
        push(3, app, 0.6, 0.8)
      }
    } else {
      const ct0 = CHORD_TONES[c0[1]]
      push(0, r0, 0.88, this.beat * 0.92)
      const second = pick([ct0[1], ct0[2], ct0[2], 2, ct0[3]])
      push(1, (r0 + second) % 12, 0.74, this.beat * 0.9)
      if (bar.length > 1) {
        push(2, r1, 0.82, this.beat * 0.92)
      } else {
        const opts = [ct0[1], ct0[2], ct0[3]].filter(x => x !== second)
        push(2, (r0 + pick(opts)) % 12, 0.76, this.beat * 0.9)
      }
      const dir = rnd() < 0.15 ? 7 : rnd() < 0.5 ? 1 : 11
      push(3, (nextRoot + dir) % 12, 0.8, this.beat * 0.88)
      if (rnd() < 0.16) {
        const g = ev[1]
        ev.push({ pos: 1.66, midi: g.midi, vel: 0.28, dur: 0.1 })
      }
      if (rnd() < 0.12) {
        const g = ev[2]
        ev.push({ pos: 2.66, midi: g.midi, vel: 0.26, dur: 0.1 })
      }
    }
    for (const e of ev) {
      const frac = e.pos - Math.floor(e.pos)
      const t = frac > 0.6 && frac < 0.7 ? t0 + e.pos * this.beat : this.tAt(t0, e.pos)
      const dur = e.dur > 0.2 ? Math.min(e.dur * (this.mood === 'bossa' || this.bassStyle === 'twofeel' ? this.beat : 1), this.beat * 2.2) : e.dur
      this.pluck(t + 0.005 + jit(0.004), e.midi, e.vel, dur)
    }
  }

  private pluck(t: number, midi: number, vel: number, dur: number): void {
    if (this.live && this.sources.size > TUNING.maxVoices + 40) return
    const ac = this.ac
    t = Math.max(t, ac.currentTime)
    const f = mtof(midi)
    const o1 = this.src(ac.createOscillator()); o1.type = 'sine'
    const o2 = this.src(ac.createOscillator()); o2.type = 'triangle'
    const o3 = this.src(ac.createOscillator()); o3.type = 'sine'
    for (const o of [o1, o2]) {
      o.frequency.setValueAtTime(f * 1.035, t)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.035)
    }
    o3.frequency.value = f * 2
    const g2 = ac.createGain(); g2.gain.value = 0.45
    const g3 = ac.createGain(); g3.gain.value = 0.14
    const amp = ac.createGain()
    const peak = 0.55 * vel
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.linearRampToValueAtTime(peak, t + 0.01)
    amp.gain.exponentialRampToValueAtTime(peak * 0.5, t + Math.min(0.25, dur * 0.4))
    amp.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.1)
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7
    lp.frequency.setValueAtTime(1100, t)
    lp.frequency.exponentialRampToValueAtTime(320, t + 0.25)
    o1.connect(amp); o2.connect(g2); g2.connect(amp); o3.connect(g3); g3.connect(amp)
    amp.connect(lp)
    const pan = ac.createStereoPanner(); pan.pan.value = 0.12
    lp.connect(pan); pan.connect(this.bassBus)
    const end = t + dur + 0.15
    for (const o of [o1, o2, o3]) { o.start(t); o.stop(end) }
    // fingertip click
    this.hit(t, 0.012, 1400, 1400, 1.5, 0.05 * vel, this.bassBus, 'bandpass')
  }

  /* ---- drums ---- */
  private hit(
    t: number, dur: number, f0: number, f1: number, q: number, peak: number,
    dest: AudioNode, type: BiquadFilterType = 'bandpass', pan = 0,
  ): void {
    if (this.live && this.sources.size > TUNING.maxVoices + 80) return
    const ac = this.ac
    t = Math.max(t, ac.currentTime)
    const s = this.src(ac.createBufferSource()); s.buffer = this.noise
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8)
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.008, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g)
    if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest) } else g.connect(dest)
    s.start(t, rnd() * 1.5); s.stop(t + dur + 0.03)
  }

  private thump(t: number, f0: number, f1: number, dur: number, peak: number): void {
    const ac = this.ac
    t = Math.max(t, ac.currentTime)
    const o = this.src(ac.createOscillator()); o.type = 'sine'
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.06)
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.drumBus)
    o.start(t); o.stop(t + dur + 0.02)
  }

  private ding(t: number, vel: number, long: boolean): void {
    const dur = long ? 0.3 : 0.2
    this.hit(t, dur, 3200, 7200, 0.9, 0.16 * vel, this.drumBus, 'bandpass', jit(0.2) + 0.25)
  }

  private drumBar(t0: number, lastBar: boolean): void {
    const b = this.beat
    const jt = () => jit(0.007)
    if (this.mood === 'bossa') {
      for (let s = 0; s < 8; s++) {
        const t = t0 + s * b * 0.5
        this.hit(t + jt(), 0.06, 6500, 6000, 1.0, (s % 2 === 0 ? 0.13 : 0.075) * (0.85 + rnd() * 0.3), this.drumBus, 'bandpass', 0.3)
      }
      const clave = this.globalBar % 2 === 0 ? [0, 3, 6] : [2, 4]
      for (const s of clave) {
        const t = t0 + s * b * 0.5 + jt()
        this.hit(t, 0.035, 1500, 1300, 5, 0.22, this.drumBus, 'bandpass', -0.2)
        this.thump(t, 900, 600, 0.03, 0.03)
      }
      for (const s of [0, 3, 4, 7]) this.thump(t0 + s * b * 0.5 + jt(), 85, 48, 0.2, s === 0 || s === 4 ? 0.13 : 0.08)
      return
    }
    const ballad = this.mood === 'ballad'
    // swung ride
    for (let i = 0; i < 4; i++) {
      const accent = i === 1 || i === 3
      if (ballad) {
        this.ding(t0 + i * b + jt(), accent ? 0.5 : 0.38, true)
        if (accent && rnd() < 0.3) this.ding(t0 + (i + this.swing) * b + jt(), 0.26, false)
      } else {
        this.ding(t0 + i * b + jt(), accent ? 0.78 : 0.62, false)
        if (accent && rnd() < 0.92) this.ding(t0 + (i + this.swing) * b + jt(), 0.5, false)
        else if (!accent && rnd() < 0.12) this.ding(t0 + (i + this.swing) * b + jt(), 0.3, false)
      }
    }
    // hi-hat foot on 2 and 4
    for (const i of [1, 3]) {
      this.hit(t0 + i * b + jit(0.006), 0.045, 5200, 4600, 2.2, ballad ? 0.2 : 0.3, this.drumBus, 'bandpass', -0.3)
    }
    // ghosted snare comping
    const ghostP = ballad ? 0.08 : 0.22
    for (let i = 0; i < 4; i++) {
      if (rnd() < ghostP) {
        const t = t0 + (i + this.swing) * b + jt()
        const v = 0.45 + rnd() * 0.5
        this.hit(t, 0.09, 2100, 1800, 0.8, 0.13 * v, this.drumBus, 'bandpass', -0.15)
        this.thump(t, 200, 150, 0.06, 0.04 * v)
      }
    }
    // feathered kick on 1 and 3
    for (const i of [0, 2]) {
      if (rnd() < (ballad ? 0.5 : 0.7)) this.thump(t0 + i * b + jt(), 90, 48, 0.2, ballad ? 0.09 : 0.14)
    }
    // phrase-end brush fill
    if ((lastBar && rnd() < 0.6) || (!lastBar && this.barIdx % 4 === 3 && rnd() < 0.25)) {
      for (let k = 0; k < 3; k++) {
        const t = t0 + (3 + k / 3) * b + jt()
        const v = 0.45 + k * 0.22
        this.hit(t, 0.1, 2300, 2000, 0.8, 0.17 * v, this.drumBus, 'bandpass', 0.1)
        this.thump(t, 210, 160, 0.06, 0.04 * v)
      }
      this.hit(t0 + 2 * b, 0.9 * b, 2500, 6500, 0.7, 0.07, this.drumBus, 'bandpass', 0)
    }
  }

  /* ---- lead ---- */
  private chordAtPos(bar: Bar, pos: number): Chord {
    return bar.length > 1 && pos >= 2 ? bar[1] : bar[0]
  }

  private makeMotif(): Motif {
    const ballad = this.mood === 'ballad'
    const gaps = ballad ? [1, 1, 1.5, 2, 0.5] : this.mood === 'bossa' ? [0.5, 0.5, 1, 1.5] : [0.5, 0.5, 0.5, 1, 1, 1.5]
    const n = ballad ? 2 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 4)
    const pos: number[] = []
    const dur: number[] = []
    let p = pick(ballad ? [0, 0.5, 1, 1.5, 2] : [0, 0, 0.5, 1, 1.5, 2])
    for (let i = 0; i < n && p < 4; i++) {
      pos.push(p)
      const g = pick(gaps)
      p += g
    }
    for (let i = 0; i < pos.length; i++) {
      const next = i + 1 < pos.length ? pos[i + 1] : Math.min(4, pos[i] + pick([1, 1.5, 2.5]))
      dur.push(Math.max(0.4, Math.min(3, (next - pos[i]) * 0.9 + (i === pos.length - 1 ? 0.5 : 0))))
    }
    const steps = pos.map(() => pick([-1, -1, 1, 1, 1, -2, 2, 1, -1, 3, -3, 0]))
    return { pos, dur, steps }
  }

  private leadBar(t0: number, bar: Bar): void {
    const respond = this.motif && this.lastBarHadLead
    const play = respond ? rnd() < 0.7 : rnd() < TUNING.leadPlayProb * (this.mood === 'ballad' ? 0.85 : 1)
    if (!play) { this.lastBarHadLead = false; return }
    let m: Motif
    if (respond && this.motif) {
      m = { pos: this.motif.pos, dur: this.motif.dur, steps: this.motif.steps.map(s => (rnd() < 0.4 ? -s : s)) }
    } else {
      m = this.makeMotif()
    }
    this.motif = m
    this.lastBarHadLead = true
    const n = m.pos.length
    const midi: number[] = new Array(n).fill(0)
    const isTarget = m.pos.map((p, i) => i === 0 || Number.isInteger(p))
    let est = this.lastLead
    // pass 1: targets land on chord tones
    for (let i = 0; i < n; i++) {
      est = clamp(est + m.steps[i] * 1.7, 66, 82)
      if (isTarget[i]) {
        const c = this.chordAtPos(bar, m.pos[i])
        midi[i] = nearestInSet(this.rootOf(c), CHORD_TONES[c[1]].map(x => x % 12), est)
        est = midi[i]
      }
    }
    // pass 2: fill with scale tones, sometimes a chromatic approach to the next target
    est = this.lastLead
    for (let i = 0; i < n; i++) {
      if (isTarget[i]) { est = midi[i]; continue }
      const c = this.chordAtPos(bar, m.pos[i])
      const next = i + 1 < n && isTarget[i + 1] ? midi[i + 1] : null
      if (next !== null && rnd() < 0.4) midi[i] = next + (rnd() < 0.5 ? 1 : -1)
      else midi[i] = nearestInSet(this.rootOf(c), SCALES[c[1]], clamp(est + m.steps[i] * 1.7, 64, 84))
      est = midi[i]
    }
    this.lastLead = midi[n - 1]
    const behind = 0.012
    for (let i = 0; i < n; i++) {
      const down = Number.isInteger(m.pos[i])
      const vel = clamp(0.62 + (down ? 0.12 : 0) + jit(0.12), 0.4, 0.95)
      const t = this.tAt(t0, m.pos[i]) + behind + jit(0.008)
      const endT = this.tAt(t0, m.pos[i] + m.dur[i])
      this.trumpet(t, midi[i], vel, Math.max(0.12, (endT - t) * 0.96))
    }
  }

  private trumpet(t: number, midi: number, vel: number, dur: number): void {
    if (this.live && this.sources.size > TUNING.maxVoices) return
    const ac = this.ac
    t = Math.max(t, ac.currentTime)
    const f = mtof(midi)
    const ballad = this.mood === 'ballad'
    const o1 = this.src(ac.createOscillator()); o1.type = 'sawtooth'; o1.frequency.value = f
    const o2 = this.src(ac.createOscillator()); o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = 6
    const g2 = ac.createGain(); g2.gain.value = 0.8
    // light, late-blooming vibrato
    const lfo = this.src(ac.createOscillator()); lfo.frequency.value = 5.1 + jit(0.4)
    const lg = ac.createGain()
    lg.gain.setValueAtTime(0, t)
    lg.gain.linearRampToValueAtTime(ballad ? 22 : 14, t + Math.min(0.35, dur))
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune)
    const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 2.2
    filt.frequency.setValueAtTime(700, t)
    filt.frequency.linearRampToValueAtTime(1500 + vel * 1500, t + 0.06)
    filt.frequency.exponentialRampToValueAtTime(1300, t + Math.max(0.1, dur))
    const mute = ac.createBiquadFilter(); mute.type = 'peaking'; mute.frequency.value = 1500; mute.Q.value = 1.4; mute.gain.value = 6
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280
    const amp = ac.createGain()
    const peak = 0.22 * vel
    const atk = ballad ? 0.07 : 0.045
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.linearRampToValueAtTime(peak, t + atk)
    amp.gain.linearRampToValueAtTime(peak * 0.78, t + Math.max(atk + 0.02, dur * 0.7))
    amp.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1)
    o1.connect(filt); o2.connect(g2); g2.connect(filt)
    filt.connect(mute); mute.connect(hp); hp.connect(amp)
    const pan = ac.createStereoPanner(); pan.pan.value = 0.2
    amp.connect(pan); pan.connect(this.leadBus)
    const end = t + dur + 0.15
    for (const o of [o1, o2, lfo]) { o.start(t); o.stop(end) }
    this.hit(t, 0.08, 3200, 3200, 1.2, 0.012 * vel, this.leadBus, 'bandpass')
  }
}

/* --------------------------------------------------------- public singleton */
let ac: AudioContext | null = null
let engine: Engine | null = null
const dying = new Set<Engine>()
let current: JazzMood = 'lounge'
let playing = false
let vol = TUNING.master

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ac) return ac
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try { ac = new Ctor() } catch { return null }
  return ac
}

function retire(e: Engine, fade: number): void {
  e.halt(fade)
  dying.add(e)
  setTimeout(() => { e.dispose(); dying.delete(e) }, fade * 1000 + 80)
}

export const jazz = {
  /** start (or continue) a mood. No argument keeps the current mood. */
  play(mood?: JazzMood): void {
    const a = ensure()
    if (!a) return
    const m = mood ?? current
    if (playing && engine && !engine.halted && engine.mood === m) return
    current = m
    if (a.state === 'suspended') void a.resume().catch(() => { /* needs a gesture */ })
    if (engine) { retire(engine, 0.8); engine = null }
    try {
      engine = new Engine(a, m, vol)
      engine.start(true)
      playing = true
    } catch {
      engine = null
      playing = false
    }
  },

  /** fade out over ~0.8 s, then tear everything down */
  stop(): void {
    playing = false
    if (engine) { retire(engine, 0.8); engine = null }
  },

  /** resume a suspended context; call from a user gesture */
  resume(): void {
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume().catch(() => { /* ignore */ })
  },

  /** cycle lounge -> ballad -> bossa; restarts playback if currently playing */
  next(): JazzMood {
    const order: JazzMood[] = ['lounge', 'ballad', 'bossa']
    const n = order[(order.indexOf(current) + 1) % order.length]
    if (playing) this.play(n)
    else current = n
    return n
  },

  mood(): JazzMood | null { return playing ? current : null },

  /** short human title for the current form and key */
  label(): string {
    if (engine) return engine.label
    const d = MOODS[current]
    return `${d.title} Jazz`
  },

  isPlaying(): boolean { return playing },

  setVolume(v: number): void {
    vol = clamp(v, 0, 1)
    if (engine) engine.setVol(vol)
  },
}

/* ---------------------------------------------------------- test-only hooks */

/** Render `seconds` of a mood offline into an AudioBuffer (tests only). */
export async function renderOffline(mood: JazzMood, seconds: number, volume = TUNING.master): Promise<AudioBuffer> {
  const sr = 44100
  const oc = new OfflineAudioContext(2, Math.floor(sr * seconds), sr)
  const e = new Engine(oc, mood, volume)
  e.pumpTo(seconds)
  return oc.startRendering()
}

/** Live-engine counters for tests: running sources and live scheduler timers. */
export function __jazzDebug(): { voices: number; timers: number; engines: number } {
  const all = [engine, ...Array.from(dying)].filter((e): e is Engine => !!e)
  return {
    voices: all.reduce((n, e) => n + e.voiceCount, 0),
    timers: all.filter(e => e.hasTimer).length,
    engines: all.length,
  }
}
