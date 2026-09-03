import { Link, useLocation } from 'react-router-dom'
import { useSettings } from '../settings/SettingsContext'
import { WalletMenu } from '../wallet/WalletMenu'
import './sold-nav.css'

interface Props {
  countdown?: string
  windowOpen?: boolean
}

export function SoldNav({ countdown, windowOpen }: Props) {
  const { settings, toggle } = useSettings()
  const { pathname } = useLocation()
  const inPlay = pathname === '/sold/play' || pathname.startsWith('/arena')

  return (
    <nav className="sold-nav">
      <div className="sold-nav-inner">
        <Link to="/arena" className="sold-nav-brand">
          <span className="sold-nav-brand-sold">WHO RUGGED?</span>
          <span className="sold-nav-brand-sep"> · </span>
          <span className="sold-nav-brand-rugged">ARENA</span>
        </Link>

        <div className="sold-nav-links">
          {windowOpen && countdown && (
            <span className="sold-nav-live">
              <span className="sold-nav-live-dot" />
              {countdown}
            </span>
          )}
          <Link
            to="/arena"
            className={`sold-nav-link sold-nav-link--sold${pathname.startsWith('/arena') ? ' active' : ''}`}
          >
            WHO RUGGED? · ARENA
          </Link>
          <Link
            to="/who-rugged"
            className="sold-nav-link sold-nav-link--rugged"
          >
            WHO RUGGED? · SUSPECTS
          </Link>
          {!inPlay && (
            <Link to="/arena" className="sold-nav-cta">
              ENTER ARENA →
            </Link>
          )}
        </div>

        <div className="sold-nav-right">
          <WalletMenu />
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
