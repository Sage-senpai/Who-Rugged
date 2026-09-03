import { Link, useLocation } from 'react-router-dom'
import { WalletMenu } from '../../wallet/WalletMenu'
import { useSolana } from '../../wallet/SolanaContext'
import { BET_TOKEN } from '../soldConfig'

interface Props {
  /** Real sum of the connected predictor's currently-staked positions, across
   *  all three market dimensions. Undefined while unknown/not connected. */
  inPlay?: number
}

export function ArenaTopbar({ inPlay }: Props) {
  const { pathname } = useLocation()
  const { address } = useSolana()

  return (
    <header className="arena-topbar">
      <Link to="/arena" className="arena-brand">
        <span className="arena-brand-mark">🪓</span>
        <span>
          <div className="arena-brand-name">WHO RUGGED?</div>
          <div className="arena-brand-tag">PREDICT REAL HOLDER ACTIONS</div>
        </span>
      </Link>

      <nav className="arena-nav">
        <Link to="/arena" className={pathname.startsWith('/arena') ? 'active' : ''}>ARENAS</Link>
        <span title="Coming soon">PORTFOLIO</span>
        <span title="Coming soon">LEADERBOARD</span>
        <span title="Coming soon">HISTORY</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {address && inPlay != null && (
          <span className="arena-chip">
            IN PLAY <b>{inPlay.toLocaleString()} {BET_TOKEN}</b>
          </span>
        )}
        <WalletMenu />
      </div>
    </header>
  )
}
