import { Link } from 'react-router-dom'
import { ScreenShell } from '../components/ScreenShell'
import './menu.css'

const STEPS = [
  { no: '01', h: 'Read', p: 'Each suspect speaks. The thief deflects. A baiter acts guilty on purpose.' },
  { no: '02', h: 'Probe', p: 'Spend a scan for a noisy, TEE attested suspicion read. Never the answer.' },
  { no: '03', h: 'Accuse', p: 'Lock one suspect. Your bond is now on the line.' },
  { no: '04', h: 'Reveal', p: 'Seals break into attestations. The pot settles on chain.' },
]

const LEGEND = [
  { c: 'var(--sky)', b: 'Sky', s: 'the cop, your side' },
  { c: 'var(--gold)', b: 'Gold', s: 'loot and score' },
  { c: 'var(--alarm)', b: 'Magenta', s: 'the thief and the siren' },
  { c: 'var(--lime)', b: 'Lime', s: 'verified by the TEE' },
]

export function HowToPlay() {
  return (
    <ScreenShell title="How to Play" sub="Catch the thief without busting an innocent. Two minutes a case." back={{ to: '/menu', label: '◀ Menu' }}>
      <section className="panel">
        <h2 className="panel-h">The round, four beats</h2>
        <div className="how-steps">
          {STEPS.map((s) => (
            <div className="how-step" key={s.no}>
              <div className="no">{s.no}</div>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-h">The twist, the bait economy</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--cream)' }}>
          A wrong arrest pays the accused. So an innocent can act guilty on purpose to bait you into
          busting them, then farm the lawsuit. The thief hides inside a crowd that is all faking it.
          Your staked bond is what makes every accusation a real gamble. A high suspicion meter is
          never proof.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-h">Controls</h2>
        <p className="panel-note" style={{ marginTop: 0 }}>
          <b style={{ color: 'var(--sky)' }}>Scan</b> spends one of two interrogations for a read.{' '}
          <b style={{ color: 'var(--alarm)' }}>Accuse</b> locks your bust. Everything is keyboard
          reachable: Tab to move, Enter or Space to act, Escape to dismiss an overlay.
        </p>
        <p className="panel-note">
          Shortcuts in a case: <b style={{ color: 'var(--sky)' }}>1-5</b> scan that suspect,{' '}
          <b style={{ color: 'var(--sky)' }}>P</b> pause, <b style={{ color: 'var(--sky)' }}>N</b>{' '}
          new case.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-h">Color is meaning, not decoration</h2>
        <div className="legend">
          {LEGEND.map((l) => (
            <div className="legend-row" key={l.b}>
              <span className="legend-sw" style={{ background: l.c }} />
              <span>
                <b>{l.b}</b> {l.s}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-h">Why it can't cheat</h2>
        <p className="panel-note" style={{ marginTop: 0 }}>
          Roles are sealed inside a hardware enclave on 0G Compute, so nobody, including us, can see
          or fake who the thief is. The pot settles on 0G Chain where anyone can audit the payout,
          and every case is saved to 0G Storage as a verifiable replay.
        </p>
      </section>

      <div className="cta" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 22 }}>
        <Link className="btn btn-gold" to="/play">
          ▶ Start a case
        </Link>
        <Link className="btn btn-ghost" to="/menu">
          Back to menu
        </Link>
      </div>
    </ScreenShell>
  )
}
