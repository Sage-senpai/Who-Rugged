import { Link, useLocation } from 'react-router-dom'
import { useSettings } from '../settings/SettingsContext'
import { ConnectButton } from '../wallet/ConnectButton'
import './sold-nav.css'

interface Props {
  countdown?: string
  windowOpen?: boolean
}

export function SoldNav({ countdown, windowOpen }: Props) {
  const { settings, toggle } = useSettings()
  const { pathname } = useLocation()
  const inPlay = pathname === '/sold/play'

  return (
    <nav className="sold-nav">
      <div className="sold-nav-inner">
        <Link to="/" className="sold-nav-brand">
          <span className="sold-nav-brand-sold">WHO SOLD?</span>
          <span className="sold-nav-brand-sep"> × </span>
          <span className="sold-nav-brand-rugged">WHO RUGGED?</span>
        </Link>

        <div className="sold-nav-links">
          {windowOpen && countdown && (
            <span className="sold-nav-live">
              <span className="sold-nav-live-dot" />
              {countdown}
            </span>
          )}
          <Link
            to="/"
            className={`sold-nav-link sold-nav-link--sold${pathname === '/' || pathname === '/sold' ? ' active' : ''}`}
          >
            WHO SOLD?
          </Link>
          <Link
            to="/who-rugged"
            className="sold-nav-link sold-nav-link--rugged"
          >
            WHO RUGGED?
          </Link>
          {!inPlay && (
            <Link to="/sold/play" className="sold-nav-cta">
              ENTER MARKET →
            </Link>
          )}
        </div>

        <div className="sold-nav-right">
          <ConnectButton />
          <button
            className="sold-nav-sound"
            onClick={() => toggle('music')}
            title={settings.music ? 'Mute music' : 'Unmute music'}
          >
            {settings.music ? '♪' : '♪̶'}
          </button>
        </div>
      </div>
    </nav>
  )
}
