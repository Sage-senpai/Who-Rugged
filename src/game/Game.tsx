import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useGame } from './useGame'
import { nextUnlock } from './profile'
import { SuspectCard } from './SuspectCard'
import { VerdictModal } from './VerdictModal'
import { CourtroomOverlay } from './CourtroomOverlay'
import { PauseOverlay } from './PauseOverlay'
import { Onboarding } from './Onboarding'
import { DIFFICULTY } from './difficulty'
import { useSettings } from '../settings/SettingsContext'
import { sfx } from '../lib/sfx'
import './game.css'

const fmt = (n: number) => n.toLocaleString()
const caseLabel = (n: number) => '#' + String(n).padStart(4, '0')
const ONBOARD_KEY = 'who-rugged:onboarded'

function needsOnboarding(): boolean {
  try {
    return !localStorage.getItem(ONBOARD_KEY)
  } catch {
    return false
  }
}

export function Game() {
  const { settings } = useSettings()
  const [paused, setPaused] = useState(false)
  const [onboarding, setOnboarding] = useState(needsOnboarding)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // the clock pauses while the game is frozen (paused or first-run onboarding)
  const frozen = paused || onboarding
  const g = useGame(undefined, settings.difficulty, frozen)
  const { player, gameCase, status, verdict, revealed, overlay, busyScanId, error, probesLeft, secondsLeft } = g

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const dismissOnboarding = () => {
    try {
      localStorage.setItem(ONBOARD_KEY, '1')
    } catch {
      /* non-fatal */
    }
    setOnboarding(false)
  }

  // buzz and call it out the moment the last scan is spent
  const prevProbes = useRef(probesLeft)
  useEffect(() => {
    if (prevProbes.current > 0 && probesLeft === 0 && status === 'open') {
      sfx.play('buzz')
      showToast("You're out of scans. Make the call.")
    }
    prevProbes.current = probesLeft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probesLeft, status])

  // keyboard shortcuts: 1-5 scan, P pause, N new case. Suspended behind overlays.
  const blocked = onboarding || paused || overlay !== 'none'
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (blocked) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'p') {
        e.preventDefault()
        sfx.play('select')
        setPaused(true)
      } else if (k === 'n') {
        e.preventDefault()
        g.newCase()
      } else if (k >= '1' && k <= '5') {
        const idx = Number(k) - 1
        const s = gameCase?.suspects[idx]
        if (!s || status !== 'open') return
        e.preventDefault()
        if (probesLeft > 0 && s.read === null && !busyScanId) {
          void g.scan(s.id)
        } else if (s.read !== null) {
          sfx.play('buzz')
          showToast('Already scanned that suspect.')
        } else if (probesLeft === 0) {
          sfx.play('buzz')
          showToast("You're out of scans. Make the call.")
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, gameCase, status, probesLeft, busyScanId, g])

  const fmtTime = (s: number | null) =>
    s === null ? '--:--' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const lowTime = secondsLeft !== null && secondsLeft <= 15 && status === 'open'

  const resolved = status === 'resolved'
  const canScan = status === 'open' && probesLeft > 0 && !busyScanId
  const canAccuse = status === 'open' && !busyScanId

  let note: ReactNode
  if (status === 'resolving') {
    note = 'Settling on chain. Breaking the seals into attestations.'
  } else if (probesLeft === 0 && status === 'open') {
    note = (
      <>
        No scans left. The reads are <b>TEE attested</b>, provably not faked, but suspicion is not
        proof. Make the call.
      </>
    )
  } else {
    note = (
      <>
        An innocent can act guilty on purpose to bait a wrongful bust and farm the lawsuit. A high
        meter is not proof. <b>{nextUnlock(player.elo)}</b>
      </>
    )
  }

  return (
    <div className="game-view">
      <header className="hud">
        <div className="wrap">
          <span className="b gold">
            SCORE <i>{fmt(player.balance)}</i>
          </span>
          <span className="b">
            RANK <i>{player.elo}</i>
          </span>
          <span className="b lime">
            SOLVED <i>{player.wins}/{player.played}</i>
          </span>
          <button
            className="home pausebtn"
            onClick={() => {
              sfx.play('select')
              setPaused(true)
            }}
          >
            ❚❚ MENU
          </button>
          <span className="coin">◉ INSERT COIN</span>
        </div>
      </header>

      <main className="wrap" id="main">
        <div className="titlebar">
          <h1>
            WHO RUGGED<span className="q">?</span>
          </h1>
          <div className="sub">
            CASE {caseLabel(player.caseNo)} · PRECINCT 0G
          </div>
        </div>

        <section className="brief" aria-live="polite">
          <div className="siren">VAULT DRAINED OVERNIGHT</div>
          <p>
            Five suspects sat at the table. One is the <b>Thief</b>. Read their statements, spend
            your scans, and make the bust. Get it wrong and the accused sues you and the thief
            walks.
          </p>
          <div className="vault">
            <span>
              POOL <b>{gameCase ? `${fmt(gameCase.pool)} $GG` : '...'}</b>
            </span>
            <span className="lost">
              DRAINED <b>{gameCase ? `-${gameCase.stolen} $GG` : '...'}</b>
            </span>
            <span>
              SCANS LEFT <b>{gameCase ? probesLeft : '...'}</b>
            </span>
            <span>
              BOND AT RISK <b>{gameCase ? `${gameCase.bond} $GG` : '...'}</b>
            </span>
            <span>
              MODE <b>{DIFFICULTY[gameCase ? gameCase.difficulty : settings.difficulty].label}</b>
            </span>
            <span className={lowTime ? 'time-low' : ''}>
              TIME <b>{fmtTime(secondsLeft)}</b>
            </span>
          </div>
        </section>

        {status === 'error' ? (
          <div className="errbox" role="alert">
            <p>{error}</p>
            <button className="bigbtn" onClick={g.retry}>
              Reseal the case ▶
            </button>
          </div>
        ) : status === 'sealing' || !gameCase ? (
          <div className="grid" aria-busy="true" aria-label="Sealing roles inside the enclave">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skel" key={i}>
                <span className="seal-lab">SEALING ROLES · 0G COMPUTE</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid">
            {gameCase.suspects.map((s, i) => (
              <SuspectCard
                key={s.id}
                suspect={s}
                index={i}
                revealed={revealed}
                scanning={busyScanId === s.id}
                canScan={canScan}
                canAccuse={canAccuse}
                isAccused={gameCase.accusedId === s.id}
                onScan={g.scan}
                onAccuse={g.accuse}
              />
            ))}
          </div>
        )}

        {error && status !== 'error' && (
          <div className="errbox" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="bar">
          <p className="note" aria-live="polite">
            {note}
          </p>
          <button className="bigbtn" onClick={g.newCase} disabled={status === 'sealing'}>
            {resolved ? 'Next Case ▶' : 'New Case'}
          </button>
        </div>

        <p className="foot">
          SPRITES: DICEBEAR PIXEL-ART (CC0) · ROLES <b>SEALED ON 0G COMPUTE</b> · POT ON{' '}
          <b>0G CHAIN</b> · REPLAYS ON <b>0G STORAGE</b>
        </p>
      </main>

      {overlay === 'courtroom' && verdict && (
        <CourtroomOverlay verdict={verdict} onProceed={g.showVerdict} />
      )}
      {overlay === 'verdict' && verdict && (
        <VerdictModal verdict={verdict} onContinue={g.continueGame} />
      )}
      {paused && <PauseOverlay onResume={() => setPaused(false)} />}
      {onboarding && <Onboarding onDismiss={dismissOnboarding} />}
      {toast && (
        <div className="toast" role="status" aria-live="assertive">
          <span className="toast-buzz" aria-hidden="true">
            ⚠
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}
