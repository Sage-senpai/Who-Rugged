import { Link } from 'react-router-dom'
import { ScreenShell } from '../components/ScreenShell'
import { sfx } from '../lib/sfx'
import './menu.css'

const ITEMS = [
  { to: '/play', glyph: '▶', label: 'Play', desc: 'Open a fresh case. One thief, one shot.', primary: true },
  { to: '/how', glyph: '?', label: 'How to Play', desc: 'The rules, the bait economy, the controls.' },
  { to: '/stats', glyph: '★', label: 'Stats', desc: 'Your rank, record, and recent cases.' },
  { to: '/profile', glyph: '◇', label: 'Profile', desc: 'Link a wallet, claim your ID, get testnet 0G.' },
  { to: '/settings', glyph: '⚙', label: 'Settings', desc: 'Sound, scanlines, motion, progress.' },
]

export function Menu() {
  return (
    <ScreenShell>
      <div className="menu-hero">
        <h1 className="menu-logo">
          WHO RUGGED<span className="q">?</span>
        </h1>
        <div className="menu-tagline">PRECINCT 0G · SELECT AN OPTION</div>
      </div>

      <nav className="menu-list" aria-label="Main menu">
        {ITEMS.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className={`menu-item ${it.primary ? 'primary' : ''}`}
            onClick={() => sfx.play('select')}
          >
            <span className="mi-glyph" aria-hidden="true">
              {it.glyph}
            </span>
            <span className="mi-body">
              <span className="mi-label">{it.label}</span>
              <span className="mi-desc">{it.desc}</span>
            </span>
            <span className="mi-arrow" aria-hidden="true">
              ▸
            </span>
          </Link>
        ))}
      </nav>

      <p className="menu-foot">
        ROLES <b>SEALED ON 0G COMPUTE</b> · POT ON <b>0G CHAIN</b> · REPLAYS ON <b>0G STORAGE</b>
      </p>
    </ScreenShell>
  )
}
