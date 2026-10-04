/* The arena entry as a walkable 3D casino floor. Each table is a live arena;
   sitting at one runs the real Scan > Holder > Thesis > Predict > Commit flow
   in a dock beside (or under) the scene, so the player never leaves the room.
   "Full page" is the explicit way to the flat 2D version of the same flow.

   A doorway on the right leads to the Community Hall: tables anyone opened for
   a Solana meme coin through the worker's registry, plus a listing desk and
   open pedestals for opening more.

   No WebGL, or a thrown error while building the scene, falls back to the 2D
   arena list so nobody is locked out. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArenaTopbar } from '../sold/arena/ArenaTopbar'
import { ArenaHome } from '../sold/arena/ArenaHome'
import { ArenaScenes, useUsdPrice } from '../sold/arena/ArenaFlow'
import { ARENAS, LIVE_ARENAS } from '../sold/arena/arenas'
import { useArena } from '../sold/arena/useArena'
import { useAllArenaMarkets } from '../sold/arena/useAllArenaMarkets'
import { useCountdown } from '../sold/arena/useCountdown'
import { fetchCommunity, type CommunityList, type CommunityTable } from '../sold/arena/communityClient'
import { useMarkets } from '../sold/market/useMarkets'
import { useSolana } from '../wallet/SolanaContext'
import { BET_TOKEN } from '../sold/soldConfig'
import { pct } from '../sold/dmp/dmp'
import { useSettings } from '../settings/SettingsContext'
import { sfx } from '../lib/sfx'
import { jazz } from '../lib/jazz'
import { FloorWorld, COMMUNITY_SLOTS, communitySlotPos, type FloorTable, type LockedTable, type Prompt, type InteractKind } from './FloorWorld'
import { ListCoinForm } from './ListCoin'
import '../sold/arena/arena.css'
import './floor.css'

const COLS = [-16.5, -5.5, 5.5, 16.5]
const ROWS = [-5, 7]
const TABLES: FloorTable[] = LIVE_ARENAS.slice(0, COLS.length * ROWS.length).map((a, i) => ({
  id: a.id,
  ticker: a.ticker.replace('$', ''),
  chain: a.mint?.startsWith('0x') ? 'BSC' : 'SOL',
  x: COLS[i % COLS.length],
  z: ROWS[Math.floor(i / COLS.length)],
}))
const LOCKED: LockedTable[] = ARENAS.filter((a) => a.status !== 'live').slice(0, 2).map((a) => ({ id: a.id, ticker: a.ticker.replace('$', '') }))
const ENTERED_KEY = 'wr.floor.entered'

/** Oldest first, so a new listing takes the next free pedestal and the rest stay put. */
function communityFloorTables(list: CommunityList): FloorTable[] {
  return [...list.tables]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, COMMUNITY_SLOTS)
    .map((t, slot) => ({ id: t.id, ticker: t.symbol, chain: 'SOL', community: true, slot, ...communitySlotPos(slot) }))
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

function readEntered(): boolean {
  try { return localStorage.getItem(ENTERED_KEY) === '1' } catch { return false }
}

export function ArenaFloor() {
  const ok = useMemo(webglOk, [])
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  if (!ok || failed) return <ArenaHome />
  return <FloorScene onFail={onFail} />
}

/* Reads one community arena's live numbers for its sign. Renders nothing. */
function CommunityProbe({ id, onInfo }: { id: string; onInfo: (id: string, risk: number | null, holders: number | null) => void }) {
  const { address } = useSolana()
  const m = useMarkets(address, id)
  const risk = m.analytics?.topPYes ?? null
  const holders = m.markets.length || null
  useEffect(() => { onInfo(id, risk, holders) }, [id, risk, holders, onInfo])
  return null
}

/* ---------- seated dock: the real flow, in the room ---------- */

interface DockProps {
  arenaId: string
  peek: boolean
  onStand: () => void
  onFull: () => void
  onPeek: () => void
  onStake: (n: number) => void
  onCommitted: () => void
}

function SeatedDock({ arenaId, peek, onStand, onFull, onPeek, onStake, onCommitted }: DockProps) {
  const a = useArena(arenaId)
  const usdPrice = useUsdPrice(a)
  const { scene, stake } = a
  const committedRef = useRef(false)

  useEffect(() => { onStake(scene === 'thesis' || scene === 'predict' || scene === 'review' ? stake : 0) }, [scene, stake, onStake])
  useEffect(() => {
    if (scene === 'locked' && !committedRef.current) { committedRef.current = true; onCommitted() }
    if (scene !== 'locked') committedRef.current = false
  }, [scene, onCommitted])

  return (
    <aside className={`fl-dock${peek ? ' fl-peek' : ''}`} aria-label={`${a.arena?.name ?? 'Arena'} table`}>
      <div className="fl-dock-bar">
        <span className="fl-dock-title">{a.arena?.ticker}</span>
        <span className="fl-dock-sp" />
        <button className="arena-btn arena-btn-ghost fl-sm" onClick={onPeek}>{peek ? 'Show table' : 'Peek at room'}</button>
        <button className="arena-btn arena-btn-ghost fl-sm" onClick={onFull} title="Open this arena as a flat page">Full page</button>
        <button className="arena-btn arena-btn-ghost fl-sm" onClick={onStand}>Stand up</button>
      </div>
      {!peek && (
        <div className="fl-dock-body">
          <div className="arena-page">
            <ArenaScenes a={a} usdPrice={usdPrice} />
          </div>
        </div>
      )}
    </aside>
  )
}

/* ---------- the floor ---------- */

function FloorScene({ onFail }: { onFail: () => void }) {
  const navigate = useNavigate()
  const { settings, toggle } = useSettings()
  const { address, byArena, myInPlay } = useAllArenaMarkets()
  const countdown = useCountdown(byArena.ansem?.closesAt ?? 0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<FloorWorld | null>(null)
  const spawnRef = useRef<{ x: number; z: number } | undefined>(undefined)
  const infoRef = useRef(new Map<string, { risk: number | null; holders: number | null }>())
  const [community, setCommunity] = useState<CommunityList | null>(null)
  const [ready, setReady] = useState(false)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [seated, setSeated] = useState<string | null>(null)
  const [peek, setPeek] = useState(false)
  const [moved, setMoved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [entered, setEntered] = useState(readEntered)
  const [listing, setListing] = useState(false)
  const [emoteOpen, setEmoteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [now, setNow] = useState('')
  const toastT = useRef<number | undefined>(undefined)
  const joyRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLSpanElement | null>(null)
  const joyId = useRef<number | null>(null)
  const enterBtn = useRef<HTMLButtonElement | null>(null)

  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const commTables = useMemo(() => (community ? communityFloorTables(community) : []), [community])

  const say = useCallback((m: string) => {
    setToast(m)
    window.clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const stand = useCallback(() => {
    worldRef.current?.standUp()
    setSeated(null)
    setPeek(false)
    sfx.play('back')
  }, [])

  const onInfo = useCallback((id: string, risk: number | null, holders: number | null) => {
    infoRef.current.set(id, { risk, holders })
    worldRef.current?.setTableInfo(id, { risk, holders })
  }, [])

  /* The scene's hooks always call the freshest handlers. */
  const handlers = useRef({ interact: (_k: InteractKind, _id?: string) => {} })
  handlers.current.interact = (kind, id) => {
    const w = worldRef.current
    if (!w) return
    if (kind === 'table' && id) { w.seatAt(id); setSeated(id); setPeek(false); setEmoteOpen(false); sfx.play('select') }
    else if (kind === 'listing') { setListing(true); setEmoteOpen(false); sfx.play('select') }
    else if (kind === 'cashier') navigate('/portfolio')
    else if (kind === 'board') navigate('/leaderboard')
    else if (kind === 'juke') {
      if (!settings.music) { toggle('music'); say('Jukebox on') }
      else { jazz.next(); setNow(jazz.label()); say(`Now playing: ${jazz.label()}`) }
    }
    else if (kind === 'slots') say('The slots open when the chip economy does.')
  }

  /* the community list decides which tables exist, so it loads before the room is built */
  useEffect(() => {
    let cancelled = false
    void fetchCommunity().then((list) => { if (!cancelled) setCommunity(list) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !community) return
    let cancelled = false
    let world: FloorWorld | null = null
    setReady(false); setSeated(null); setPrompt(null); setMoved(false); setPeek(false)
    const fonts = typeof document.fonts?.load === 'function'
      ? Promise.race([
          Promise.all([document.fonts.load('700 20px "Silkscreen"'), document.fonts.load('700 20px "Space Mono"')]),
          new Promise((r) => window.setTimeout(r, 1500)),
        ])
      : Promise.resolve()
    void fonts.then(() => {
      if (cancelled) return
      try {
        world = new FloorWorld(canvas, [...TABLES, ...commTables], LOCKED, {
          onPrompt: setPrompt,
          onInteract: (k, id) => handlers.current.interact(k, id),
          onViewMoved: setMoved,
        }, { spawn: spawnRef.current })
        spawnRef.current = undefined
        worldRef.current = world
        if (import.meta.env.DEV) (window as unknown as { __floor?: FloorWorld }).__floor = world
        setReady(true)
      } catch (e) {
        console.error('3D floor failed, using the 2D list', e)
        onFail()
      }
    })
    return () => { cancelled = true; world?.dispose(); worldRef.current = null }
  }, [community, commTables, onFail])

  /* real data onto the table signs */
  useEffect(() => {
    const w = worldRef.current
    if (!w || !ready) return
    for (const t of TABLES) {
      const m = byArena[t.id]
      if (!m) continue
      w.setTableInfo(t.id, { risk: m.analytics?.topPYes ?? null, holders: m.markets.length || null })
    }
    infoRef.current.forEach((v, id) => w.setTableInfo(id, v))
  }, [byArena, ready])

  /* panels stop the room listening to the keyboard */
  useEffect(() => { worldRef.current?.setLocked(listing || !entered) }, [listing, entered, ready])

  /* dock layout follows the viewport; the loop sleeps in a hidden tab */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const apply = () => worldRef.current?.setLayout(mq.matches ? 'sheet' : 'side')
    apply()
    mq.addEventListener('change', apply)
    const vis = () => worldRef.current?.setPaused(document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => { mq.removeEventListener('change', apply); document.removeEventListener('visibilitychange', vis) }
  }, [ready])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (listing) setListing(false)
      else if (helpOpen || emoteOpen || reportOpen) { setHelpOpen(false); setEmoteOpen(false); setReportOpen(false) }
      else if (seated) stand()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [seated, stand, listing, helpOpen, emoteOpen, reportOpen])

  useEffect(() => { if (!entered) enterBtn.current?.focus() }, [entered, community])

  /* "now playing": the jazz engine moves through forms, so the label is polled */
  useEffect(() => {
    if (!settings.music) { setNow(''); return }
    const read = () => setNow(jazz.isPlaying() ? jazz.label() : '')
    read()
    const t = window.setInterval(read, 2500)
    return () => window.clearInterval(t)
  }, [settings.music])

  const enter = (then?: () => void) => {
    try { localStorage.setItem(ENTERED_KEY, '1') } catch { /* private mode: the intro just shows again next time */ }
    setEntered(true)
    then?.()
    canvasRef.current?.focus()
  }

  const onListed = useCallback((t: CommunityTable, created: boolean) => {
    setListing(false)
    void fetchCommunity().then((list) => {
      const mine = communityFloorTables(list).find((x) => x.id === t.id)
      if (mine) spawnRef.current = { x: mine.x, z: mine.z + 3.9 }
      say(created ? `Table opened for $${t.symbol}. Take a seat.` : `$${t.symbol} already has a table. Here it is.`)
      setCommunity(list)
    })
  }, [say])

  /* joystick */
  const joyMove = (e: React.PointerEvent) => {
    const el = joyRef.current, w = worldRef.current
    if (!el || !w) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const m = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx)
    const jx = Math.cos(a) * m, jz = Math.sin(a) * m
    w.setJoystick(jx, jz)
    if (knobRef.current) knobRef.current.style.transform = `translate(${jx * 34}px, ${jz * 34}px)`
  }
  const joyEnd = (e: React.PointerEvent) => {
    if (joyId.current !== e.pointerId) return
    joyId.current = null
    worldRef.current?.setJoystick(0, 0)
    if (knobRef.current) knobRef.current.style.transform = ''
  }

  const feed = useMemo(() => {
    const lines: string[] = [`Window closes in ${countdown}`]
    let top: { t: string; h: string; p: number } | null = null
    let tracked = 0
    for (const t of TABLES) {
      const m = byArena[t.id]
      tracked += m?.markets.length ?? 0
      const an = m?.analytics
      if (an && an.topPYes != null && (!top || an.topPYes > top.p)) top = { t: t.ticker, h: an.topHandle ?? '', p: an.topPYes }
    }
    if (top) lines.push(`Highest model risk: ${top.t}${top.h ? ` @${top.h}` : ''}, ${pct(top.p)}`)
    lines.push(`${tracked} holders tracked in ${TABLES.length} arenas`)
    if (commTables.length) lines.push(`${commTables.length} community ${commTables.length === 1 ? 'table' : 'tables'} open`)
    if (address) lines.push(`Your stakes in play: ${fmt(myInPlay)} ${BET_TOKEN}`)
    return lines
  }, [byArena, countdown, address, myInPlay, commTables.length])

  const w = worldRef.current
  const onCommitted = useCallback(() => {
    const wd = worldRef.current
    if (!wd) return
    wd.say('Locked in.')
    if (seated) wd.dealerReact(seated, 'wave')
    sfx.play('seal')
  }, [seated])

  const openCount = community?.tables.length ?? 0

  return (
    <div className={`arena-shell fl-shell${seated ? ' fl-seated' : ''}`}>
      <ArenaTopbar inPlay={address ? myInPlay : undefined} />
      <div className="fl-world">
        <canvas ref={canvasRef} className="fl-canvas" tabIndex={0}
          aria-label="3D casino floor. Walk with W A S D or the arrow keys, press E to use what is nearby." />

        {commTables.map((t) => <CommunityProbe key={t.id} id={t.id} onInfo={onInfo} />)}

        <div className="fl-hud fl-tl">
          <span className="arena-chip" title="Players you see wandering are ambient scenery. Live players arrive with the presence room.">
            <span className="fl-dot" /> AMBIENT CROWD
          </span>
          <div className="fl-report">
            <button className="fl-report-head" onClick={() => setReportOpen((o) => !o)} aria-expanded={reportOpen}>
              <span>{feed[0]}</span><span aria-hidden="true">{reportOpen ? '−' : '+'}</span>
            </button>
            {reportOpen && <ul className="fl-feed" aria-label="Floor report">{feed.slice(1).map((l) => <li key={l}>{l}</li>)}</ul>}
          </div>
        </div>

        <div className="fl-hud fl-tr">
          {now && (
            <button className="arena-btn arena-btn-ghost fl-sm fl-now" onClick={() => { jazz.next(); setNow(jazz.label()) }} title="Next piece">
              <span aria-hidden="true">♪</span> {now}
            </button>
          )}
          <button className="arena-btn arena-btn-ghost fl-sm" onClick={() => setHelpOpen((o) => !o)} aria-expanded={helpOpen} aria-label="Controls and help">?</button>
          <Link to="/arena/map" className="arena-btn arena-btn-ghost fl-sm">Map view</Link>
        </div>
        {helpOpen && (
          <div className="fl-hud fl-help" role="dialog" aria-label="Controls">
            <p className="fl-help-title">Controls</p>
            {coarse ? (
              <ul>
                <li><b>Left stick</b> walk</li>
                <li><b>Drag the room</b> look around</li>
                <li><b>Pinch</b> zoom</li>
                <li><b>USE</b> sit, open, enter</li>
                <li><b>Emote</b> wave, cheer, chat</li>
              </ul>
            ) : (
              <ul>
                <li><b>W A S D</b> or arrows: walk</li>
                <li><b>Click the floor</b> walk there</li>
                <li><b>Drag</b> look around, <b>wheel</b> zoom</li>
                <li><b>E</b> sit, open, enter</li>
                <li><b>1 to 5</b> emotes, <b>Esc</b> stand up</li>
              </ul>
            )}
            <p className="fl-help-links"><Link to="/sold">How it works</Link> · <Link to="/how">The detective game</Link></p>
          </div>
        )}

        {toast && <div className="fl-hud fl-toast" role="status">{toast}</div>}

        {prompt && !seated && entered && !listing && (
          <div className="fl-hud fl-prompt">
            <kbd>E</kbd>
            <span>{prompt.label}</span>
            <small>{prompt.sub}</small>
          </div>
        )}
        {prompt && !seated && entered && !listing && (
          <button className="fl-hud fl-act" onClick={() => w?.interact()} aria-label={prompt.label}>USE</button>
        )}

        {!seated && entered && (
          <div className="fl-hud fl-emotes">
            {emoteOpen && (
              <div className="fl-emote-pop" role="toolbar" aria-label="Emotes">
                <button onClick={() => { w?.emote('wave'); setEmoteOpen(false) }}>Wave</button>
                <button onClick={() => { w?.emote('cheer'); setEmoteOpen(false) }}>Cheer</button>
                <button onClick={() => { w?.emote('shrug'); setEmoteOpen(false) }}>Shrug</button>
                <button onClick={() => { w?.say('Sells. I can feel it.'); setEmoteOpen(false) }}>Sells.</button>
                <button onClick={() => { w?.say('Holding. Easy.'); setEmoteOpen(false) }}>Holds.</button>
              </div>
            )}
            <button className="fl-emote-btn" onClick={() => setEmoteOpen((o) => !o)} aria-expanded={emoteOpen} aria-label="Emotes">
              {emoteOpen ? 'Close' : 'Emote'}
            </button>
          </div>
        )}
        {!seated && entered && (
          <div ref={joyRef} className="fl-hud fl-joy" aria-hidden="true"
            onPointerDown={(e) => { joyId.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); joyMove(e) }}
            onPointerMove={(e) => { if (joyId.current === e.pointerId) joyMove(e) }}
            onPointerUp={joyEnd} onPointerCancel={joyEnd}>
            <span ref={knobRef} />
          </div>
        )}

        {seated && moved && (
          <button className="fl-hud fl-recenter arena-btn arena-btn-ghost fl-sm" onClick={() => { worldRef.current?.recenter(); setMoved(false) }}>
            Recenter view
          </button>
        )}
        {seated && !peek && !moved && <p className="fl-hud fl-lookhint">Drag the room to look around.</p>}

        {seated && (
          <SeatedDock
            key={seated}
            arenaId={seated}
            peek={peek}
            onStand={stand}
            onFull={() => navigate(`/arena/${seated}`)}
            onPeek={() => setPeek((p) => !p)}
            onStake={(n) => worldRef.current?.setStake(n)}
            onCommitted={onCommitted}
          />
        )}

        {listing && (
          <div className="fl-modal-back" onClick={() => setListing(false)}>
            <div className="fl-modal" role="dialog" aria-modal="true" aria-label="Open a community table" onClick={(e) => e.stopPropagation()}>
              <div className="fl-modal-head">
                <h2>Open a community table</h2>
                <button className="arena-btn arena-btn-ghost fl-sm" onClick={() => setListing(false)}>Close</button>
              </div>
              <ListCoinForm open={openCount} cap={community?.cap ?? COMMUNITY_SLOTS} ttlDays={community?.ttlDays ?? 7} onListed={onListed} />
            </div>
          </div>
        )}

        {!entered && community && (
          <div className="fl-entry" role="dialog" aria-modal="true" aria-labelledby="fl-entry-title">
            <div className="fl-entry-card">
              <p className="arena-eyebrow">WHO RUGGED? ARENA</p>
              <h1 id="fl-entry-title" className="fl-entry-title">Step onto the floor</h1>
              <p className="fl-entry-lede">Every table is a token. Sit down, read a top holder's wallet, and call whether they sell. You play with points, not real money.</p>
              <ol className="fl-entry-steps">
                <li><b>Pick a table.</b> Eight arenas are open. The Community Hall through the right-hand door holds tables players opened for their own coins.</li>
                <li><b>Read the holder.</b> Real wallets, a model's sell risk, and the crowd's odds.</li>
                <li><b>Lock in your call.</b> Win when the wallet does what you said.</li>
              </ol>
              <div className="fl-entry-actions">
                <button ref={enterBtn} className="arena-btn arena-btn-primary arena-btn-lg" onClick={() => enter()}>Enter the floor</button>
                <button className="arena-btn arena-btn-ghost arena-btn-lg" onClick={() => enter(() => setListing(true))}>Open a table for my coin</button>
              </div>
              <p className="fl-entry-fine">
                {coarse ? 'Left stick to walk, drag to look, USE to sit.' : 'W A S D to walk, drag to look, E to sit.'}{' '}
                <Link to="/sold">How it works</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
