import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { sfx } from '../lib/sfx'
import './path-chooser.css'

/* First-load splash: the universe's front door. Players pick one of the two
   games, then land on its dedicated page. Kept intentionally light — no wallet,
   no engine, just the choice. */
export function PathChooser() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState<null | 'sold' | 'rugged'>(null)

  const go = (path: 'sold' | 'rugged') => {
    if (leaving) return
    sfx.play('select')
    setLeaving(path)
    // let the exit animation play before routing
    window.setTimeout(() => navigate(path === 'sold' ? '/sold' : '/who-rugged'), 420)
  }

  // keyboard: ← / → to focus intent, Enter handled by the buttons themselves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') go('sold')
      if (e.key === '2') go('rugged')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <main id="main" className={`chooser${leaving ? ` chooser--leaving chooser--to-${leaving}` : ''}`}>
      <div className="chooser-topline">
        <span className="chooser-brand">THE WHO&nbsp;RUGGED? UNIVERSE</span>
        <span className="chooser-hint">CHOOSE YOUR GAME</span>
      </div>

      <div className="chooser-split">
        {/* WHO SOLD? */}
        <button
          type="button"
          className="chooser-panel chooser-panel--sold"
          onClick={() => go('sold')}
          aria-label="Enter WHO SOLD? — the airdrop betrayal market"
        >
          <span className="chooser-panel-tag">PREDICTION MARKET</span>
          <span className="chooser-logo">
            WHO<br />SOLD<span className="q">?</span>
          </span>
          <span className="chooser-desc">
            The Airdrop Betrayal Market. Track $ANSEM recipients and bet on who dumps
            before the window closes.
          </span>
          <span className="chooser-enter">
            ENTER <span className="arr">→</span>
          </span>
          <span className="chooser-key">1</span>
        </button>

        <div className="chooser-vs" aria-hidden="true">
          <span className="chooser-vs-line" />
          <span className="chooser-vs-badge">VS</span>
          <span className="chooser-vs-line" />
        </div>

        {/* WHO RUGGED? */}
        <button
          type="button"
          className="chooser-panel chooser-panel--rugged"
          onClick={() => go('rugged')}
          aria-label="Enter WHO RUGGED? — the social deduction game"
        >
          <span className="chooser-panel-tag">SOCIAL DEDUCTION</span>
          <span className="chooser-logo">
            WHO<br />RUGGED<span className="q">?</span>
          </span>
          <span className="chooser-desc">
            Five suspects. One drained the vault. Read the lies, make the accusation —
            roles sealed in a TEE, pot settles on-chain.
          </span>
          <span className="chooser-enter">
            ENTER <span className="arr">→</span>
          </span>
          <span className="chooser-key">2</span>
        </button>
      </div>

      <div className="chooser-foot">
        ◉ ONE UNIVERSE · TWO GAMES · $ANSEM ORACLE · 0G NETWORK ◉
      </div>
    </main>
  )
}
