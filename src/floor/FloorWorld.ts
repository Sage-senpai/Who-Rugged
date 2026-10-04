/* The 3D casino floor, as a plain three.js module with no React inside it.
   ArenaFloor.tsx owns the DOM (HUD, dock, prompts) and talks to this class
   through the hooks below, so the scene can be exercised without React.

   Coordinates: x is right, z is toward the camera's default position (the
   entrance), y is up. Characters face +z. One unit is roughly a metre. */
import * as THREE from 'three'

export type InteractKind = 'table' | 'cashier' | 'board' | 'juke' | 'slots' | 'listing'
export type DockLayout = 'side' | 'sheet'
export type EmoteName = 'wave' | 'cheer' | 'shrug' | 'slump'

export interface FloorTable { id: string; ticker: string; chain: string; x: number; z: number; community?: boolean; slot?: number }
export interface LockedTable { id: string; ticker: string }
export interface TableInfo { risk: number | null; holders: number | null }
export interface Prompt { kind: InteractKind; tableId?: string; label: string; sub: string }
export interface FloorHooks {
  onPrompt(p: Prompt | null): void
  onInteract(kind: InteractKind, tableId?: string): void
  onViewMoved(moved: boolean): void
}

const DISPLAY = '"Silkscreen", "Space Mono", monospace'

/** Largest font size (up to `start`) at which `text` still fits `maxW`. */
function fitFont(g: CanvasRenderingContext2D, text: string, maxW: number, start: number, weight = 700): number {
  let fs = start
  g.font = `${weight} ${fs}px ${DISPLAY}`
  while (g.measureText(text).width > maxW && fs > 12) { fs -= 2; g.font = `${weight} ${fs}px ${DISPLAY}` }
  return fs
}
const MONO = '"Space Mono", ui-monospace, monospace'
const GOLD = 0xd9a441
const ALARM = 0xff4a3d
const POSITIVE = 0x4cc38a

const COATS = [0x7a3b2e, 0x2f5d73, 0x5b3f73, 0x3f6b4a, 0x8a6a2c, 0x2f3f6b, 0x6b2f4a, 0x3a3a44, 0x7a5a2e, 0x2e6b62, 0x6b6b2e, 0x4a2e6b]
const SKINS = [0xc68b5e, 0x8d5a3b, 0xe0b08a, 0x5e3a28, 0xd29a70]
const HUES = [0xe8b04a, 0x6ec6a8, 0xe0705f, 0x8ea8e8, 0xc58be0, 0xe8d36a, 0x7fd0e0, 0xe89bb0]
const CHIP_COLORS: Record<number, number> = { 1: 0xe8e4d8, 5: 0x8a5bd6, 10: 0x3a6ee8, 25: 0x2e9e5b, 50: 0xc2362e, 100: GOLD }
const DENOMS = [100, 50, 25, 10, 5, 1]
const NAMES = ['kojo', 'ife', 'mara', 'tunde', 'sol', 'zed', 'nia', 'bako', 'rin', 'ada', 'luka', 'omo']
const LINES = [
  'dev wallet looks heavy', 'i said holds', 'who is watching bonk?', 'model says sell',
  'crowd is wrong again', 'one more read', 'that holder is quiet', 'checking the window',
  'whale moved last night', 'streak talking, shh',
]
/* The Community Hall: a second room through a doorway in the main hall's right
   wall. Eight slots, one per community table the worker allows at once. */
const ANNEX_COLS = [34, 45, 56, 67]
const ANNEX_ROWS = [-5, 7]
export const COMMUNITY_SLOTS = ANNEX_COLS.length * ANNEX_ROWS.length
export function communitySlotPos(i: number): { x: number; z: number } {
  return { x: ANNEX_COLS[i % ANNEX_COLS.length], z: ANNEX_ROWS[Math.floor(i / ANNEX_COLS.length)] }
}
const WALL_X = 24.3
const DOOR_Z0 = 9.8
const DOOR_Z1 = 14.2
const MAX_X = 74.5
const TEAL = 0x4ad0c8

const DEALERS = ['Mama Ife', 'Big Tunde', 'Sister Nia', 'Papa Bako', 'Uncle Zed', 'Auntie Ada', 'Chief Kojo', 'Madam Rin']

interface CharOpts { name?: string; sub?: string; coat?: number; pants?: number; skin?: number; hat?: 'cap' | 'visor' | 'top' | 'beanie'; accent?: number; vest?: number }
interface Char {
  g: THREE.Group
  body: THREE.Mesh
  head: THREE.Mesh
  legs: THREE.Group[]
  arms: THREE.Group[]
  label: THREE.Sprite | null
  bub: THREE.Sprite | null
  bubT: number
  phase: number
  emote: EmoteName | null
  emoteT: number
  sit: boolean
  baseY: number
  v: number
  heading: number
  npc: { tx: number; tz: number; wait: number; sp: number; annex: boolean } | null
}
interface Collider { x: number; z: number; r: number }
interface Interactable { kind: InteractKind; tableId?: string; x: number; z: number; r: number; label: string; sub: () => string }
interface TableObj {
  def: FloorTable
  sign: THREE.Sprite
  deco: THREE.Group
  dealer: Char
  sitters: Char[]
  seats: number[]
  info: TableInfo
  mine: number
}

const rnd = (n: number) => Math.floor(Math.random() * n)

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export class FloorWorld {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140)
  private canvas: HTMLCanvasElement
  private hooks: FloorHooks
  private chars: Char[] = []
  private npcs: Char[] = []
  private tables: TableObj[] = []
  private colliders: Collider[] = []
  private inter: Interactable[] = []
  private player!: Char
  private ring!: THREE.Mesh
  private bets = new THREE.Group()
  private signLight: THREE.MeshBasicMaterial | null = null
  private spots: Array<[number, number]> = []
  private annexSpots: Array<[number, number]> = []
  private spawn?: { x: number; z: number }
  private geoCache = new Map<string, THREE.BufferGeometry>()
  private matCache = new Map<string, THREE.Material>()
  private textures: THREE.Texture[] = []
  private raf = 0
  private last = 0
  private ambientT = 0
  private disposed = false
  private paused = false
  private locked = false
  private ro: ResizeObserver

  private keys: Record<string, boolean> = {}
  private joy = { x: 0, z: 0 }
  private target: { x: number; z: number } | null = null
  private camYaw = 0
  private camDist = 18
  private look = new THREE.Vector3()
  private lookInit = false
  private nearest: Interactable | null = null
  private promptKey = ''

  private seat: TableObj | null = null
  private seatYaw = 0
  private seatH = 0
  private seatDist = 0
  private moved = false
  private layout: DockLayout = 'side'

  private ptrs = new Map<number, { x: number; y: number }>()
  private dragLast: { x: number; y: number } | null = null
  private dragMoved = false
  private pinchD = 0
  private cleanups: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, tables: FloorTable[], locked: LockedTable[], hooks: FloorHooks, opts: { spawn?: { x: number; z: number } } = {}) {
    this.canvas = canvas
    this.hooks = hooks
    this.spawn = opts.spawn
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.scene.background = new THREE.Color(0x050a08)
    this.scene.fog = new THREE.Fog(0x050a08, 30, 70)
    this.build(tables, locked)
    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    if (canvas.parentElement) this.ro.observe(canvas.parentElement)
    this.bindInput()
    this.raf = requestAnimationFrame(this.frame)
  }

  /* ---------- public API ---------- */

  setLayout(l: DockLayout) { this.layout = l }
  /** While a panel is open the room ignores the keyboard and taps. */
  setLocked(l: boolean) { this.locked = l; if (l) { this.keys = {}; this.joy.x = 0; this.joy.z = 0; this.target = null } }
  setPaused(p: boolean) { this.paused = p; if (!p) this.last = 0 }
  setJoystick(x: number, z: number) { this.joy.x = x; this.joy.z = z }
  isSeated() { return this.seat !== null }

  setTableInfo(id: string, info: TableInfo) {
    const t = this.tables.find((x) => x.def.id === id)
    if (!t) return
    t.info = info
    this.drawSign(t)
  }

  seatAt(id: string) {
    const t = this.tables.find((x) => x.def.id === id)
    if (!t) return
    const free: number[] = []
    t.seats.forEach((p, i) => { if (p < 0) free.push(i) })
    const k = free.length ? free[rnd(free.length)] : rnd(6)
    t.mine = k
    this.seat = t
    this.target = null
    const a = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / 7
    const sx = t.def.x + Math.cos(a) * 3.15
    const sz = t.def.z + Math.sin(a) * 3.15
    const p = this.player
    p.sit = true; p.baseY = 0.2; p.emote = null; p.v = 0
    p.g.position.set(sx, 0.2, sz)
    p.heading = Math.atan2(t.def.x - sx, t.def.z - sz)
    p.g.rotation.y = p.heading
    this.refreshSeats(t)
    t.deco.rotation.y = Math.atan2(Math.cos(a), Math.sin(a))
    this.seatYaw = 0; this.seatH = 0; this.seatDist = 0
    this.setMoved(false)
    this.setPrompt(null)
  }

  standUp() {
    const t = this.seat
    if (!t) return
    const p = this.player
    const dx = p.g.position.x - t.def.x
    const dz = p.g.position.z - t.def.z
    const dl = Math.hypot(dx, dz) || 1
    p.sit = false; p.baseY = 0; p.emote = null
    p.g.position.set(t.def.x + (dx / dl) * 4.7, 0, t.def.z + (dz / dl) * 4.7)
    this.resolve(p.g.position, 0.45)
    this.seat = null
    t.mine = -1
    t.deco.rotation.y = 0
    this.refreshSeats(t)
    this.setStake(0)
    this.setMoved(false)
  }

  recenter() { this.seatYaw = 0; this.seatH = 0; this.seatDist = 0; this.setMoved(false) }

  interact() {
    const it = this.nearest
    if (!it || this.seat) return
    this.hooks.onInteract(it.kind, it.tableId)
  }

  emote(name: EmoteName, dur = 2.2) { this.player.emote = name; this.player.emoteT = dur }
  say(text: string) { this.bubble(this.player, text) }

  dealerReact(tableId: string, name: EmoteName) {
    const t = this.tables.find((x) => x.def.id === tableId)
    if (t) { t.dealer.emote = name; t.dealer.emoteT = 2.4 }
  }

  /** Draws the player's current stake as chip stacks on the felt in front of the seat. */
  setStake(amount: number) {
    while (this.bets.children.length) this.bets.remove(this.bets.children[0])
    const t = this.seat
    if (!t || amount <= 0) return
    const chips: number[] = []
    let rest = Math.round(amount)
    for (const d of DENOMS) { while (rest >= d && chips.length < 60) { chips.push(d); rest -= d } }
    const p = this.player.g.position
    let dx = p.x - t.def.x
    let dz = p.z - t.def.z
    const dl = Math.hypot(dx, dz) || 1
    dx /= dl; dz /= dl
    const px = -dz, pz = dx
    const cnt: Record<number, number> = {}
    chips.forEach((v) => { cnt[v] = (cnt[v] ?? 0) + 1 })
    const geo = this.geo('cyl', 0.17, 0.17, 0.06, 12)
    let col = 0
    for (const v of DENOMS) {
      if (!cnt[v]) continue
      const m = this.mat(CHIP_COLORS[v], { metal: v === 100 ? 0.4 : 0 })
      for (let i = 0; i < Math.min(cnt[v], 14); i++) {
        const c = new THREE.Mesh(geo, m)
        c.position.set(t.def.x + dx * 1.55 + px * (col - 1.2) * 0.42, 1.45 + i * 0.065, t.def.z + dz * 1.55 + pz * (col - 1.2) * 0.42)
        this.bets.add(c)
      }
      col++
    }
  }

  resize() {
    const host = this.canvas.parentElement
    if (!host) return
    const w = host.clientWidth, h = host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  debugTeleport(x: number, z: number) { this.player.g.position.set(x, this.player.baseY, z) }
  debugPos() { const p = this.player.g.position; return { x: p.x, y: p.y, z: p.z } }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.cleanups.forEach((f) => f())
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((x) => x.dispose())
      }
    })
    this.geoCache.forEach((g) => g.dispose())
    this.textures.forEach((t) => t.dispose())
    // the next world on this canvas shares its WebGL context; leave the unpack state clean
    const gl = this.renderer.getContext()
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    this.renderer.dispose()
  }

  /* ---------- builders ---------- */

  private geo(kind: 'box' | 'cyl' | 'sph', a: number, b: number, c: number, d = 12): THREE.BufferGeometry {
    const key = `${kind}:${a}:${b}:${c}:${d}`
    let g = this.geoCache.get(key)
    if (!g) {
      g = kind === 'box' ? new THREE.BoxGeometry(a, b, c)
        : kind === 'cyl' ? new THREE.CylinderGeometry(a, b, c, d)
        : new THREE.SphereGeometry(a, b, c)
      this.geoCache.set(key, g)
    }
    return g
  }

  private mat(color: number, o: { metal?: number; rough?: number; emissive?: number } = {}): THREE.MeshStandardMaterial {
    const key = `s:${color}:${o.metal ?? 0}:${o.rough ?? 0.8}:${o.emissive ?? 0}`
    let m = this.matCache.get(key) as THREE.MeshStandardMaterial | undefined
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, flatShading: true, emissive: o.emissive ?? 0 })
      this.matCache.set(key, m)
    }
    return m
  }

  private glow(color: number): THREE.MeshBasicMaterial {
    const key = `b:${color}`
    let m = this.matCache.get(key) as THREE.MeshBasicMaterial | undefined
    if (!m) { m = new THREE.MeshBasicMaterial({ color }); this.matCache.set(key, m) }
    return m
  }

  private box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, p: THREE.Object3D = this.scene) {
    const mesh = new THREE.Mesh(this.geo('box', w, h, d), m)
    mesh.position.set(x, y, z)
    p.add(mesh)
    return mesh
  }

  private cyl(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 14, p: THREE.Object3D = this.scene) {
    const mesh = new THREE.Mesh(this.geo('cyl', rt, rb, h, seg), m)
    mesh.position.set(x, y, z)
    p.add(mesh)
    return mesh
  }

  private canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const g = c.getContext('2d')
    if (g) draw(g, w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
    this.textures.push(t)
    return t
  }

  private sprite(w: number, h: number, tex: THREE.Texture, depthTest = false): THREE.Sprite {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest }))
    s.scale.set(w, h, 1)
    s.renderOrder = 10
    return s
  }

  private labelSprite(text: string, sub?: string): THREE.Sprite {
    const tex = this.canvasTex(320, 80, (g, w, h) => {
      g.fillStyle = 'rgba(8,14,12,.78)'; roundRect(g, 2, 6, w - 4, h - 12, 14); g.fill()
      g.strokeStyle = 'rgba(217,164,65,.7)'; g.lineWidth = 2; g.stroke()
      g.fillStyle = '#f2ead8'; g.font = `700 30px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, w / 2, sub ? h * 0.38 : h / 2)
      if (sub) { g.fillStyle = '#d9a441'; g.font = `400 20px ${MONO}`; g.fillText(sub, w / 2, h * 0.72) }
    })
    return this.sprite(2.6, 0.65, tex)
  }

  private bubble(c: Char, text: string) {
    if (c.bub) { c.g.remove(c.bub); (c.bub.material as THREE.SpriteMaterial).map?.dispose(); c.bub.material.dispose() }
    const cw = Math.max(160, Math.min(512, text.length * 22 + 60))
    const tex = this.canvasTex(cw, 90, (g, w, h) => {
      g.font = `700 28px ${MONO}`
      const tw = Math.min(w - 30, g.measureText(text).width + 36)
      g.fillStyle = '#f2ead8'; roundRect(g, (w - tw) / 2, 6, tw, h - 26, 16); g.fill()
      g.beginPath(); g.moveTo(w / 2 - 10, h - 20); g.lineTo(w / 2, h - 6); g.lineTo(w / 2 + 10, h - 20); g.fill()
      g.fillStyle = '#0b1210'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, (h - 20) / 2 + 6, w - 40)
    })
    const s = this.sprite(Math.min(4.4, 0.5 + text.length * 0.17), 0.7, tex)
    s.position.set(0, 3.25, 0)
    c.g.add(s)
    c.bub = s
    c.bubT = 3.6
  }

  private makeChar(o: CharOpts): Char {
    const g = new THREE.Group()
    const skin = this.mat(o.skin ?? 0xc68b5e)
    const coat = this.mat(o.coat ?? 0x2d4a63)
    const pants = this.mat(o.pants ?? 0x1d2430)
    const body = this.cyl(0.34, 0.42, 0.95, coat, 0, 1.1, 0, 10, g)
    const head = new THREE.Mesh(this.geo('sph', 0.3, 14, 10), skin)
    head.position.y = 1.82
    g.add(head)
    const eye = this.glow(0x0b1210)
    this.box(0.07, 0.08, 0.04, eye, -0.1, 1.86, 0.27, g)
    this.box(0.07, 0.08, 0.04, eye, 0.1, 1.86, 0.27, g)
    if (o.hat === 'cap') {
      const cap = this.mat(0x16222f)
      this.cyl(0.33, 0.33, 0.14, cap, 0, 2.06, 0, 12, g)
      this.box(0.34, 0.04, 0.22, cap, 0, 2.0, 0.3, g)
      this.box(0.1, 0.1, 0.02, this.glow(GOLD), 0, 2.07, 0.33, g)
    }
    if (o.hat === 'visor') {
      this.box(0.7, 0.05, 0.5, this.mat(0x2e9e5b), 0, 2.04, 0.1, g)
      this.cyl(0.31, 0.31, 0.08, this.mat(0xf2ead8), 0, 2.0, 0, 12, g)
    }
    if (o.hat === 'top') {
      const top = this.mat(0x14110e)
      this.cyl(0.22, 0.22, 0.34, top, 0, 2.18, 0, 12, g)
      this.cyl(0.38, 0.38, 0.04, top, 0, 2.02, 0, 14, g)
    }
    if (o.hat === 'beanie') {
      const bn = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(o.accent ?? 0xe0705f))
      bn.position.y = 1.9
      g.add(bn)
    }
    if (o.vest !== undefined) this.box(0.5, 0.7, 0.5, this.mat(o.vest), 0, 1.15, 0, g)
    const legs: THREE.Group[] = []
    const arms: THREE.Group[] = []
    ;[-0.16, 0.16].forEach((x) => {
      const p = new THREE.Group(); p.position.set(x, 0.68, 0); g.add(p)
      this.box(0.22, 0.68, 0.24, pants, 0, -0.34, 0, p)
      this.box(0.24, 0.1, 0.32, this.mat(0x0e0e10), 0, -0.66, 0.05, p)
      legs.push(p)
    })
    ;[-0.47, 0.47].forEach((x) => {
      const p = new THREE.Group(); p.position.set(x, 1.48, 0); g.add(p)
      this.box(0.17, 0.62, 0.17, coat, 0, -0.3, 0, p)
      this.box(0.15, 0.14, 0.15, skin, 0, -0.66, 0, p)
      arms.push(p)
    })
    const sh = new THREE.Mesh(this.geoCircle(0.55), this.matShadow())
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02
    g.add(sh)
    let label: THREE.Sprite | null = null
    if (o.name) { label = this.labelSprite(o.name, o.sub); label.position.y = 2.75; g.add(label) }
    this.scene.add(g)
    const c: Char = { g, body, head, legs, arms, label, bub: null, bubT: 0, phase: Math.random() * 6, emote: null, emoteT: 0, sit: false, baseY: 0, v: 0, heading: 0, npc: null }
    this.chars.push(c)
    return c
  }

  private geoCircle(r: number): THREE.BufferGeometry {
    const key = `circle:${r}`
    let g = this.geoCache.get(key)
    if (!g) { g = new THREE.CircleGeometry(r, 16); this.geoCache.set(key, g) }
    return g
  }

  private matShadow(): THREE.Material {
    let m = this.matCache.get('shadow')
    if (!m) { m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }); this.matCache.set('shadow', m) }
    return m
  }

  private build(tables: FloorTable[], locked: LockedTable[]) {
    const S = this.scene
    S.add(new THREE.HemisphereLight(0xbfd8c8, 0x1a1208, 1.7))
    const key = new THREE.DirectionalLight(0xffe2b0, 1.5)
    key.position.set(-8, 20, 10)
    S.add(key)
    ;([[-14, 4, -6, GOLD], [14, 4, -6, GOLD], [-14, 4, 8, ALARM], [14, 4, 8, POSITIVE], [0, 5, 0, 0xffcf8a]] as const).forEach(([x, y, z, c]) => {
      const l = new THREE.PointLight(c, 120, 30, 2)
      l.position.set(x, y, z)
      S.add(l)
    })

    ;([[34, 5, 1, 0x6ec6d9], [45, 5, 1, 0xc58be0], [56, 5, 1, 0x6ec6d9], [67, 5, 1, 0xc58be0]] as const).forEach(([x, y, z, c]) => {
      const l = new THREE.PointLight(c, 260, 34, 2)
      l.position.set(x, y, z)
      S.add(l)
    })

    /* floor, runner, walls */
    const carpet = this.canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2a0f14'; g.fillRect(0, 0, w, h)
      g.strokeStyle = '#4a1a22'; g.lineWidth = 3
      for (let i = -1; i < 5; i++) for (let j = -1; j < 5; j++) {
        const cx = i * 64 + 32, cy = j * 64 + 32
        g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + 26, cy); g.lineTo(cx, cy + 26); g.lineTo(cx - 26, cy); g.closePath(); g.stroke()
      }
      g.fillStyle = '#d9a44133'
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 64 + 30, j * 64 + 30, 4, 4)
    })
    carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping
    carpet.repeat.set(12, 16)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 64), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }))
    floor.position.z = 16
    floor.rotation.x = -Math.PI / 2
    S.add(floor)
    const annexFloor = new THREE.Mesh(new THREE.PlaneGeometry(52, 64), new THREE.MeshStandardMaterial({ map: carpet, color: 0xb4d0dc, roughness: 0.95 }))
    annexFloor.position.set(50, 0, 16)
    annexFloor.rotation.x = -Math.PI / 2
    S.add(annexFloor)
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(4, 32), this.mat(0x0f3a2c, { rough: 0.9 }))
    runner.rotation.x = -Math.PI / 2
    runner.position.set(0, 0.01, 0)
    S.add(runner)
    ;[-2.1, 2.1].forEach((dx) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 32), this.glow(GOLD))
      s.rotation.x = -Math.PI / 2
      s.position.set(dx, 0.02, 0)
      S.add(s)
    })
    const wall = this.mat(0x16130f, { rough: 0.9 })
    this.box(100, 9, 0.6, wall, 26, 4.5, -16.3)
    this.box(100, 9, 0.6, wall, 26, 4.5, 36)
    this.box(0.6, 9, 52, wall, -24.3, 4.5, 10)
    // the main hall's right wall has a doorway into the Community Hall
    this.box(0.6, 9, DOOR_Z0 + 16.3, wall, WALL_X, 4.5, (-16.3 + DOOR_Z0) / 2)
    this.box(0.6, 9, 36 - DOOR_Z1, wall, WALL_X, 4.5, (DOOR_Z1 + 36) / 2)
    this.box(0.6, 4.6, DOOR_Z1 - DOOR_Z0, wall, WALL_X, 6.7, (DOOR_Z0 + DOOR_Z1) / 2)
    this.box(0.6, 9, 52, wall, 76.3, 4.5, 10)

    const signTex = this.canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = '#0a0f0d'; g.fillRect(0, 0, w, h)
      g.textAlign = 'center'; g.textBaseline = 'middle'
      fitFont(g, 'WHO RUGGED?', w - 120, 124)
      g.shadowColor = '#ff4a3d'; g.shadowBlur = 40; g.fillStyle = '#ff6a5c'
      g.fillText('WHO RUGGED?', w / 2, h / 2 + 4)
      g.shadowColor = '#d9a441'; g.shadowBlur = 16; g.strokeStyle = '#d9a441'; g.lineWidth = 6
      roundRect(g, 14, 14, w - 28, h - 28, 24); g.stroke()
    })
    this.signLight = new THREE.MeshBasicMaterial({ map: signTex })
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), this.signLight)
    sm.position.set(0, 6.2, -15.95)
    S.add(sm)

    const neonSign = (text: string, w: number, h: number, cw: number, color: string) => this.canvasTex(cw, Math.round(cw * (h / w)), (g, tw, th) => {
      g.fillStyle = '#0a0f0d'; g.fillRect(0, 0, tw, th)
      g.textAlign = 'center'; g.textBaseline = 'middle'
      fitFont(g, text, tw - 80, th * 0.5)
      g.shadowColor = color; g.shadowBlur = 30; g.fillStyle = color
      g.fillText(text, tw / 2, th / 2 + 3)
      g.shadowBlur = 10; g.strokeStyle = color; g.lineWidth = 5
      roundRect(g, 10, 10, tw - 20, th - 20, 20); g.stroke()
    })
    const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: neonSign('COMMUNITY HALL', 12, 3, 1024, '#4ad0c8') }))
    hallSign.position.set(50, 6.2, -15.95)
    S.add(hallSign)
    const doorIn = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshBasicMaterial({ map: neonSign('COMMUNITY HALL >', 5, 1.2, 512, '#4ad0c8') }))
    doorIn.position.set(WALL_X - 0.4, 7.0, (DOOR_Z0 + DOOR_Z1) / 2)
    doorIn.rotation.y = -Math.PI / 2
    S.add(doorIn)
    const doorOut = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshBasicMaterial({ map: neonSign('< MAIN FLOOR', 5, 1.2, 512, '#d9a441') }))
    doorOut.position.set(WALL_X + 0.4, 7.0, (DOOR_Z0 + DOOR_Z1) / 2)
    doorOut.rotation.y = Math.PI / 2
    S.add(doorOut)

    /* pillars */
    ;[-22, -6, 16, 22].forEach((x) => [-14].forEach((z) => {
      this.cyl(0.7, 0.8, 9, this.mat(0x1d1812), x, 4.5, z, 10)
      const brass = this.mat(GOLD, { metal: 0.6, rough: 0.4 })
      this.cyl(0.9, 0.9, 0.3, brass, x, 1.2, z, 10)
      this.cyl(0.9, 0.9, 0.3, brass, x, 7.8, z, 10)
      this.colliders.push({ x, z, r: 1.1 })
    }))

    /* tables */
    const brass = this.mat(0x6b4a22, { rough: 0.5, metal: 0.2 })
    tables.forEach((def, ti) => {
      const g = new THREE.Group()
      g.position.set(def.x, 0, def.z)
      S.add(g)
      this.cyl(0.5, 0.9, 1.3, this.mat(0x2a1c0e), 0, 0.65, 0, 10, g)
      this.cyl(2.5, 2.5, 0.18, this.mat(0x14281f), 0, 1.3, 0, 32, g)
      const topTex = this.canvasTex(512, 512, (c, w, h) => {
        c.fillStyle = '#0f3a2c'; c.fillRect(0, 0, w, h)
        c.translate(w / 2, h / 2)
        c.strokeStyle = '#d9a441'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 236, 0, 7); c.stroke()
        c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 214, 0, 7); c.stroke()
        c.beginPath(); c.moveTo(0, -214); c.lineTo(0, -60); c.moveTo(0, 60); c.lineTo(0, 214); c.stroke()
        c.textAlign = 'center'; c.textBaseline = 'middle'
        c.font = `700 36px ${DISPLAY}`
        c.fillStyle = '#ff6a5c'; c.save(); c.translate(-130, 0); c.rotate(-Math.PI / 2); c.fillText('SELLS', 0, 0); c.restore()
        c.fillStyle = '#4cc38a'; c.save(); c.translate(130, 0); c.rotate(Math.PI / 2); c.fillText('HOLDS', 0, 0); c.restore()
        c.fillStyle = '#d9a441'
        fitFont(c, def.ticker, 150, 52)
        c.fillText(def.ticker, 0, 0)
      })
      const deco = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.9 }))
      deco.rotation.x = -Math.PI / 2
      deco.position.y = 1.405
      const pivot = new THREE.Group()
      pivot.add(deco)
      g.add(pivot)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.14, 8, 40), brass)
      rim.rotation.x = Math.PI / 2; rim.position.y = 1.38
      g.add(rim)
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / 7
        this.cyl(0.32, 0.32, 0.12, this.mat(0x7a1c1c), Math.cos(a) * 3.15, 0.82, Math.sin(a) * 3.15, 12, g)
        this.cyl(0.06, 0.06, 0.8, this.mat(0x333333), Math.cos(a) * 3.15, 0.4, Math.sin(a) * 3.15, 6, g)
      }
      for (let s = 0; s < 3; s++) for (let cc = 0; cc < s + 2; cc++) {
        this.cyl(0.16, 0.16, 0.05, this.mat([0x3a6ee8, 0xc2362e, 0x2e9e5b][s]), (s - 1) * 0.9 + 0.05 * cc, 1.42 + cc * 0.05, -1.6 + (s % 2) * 0.2, 8, g)
      }
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.9, 4.1, 48), new THREE.MeshBasicMaterial({ color: def.community ? TEAL : def.chain === 'BSC' ? 0xe8b04a : 0x8f6bff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
      ring.rotation.x = -Math.PI / 2
      ring.position.set(def.x, 0.03, def.z)
      S.add(ring)
      this.colliders.push({ x: def.x, z: def.z, r: 2.9 })

      const dealer = this.makeChar({ name: DEALERS[ti % DEALERS.length], sub: 'dealer', coat: 0x1b1b1f, vest: 0x6b1d2a, pants: 0x111114, hat: 'visor', skin: SKINS[ti % SKINS.length] })
      dealer.g.position.set(def.x, 0, def.z - 3.35)

      const sitters: Char[] = []
      const seats: number[] = []
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / 7
        const sx = def.x + Math.cos(a) * 3.15, sz = def.z + Math.sin(a) * 3.15
        const sc = this.makeChar({ coat: COATS[(ti * 6 + k) % 12], skin: SKINS[(ti + k) % 5], hat: k % 3 === 0 ? 'beanie' : undefined, accent: HUES[(ti + k) % HUES.length] })
        sc.sit = true; sc.baseY = 0.2
        sc.g.position.set(sx, 0.2, sz)
        sc.g.rotation.y = Math.atan2(def.x - sx, def.z - sz)
        sitters.push(sc)
        seats.push(Math.random() < 0.6 ? 1 : -1)
      }
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))
      sign.scale.set(5, 1.55, 1)
      sign.position.set(def.x, 5.0, def.z)
      sign.renderOrder = 9
      S.add(sign)
      const obj: TableObj = { def, sign, deco: pivot, dealer, sitters, seats, info: { risk: null, holders: null }, mine: -1 }
      this.tables.push(obj)
      this.drawSign(obj)
      this.refreshSeats(obj)
      this.inter.push({ kind: 'table', tableId: def.id, x: def.x, z: def.z, r: 4.4, label: `Sit at the ${def.ticker} table`, sub: () => (obj.info.risk != null ? `model: ${Math.round(obj.info.risk * 100)}% sells` : 'open the market') })
    })

    /* locked stands by the entrance */
    locked.forEach((t, i) => {
      const g = new THREE.Group()
      const x = i ? 19 : -19
      g.position.set(x, 0, 13)
      S.add(g)
      this.cyl(1.4, 1.4, 0.15, this.mat(0x1a1a1a), 0, 1.2, 0, 24, g)
      this.cyl(0.3, 0.6, 1.2, this.mat(0x222222), 0, 0.6, 0, 8, g)
      const tex = this.canvasTex(320, 96, (c, w, h) => {
        c.fillStyle = 'rgba(8,14,12,.8)'; roundRect(c, 2, 4, w - 4, h - 8, 12); c.fill()
        c.strokeStyle = '#8fa399'; c.lineWidth = 2; c.stroke()
        c.fillStyle = '#8fa399'; c.font = `700 26px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'
        c.fillText(`${t.ticker} soon`, w / 2, h / 2)
      })
      const ls = this.sprite(3, 0.9, tex)
      ls.position.set(0, 2.6, 0)
      g.add(ls)
      this.colliders.push({ x, z: 13, r: 1.6 })
    })

    /* slot machines, right wall: decoration only until a chip economy exists */
    ;[-9, -5, -1, 3, 7].forEach((z, i) => {
      const g = new THREE.Group()
      g.position.set(22.2, 0, z)
      g.rotation.y = -Math.PI / 2
      S.add(g)
      this.box(1.5, 2.6, 1.2, this.mat(0x2a1020, { metal: 0.3 }), 0, 1.3, 0, g)
      this.box(1.1, 0.9, 0.05, this.glow([ALARM, GOLD, POSITIVE, 0x8ea8e8, 0xc58be0][i]), 0, 1.8, 0.62, g)
      this.box(1.2, 0.35, 0.06, this.glow(GOLD), 0, 2.55, 0.62, g)
      this.box(1.1, 0.25, 0.6, this.mat(0x14110e), 0, 1.0, 0.45, g)
      this.cyl(0.05, 0.05, 1.1, this.mat(0xb0b0b0, { metal: 0.7 }), 0.9, 1.6, 0.2, 6, g)
      const kn = new THREE.Mesh(this.geo('sph', 0.14, 8, 8), this.mat(ALARM))
      kn.position.set(0.9, 2.2, 0.2)
      g.add(kn)
      this.colliders.push({ x: 22.2, z, r: 1.1 })
    })
    this.inter.push({ kind: 'slots', x: 21, z: -1, r: 7.5, label: 'Slot machines', sub: () => 'arrive with the chip economy' })

    /* cashier cage, back left: opens the portfolio */
    this.box(7, 1.3, 1.4, this.mat(0x3a2a14, { rough: 0.6 }), -17, 0.65, -14)
    this.box(7, 0.12, 1.7, this.mat(GOLD, { metal: 0.5, rough: 0.4 }), -17, 1.35, -14)
    for (let b = -3; b <= 3; b++) this.box(0.07, 2.2, 0.07, this.mat(GOLD, { metal: 0.6 }), -17 + b, 2.5, -14.2)
    const cash = this.makeChar({ name: 'Cashier Kojo', sub: 'cage', coat: 0x2e5d4a, vest: GOLD, hat: 'top', skin: 0x8d5a3b })
    cash.g.position.set(-17, 0, -15.1)
    this.colliders.push({ x: -17, z: -14, r: 3.8 })
    this.inter.push({ kind: 'cashier', x: -17, z: -12, r: 3.6, label: 'Cashier Kojo', sub: () => 'see your positions' })

    /* jukebox, left wall: toggles the music setting */
    const jb = new THREE.Group()
    jb.position.set(-22.6, 0, 7)
    jb.rotation.y = Math.PI / 2
    S.add(jb)
    this.box(1.6, 2.8, 1.1, this.mat(0x2a1410, { metal: 0.3 }), 0, 1.4, 0, jb)
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.1, 16, 1, false, 0, Math.PI), this.mat(0x4a1c14))
    arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.set(0, 2.8, 0)
    jb.add(arch)
    this.box(1.1, 0.8, 0.05, this.glow(0xffb347), 0, 1.9, 0.56, jb)
    this.box(1.3, 0.12, 0.06, this.glow(ALARM), 0, 2.9, 0.56, jb)
    this.colliders.push({ x: -22.6, z: 7, r: 1.3 })
    this.inter.push({ kind: 'juke', x: -21, z: 7, r: 3, label: 'Jukebox', sub: () => 'toggle the music' })

    /* leaderboard door, back right */
    this.box(3.4, 4.2, 0.4, this.mat(0x3a0f14), 17, 2.1, -15.8)
    this.box(3.8, 0.3, 0.5, this.mat(GOLD, { metal: 0.6 }), 17, 4.35, -15.75)
    const doorTex = this.canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#14110e'; g.fillRect(0, 0, w, h)
      g.fillStyle = '#d9a441'; g.font = `700 22px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText('LEADERBOARD', w / 2, h / 2)
    })
    const ds = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: doorTex }))
    ds.position.set(17, 4.9, -15.9)
    S.add(ds)
    ;[-1.9, 1.9].forEach((dx) => this.cyl(0.08, 0.08, 1, this.mat(GOLD, { metal: 0.6 }), 17 + dx, 0.5, -13.2, 8))
    this.box(3.8, 0.06, 0.06, this.mat(0x9a1c28), 17, 0.95, -13.2)
    this.colliders.push({ x: 17, z: -13.4, r: 1.6 })
    this.inter.push({ kind: 'board', x: 17, z: -12.2, r: 3, label: 'Leaderboard', sub: () => 'top predictors' })

    /* Community Hall: an open pedestal wherever no table has been opened yet, and the listing desk */
    const taken = new Set(tables.filter((t) => t.community && t.slot !== undefined).map((t) => t.slot as number))
    for (let i = 0; i < COMMUNITY_SLOTS; i++) {
      const p = communitySlotPos(i)
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + 0.4; this.annexSpots.push([p.x + Math.cos(a) * 4.6, p.z + Math.sin(a) * 4.6]) }
      if (taken.has(i)) continue
      const g = new THREE.Group()
      g.position.set(p.x, 0, p.z)
      S.add(g)
      this.cyl(1.5, 1.7, 0.2, this.mat(0x1a2a30, { metal: 0.3 }), 0, 0.1, 0, 28, g)
      const open = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 40), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.7, side: THREE.DoubleSide }))
      open.rotation.x = -Math.PI / 2
      open.position.y = 0.22
      g.add(open)
      const tex = this.canvasTex(384, 112, (c, w, h) => {
        c.fillStyle = 'rgba(8,14,12,.82)'; roundRect(c, 3, 4, w - 6, h - 8, 16); c.fill()
        c.strokeStyle = '#4ad0c8'; c.lineWidth = 3; c.stroke()
        c.textAlign = 'center'; c.textBaseline = 'middle'
        c.fillStyle = '#4ad0c8'; c.font = `700 34px ${DISPLAY}`; c.fillText('OPEN TABLE', w / 2, h * 0.38)
        c.fillStyle = '#8fa399'; c.font = `700 22px ${MONO}`; c.fillText('list a coin here', w / 2, h * 0.74)
      })
      const sp = this.sprite(3.4, 1.0, tex)
      sp.position.set(0, 2.4, 0)
      g.add(sp)
      this.colliders.push({ x: p.x, z: p.z, r: 1.7 })
      this.inter.push({ kind: 'listing', x: p.x, z: p.z, r: 3.6, label: 'Open a community table', sub: () => 'paste a Solana token address' })
    }
    const deskX = 30.5, deskZ = 14.4
    this.box(4.2, 1.2, 1.3, this.mat(0x14303a, { metal: 0.2 }), deskX, 0.6, deskZ)
    this.box(4.2, 0.1, 1.5, this.mat(TEAL, { metal: 0.5, rough: 0.4 }), deskX, 1.25, deskZ)
    const clerk = this.makeChar({ name: 'Clerk Ada', sub: 'listings', coat: 0x1f5a66, vest: TEAL, hat: 'top', skin: 0xd29a70 })
    clerk.g.position.set(deskX, 0, deskZ + 1.4)
    clerk.g.rotation.y = Math.PI
    clerk.heading = Math.PI
    this.colliders.push({ x: deskX, z: deskZ, r: 2.4 })
    this.inter.push({ kind: 'listing', x: deskX, z: deskZ - 1.2, r: 4.2, label: 'Listing desk', sub: () => 'open a table for any Solana coin' })

    const mat = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), this.mat(0x14110e))
    mat.rotation.x = -Math.PI / 2
    mat.position.set(0, 0.02, 15)
    S.add(mat)

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
    this.ring.rotation.x = -Math.PI / 2
    this.ring.visible = false
    S.add(this.ring)
    S.add(this.bets)

    /* the player is the Police detective */
    this.player = this.makeChar({ name: 'You', sub: 'detective', coat: 0x4a7ca8, pants: 0x232830, hat: 'cap', skin: 0xd29a70 })
    const sp0 = this.spawn ?? { x: 0, z: 11 }
    this.player.g.position.set(sp0.x, 0, sp0.z)
    this.player.heading = Math.PI
    this.player.g.rotation.y = Math.PI

    /* ambient crowd */
    tables.filter((t) => !t.community).forEach((t) => { for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + 0.4; this.spots.push([t.x + Math.cos(a) * 4.6, t.z + Math.sin(a) * 4.6]) } })
    this.spots.push([-3, 10], [3, 10], [-14, 12], [14, 12], [-6, -12], [0, -9])
    for (let n = 0; n < 10; n++) {
      const annex = n >= 8
      const c = this.makeChar({ name: NAMES[(n * 3 + 1) % 12], coat: COATS[n % 12], pants: [0x1d2430, 0x2a2418, 0x1b2a24][n % 3], skin: SKINS[n % 5], hat: n % 4 === 1 ? 'beanie' : undefined, accent: HUES[n % HUES.length] })
      const pool = annex ? this.annexSpots : this.spots
      const sp = pool[rnd(pool.length)]
      c.g.position.set(sp[0], 0, sp[1])
      c.npc = { tx: sp[0], tz: sp[1], wait: Math.random() * 3, sp: 1.6 + Math.random() * 1.2, annex }
      this.npcs.push(c)
    }

    this.camera.position.set(sp0.x, this.camDist * Math.sin(0.98) + 1, sp0.z + this.camDist * Math.cos(0.98))
  }

  private drawSign(t: TableObj) {
    const info = t.info
    const tex = this.canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = 'rgba(8,14,12,.84)'; roundRect(g, 4, 6, w - 8, h - 12, 20); g.fill()
      g.strokeStyle = t.def.community ? '#4ad0c8' : t.def.chain === 'BSC' ? '#e8b04a' : '#8f6bff'; g.lineWidth = 4; g.stroke()
      g.textAlign = 'left'; g.textBaseline = 'middle'
      g.fillStyle = '#d9a441'; fitFont(g, t.def.ticker, w - 140, 48)
      g.fillText(t.def.ticker, 26, h * 0.36)
      g.fillStyle = '#8fa399'; g.font = `700 22px ${MONO}`; g.textAlign = 'right'
      g.fillText(t.def.community ? 'COMMUNITY' : t.def.chain, w - 26, h * 0.36)
      g.textAlign = 'left'; g.fillStyle = '#f2ead8'; g.font = `700 26px ${MONO}`
      g.fillText(info.risk != null ? `${Math.round(info.risk * 100)}% sell risk` : 'no model read', 26, h * 0.76)
      g.textAlign = 'right'; g.fillStyle = '#8fa399'; g.font = `700 22px ${MONO}`
      g.fillText(info.holders != null ? `${info.holders} holders` : '', w - 26, h * 0.76)
    })
    const mat = t.sign.material as THREE.SpriteMaterial
    mat.map?.dispose()
    mat.map = tex
    mat.needsUpdate = true
  }

  private refreshSeats(t: TableObj) {
    t.sitters.forEach((c, k) => { c.g.visible = t.seats[k] >= 0 && !(this.seat === t && t.mine === k) })
  }

  /* ---------- input ---------- */

  private typing(e: Event): boolean {
    const el = e.target as HTMLElement | null
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
  }

  private bindInput() {
    const cv = this.canvas
    const on = <K extends keyof WindowEventMap>(t: Window, k: K, f: (e: WindowEventMap[K]) => void) => { t.addEventListener(k, f); this.cleanups.push(() => t.removeEventListener(k, f)) }
    const onEl = <K extends keyof HTMLElementEventMap>(k: K, f: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => { cv.addEventListener(k, f, opts); this.cleanups.push(() => cv.removeEventListener(k, f)) }
    const norm = (k: string) => (k.length === 1 ? k.toLowerCase() : k)

    on(window, 'keydown', (e) => {
      if (this.locked || this.typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = norm(e.key)
      if (this.seat) return
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
        this.keys[k] = true
        e.preventDefault()
      } else if (k === 'e' || k === 'Enter') this.interact()
      else if (k === '1') this.emote('wave')
      else if (k === '2') this.emote('cheer')
      else if (k === '3') this.emote('shrug')
      else if (k === '4') this.say('Sells. I can feel it.')
      else if (k === '5') this.say('Holding. Easy.')
    })
    on(window, 'keyup', (e) => { this.keys[norm(e.key)] = false })
    on(window, 'blur', () => { this.keys = {} })

    onEl('pointerdown', (e) => {
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      this.dragLast = { x: e.clientX, y: e.clientY }
      this.dragMoved = false
      try { cv.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    })
    onEl('pointermove', (e) => {
      if (!this.ptrs.has(e.pointerId)) return
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (this.ptrs.size >= 2) {
        const [a, b] = [...this.ptrs.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (this.pinchD) this.zoom(-(d - this.pinchD) * 0.05)
        this.pinchD = d
        this.dragMoved = true
        return
      }
      if (!this.dragLast) return
      const dx = e.clientX - this.dragLast.x, dy = e.clientY - this.dragLast.y
      if (!this.dragMoved && Math.abs(e.clientX - this.dragLast.x) + Math.abs(e.clientY - this.dragLast.y) < 4) return
      this.dragMoved = true
      this.dragLast = { x: e.clientX, y: e.clientY }
      if (this.seat) {
        this.seatYaw -= dx * 0.006
        this.seatH = Math.max(-2.2, Math.min(5, this.seatH + dy * 0.03))
        this.setMoved(true)
      } else this.camYaw -= dx * 0.006
    })
    const up = (e: PointerEvent) => {
      const wasPinch = this.ptrs.size >= 2
      this.ptrs.delete(e.pointerId)
      this.pinchD = 0
      if (!this.dragMoved && !wasPinch && !this.seat && !this.locked && e.type === 'pointerup') this.tapWalk(e)
      if (this.ptrs.size === 0) { this.dragLast = null; this.dragMoved = false }
    }
    onEl('pointerup', up)
    onEl('pointercancel', up)
    onEl('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY * 0.012) }, { passive: false })
  }

  private zoom(d: number) {
    if (this.seat) { this.seatDist = Math.max(-3, Math.min(8, this.seatDist + d)); this.setMoved(true) }
    else this.camDist = Math.max(9, Math.min(32, this.camDist + d))
  }

  private setMoved(m: boolean) {
    if (m !== this.moved) { this.moved = m; this.hooks.onViewMoved(m) }
  }

  private tapWalk(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect()
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1
    const rc = new THREE.Raycaster()
    rc.setFromCamera(new THREE.Vector2(nx, ny), this.camera)
    const o = rc.ray.origin, d = rc.ray.direction
    if (d.y < -0.01) {
      const tt = -o.y / d.y
      this.target = { x: Math.max(-22, Math.min(MAX_X - 1, o.x + d.x * tt)), z: Math.max(-14, Math.min(15, o.z + d.z * tt)) }
    }
  }

  /* ---------- simulation ---------- */

  private resolve(pos: THREE.Vector3, rad: number) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad
      if (d < m && d > 1e-4) { pos.x = c.x + (dx / d) * m; pos.z = c.z + (dz / d) * m }
    }
    const inDoor = pos.z > DOOR_Z0 + rad && pos.z < DOOR_Z1 - rad
    if (pos.x > WALL_X - 1.8 && pos.x < WALL_X + 1.8 && !inDoor) pos.x = pos.x < WALL_X ? WALL_X - 1.8 : WALL_X + 1.8
    pos.x = Math.max(-22.5, Math.min(MAX_X, pos.x))
    pos.z = Math.max(-14.5, Math.min(15.5, pos.z))
  }

  private moveChar(c: Char, vx: number, vz: number, dt: number, rad: number) {
    const sp = Math.hypot(vx, vz)
    if (sp > 0.01) {
      c.g.position.x += vx * dt
      c.g.position.z += vz * dt
      this.resolve(c.g.position, rad)
      const h = Math.atan2(vx, vz)
      let d = h - c.heading
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      c.heading += d * Math.min(1, dt * 12)
      c.g.rotation.y = c.heading
    }
    c.v += (sp - c.v) * Math.min(1, dt * 10)
  }

  private animChar(c: Char, dt: number, t: number) {
    const moving = c.v > 0.2
    c.phase += dt * (4 + c.v * 1.6)
    const sw = c.sit ? 0 : Math.sin(c.phase) * 0.85 * Math.min(1, c.v / 3)
    c.legs[0].rotation.x = c.sit ? -1.45 : sw
    c.legs[1].rotation.x = c.sit ? -1.45 : -sw
    const armA = c.sit ? -0.5 : -sw * 0.8
    c.arms[0].rotation.x = armA; c.arms[1].rotation.x = -armA
    c.arms[0].rotation.z = 0; c.arms[1].rotation.z = 0
    c.head.rotation.x = 0
    const by = c.sit ? 0 : moving ? Math.abs(Math.sin(c.phase)) * 0.07 : Math.sin(t * 2 + c.phase) * 0.012
    c.body.position.y = 1.1 + by
    c.head.position.y = 1.82 + by
    if (c.emote) {
      c.emoteT -= dt
      if (c.emote === 'wave') { c.arms[1].rotation.z = -2.6 + Math.sin(t * 14) * 0.35; c.arms[1].rotation.x = 0 }
      else if (c.emote === 'cheer') { c.arms[0].rotation.z = 2.7; c.arms[1].rotation.z = -2.7; c.arms[0].rotation.x = 0; c.arms[1].rotation.x = 0; c.g.position.y = c.baseY + Math.abs(Math.sin(t * 10)) * 0.35 }
      else if (c.emote === 'shrug') { c.arms[0].rotation.z = 0.9; c.arms[1].rotation.z = -0.9; c.arms[0].rotation.x = -0.6; c.arms[1].rotation.x = -0.6; c.head.rotation.z = Math.sin(t * 5) * 0.15 }
      else if (c.emote === 'slump') { c.head.rotation.x = 0.55; c.arms[0].rotation.x = 0.1; c.arms[1].rotation.x = 0.1; c.body.position.y = 1.02; c.head.position.y = 1.7 }
      if (c.emoteT <= 0) { c.emote = null; c.g.position.y = c.baseY; c.head.rotation.z = 0 }
    } else c.g.position.y = c.baseY
    if (c.bub) {
      c.bubT -= dt
      if (c.bubT <= 0) { c.g.remove(c.bub); (c.bub.material as THREE.SpriteMaterial).map?.dispose(); c.bub.material.dispose(); c.bub = null }
    }
  }

  private setPrompt(it: Interactable | null) {
    const key = it ? `${it.kind}:${it.tableId ?? ''}:${it.sub()}` : ''
    if (key === this.promptKey) return
    this.promptKey = key
    this.hooks.onPrompt(it ? { kind: it.kind, tableId: it.tableId, label: it.label, sub: it.sub() } : null)
  }

  private frame = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.frame)
    if (this.paused) return
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016)
    this.last = now
    const t = now / 1000
    const P = this.player

    /* input to velocity */
    let vx = 0, vz = 0
    if (!this.seat) {
      let ix = (this.keys.d || this.keys.ArrowRight ? 1 : 0) - (this.keys.a || this.keys.ArrowLeft ? 1 : 0) + this.joy.x
      let iz = (this.keys.s || this.keys.ArrowDown ? 1 : 0) - (this.keys.w || this.keys.ArrowUp ? 1 : 0) + this.joy.z
      const il = Math.hypot(ix, iz)
      if (il > 1) { ix /= il; iz /= il }
      if (il > 0.08) {
        this.target = null
        const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw), rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw)
        vx = (fx * -iz + rx * ix) * 5.8
        vz = (fz * -iz + rz * ix) * 5.8
      } else if (this.target) {
        const dx = this.target.x - P.g.position.x, dz = this.target.z - P.g.position.z, d = Math.hypot(dx, dz)
        if (d < 0.2) this.target = null
        else { vx = (dx / d) * 5.4; vz = (dz / d) * 5.4 }
      }
    }
    this.moveChar(P, vx, vz, dt, 0.45)
    if (P.v > 1 && P.emote && P.emote !== 'cheer') P.emote = null

    /* ambient crowd */
    for (const c of this.npcs) {
      const n = c.npc
      if (!n) continue
      const dx = n.tx - c.g.position.x, dz = n.tz - c.g.position.z, d = Math.hypot(dx, dz)
      let sx = 0, sz = 0
      if (d < 0.4) {
        n.wait -= dt
        if (n.wait <= 0) {
          const pool = n.annex ? this.annexSpots : this.spots
          const sp = pool[rnd(pool.length)]
          n.tx = sp[0] + (Math.random() - 0.5); n.tz = sp[1] + (Math.random() - 0.5)
          n.wait = 2 + Math.random() * 5
          if (Math.random() < 0.35) this.bubble(c, LINES[rnd(LINES.length)])
          if (Math.random() < 0.2) { c.emote = (['wave', 'cheer', 'shrug'] as const)[rnd(3)]; c.emoteT = 2 }
        }
      } else { sx = (dx / d) * n.sp; sz = (dz / d) * n.sp }
      this.moveChar(c, sx, sz, dt, 0.45)
    }
    this.ambientT += dt
    if (this.ambientT > 2.2) {
      this.ambientT = 0
      const tb = this.tables[rnd(this.tables.length)]
      if (tb) { const i = rnd(6); tb.seats[i] = tb.seats[i] < 0 ? 1 : -1; this.refreshSeats(tb) }
    }

    for (const tb of this.tables) {
      const d = tb.dealer
      const dx = P.g.position.x - d.g.position.x, dz = P.g.position.z - d.g.position.z
      if (Math.hypot(dx, dz) < 7) d.heading += (Math.atan2(dx, dz) - d.heading) * Math.min(1, dt * 3)
      else d.heading *= 1 - Math.min(1, dt * 2)
      d.g.rotation.y = d.heading
    }

    const seated = this.seat !== null
    for (const c of this.chars) {
      this.animChar(c, dt, t)
      if (c.label) {
        const dd = Math.hypot(c.g.position.x - P.g.position.x, c.g.position.z - P.g.position.z)
        c.label.visible = !seated && (c === P || dd < (c.npc ? 7 : 9))
        c.label.material.opacity = c === P ? 1 : Math.max(0.25, 1 - dd / 10)
      }
    }
    for (const tb of this.tables) {
      const dd = Math.hypot(tb.def.x - P.g.position.x, tb.def.z - P.g.position.z)
      tb.sign.material.opacity = dd < 5.5 ? 0.35 : 1
      tb.sign.visible = this.seat !== tb
    }
    if (this.signLight) this.signLight.color.setScalar(0.92 + Math.sin(t * 3) * 0.04 + (Math.sin(t * 37) > 0.97 ? -0.25 : 0))

    /* nearest interactable */
    let near: Interactable | null = null
    if (!seated) {
      let best = 1e9
      for (const it of this.inter) {
        const d = Math.hypot(P.g.position.x - it.x, P.g.position.z - it.z)
        if (d < it.r && d < best) { best = d; near = it }
      }
    }
    this.nearest = near
    this.setPrompt(near)
    this.ring.visible = !!near && near.kind !== 'table'
    if (near && this.ring.visible) {
      this.ring.position.set(near.x, 0.05, near.z)
      this.ring.scale.setScalar(1 + Math.sin(t * 5) * 0.12)
    }

    this.updateCamera(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private updateCamera(dt: number) {
    const P = this.player.g.position
    const asp = this.camera.aspect
    const want = new THREE.Vector3()
    const lk = new THREE.Vector3()
    if (this.seat) {
      const tb = this.seat.def
      const mob = this.layout === 'sheet'
      const ang = Math.atan2(P.z - tb.z, P.x - tb.x) + this.seatYaw
      const R = (mob ? 10.8 : 10.0) + this.seatDist
      const h = (mob ? 6.2 : 4.6) + this.seatH
      want.set(tb.x + Math.cos(ang) * R, h, tb.z + Math.sin(ang) * R)
      if (mob) lk.set(tb.x, -2.6, tb.z)
      else lk.set(tb.x + Math.sin(ang) * 1.9, 1.0, tb.z - Math.cos(ang) * 1.9)
      want.x = Math.max(-23, Math.min(75, want.x))
      want.z = Math.max(-15.4, Math.min(34, want.z))
    } else {
      const pf = asp < 1 ? 1 + (1 - asp) * 0.95 : 1
      const cp = Math.cos(0.98), sp = Math.sin(0.98)
      const cd = this.camDist * pf
      want.set(P.x + Math.sin(this.camYaw) * cd * cp, cd * sp + 1, P.z + Math.cos(this.camYaw) * cd * cp)
      lk.set(P.x, 1.4, P.z)
    }
    const k = Math.min(1, dt * (this.seat ? 3.2 : 6))
    this.camera.position.lerp(want, k)
    if (!this.lookInit) { this.look.copy(lk); this.lookInit = true }
    this.look.lerp(lk, Math.min(1, dt * (this.seat ? 3.2 : 8)))
    this.camera.lookAt(this.look)
  }
}
