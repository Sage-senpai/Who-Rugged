/* Scene 1 — Enter Arena. Exactly one arena is real; others render locked,
   never with fabricated live numbers (see arenas.ts). */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSolana } from '../../wallet/SolanaContext'
import { useMarkets } from '../market/useMarkets'
import { poolTotal } from '../market/buckets'
import { binaryPoolTotal } from '../market/binary'
import { magnitudePoolTotal } from '../market/magnitude'
import { BET_TOKEN } from '../soldConfig'
import { ARENAS } from './arenas'
import { ArenaTopbar } from './ArenaTopbar'
import './arena.css'

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function ArenaHome() {
  const navigate = useNavigate()
  const { address } = useSolana()
  const markets = useMarkets(address)

  const tvl = useMemo(() => {
    return markets.markets.reduce((sum, m) => {
      const time = poolTotal(m.realPools ?? m.pools)
      const bin = binaryPoolTotal(m.realBinaryPools ?? m.binaryPools ?? { yes: 0, no: 0 })
      const mag = magnitudePoolTotal(m.realMagnitudePools ?? m.magnitudePools ?? { b0_10: 0, b10_25: 0, b25_50: 0, b50_75: 0, b75_100: 0 })
      return sum + time + bin + mag
    }, 0)
  }, [markets.markets])

  const myInPlay = useMemo(() => {
    const all = [...markets.positions, ...markets.binaryPositions, ...markets.magnitudePositions]
    return all.reduce((s, p) => s + p.stake, 0)
  }, [markets.positions, markets.binaryPositions, markets.magnitudePositions])

  return (
    <div className="arena-shell">
      <ArenaTopbar inPlay={address ? myInPlay : undefined} />
      <div className="arena-wrap arena-page">
        <div className="arena-scene-head">
          <div>
            <p className="arena-eyebrow">Scene 1 · Enter Arena</p>
            <h1 className="arena-h1">Choose a token arena</h1>
            <p className="arena-sub">Pick a live arena to scan its top holders and predict what they do next.</p>
          </div>
        </div>

        <div className="arena-grid">
          {ARENAS.map((arena) => {
            const isLive = arena.status === 'live'
            const holderCount = isLive ? markets.markets.length : null
            return (
              <div key={arena.id} className={`arena-tile${isLive ? '' : ' arena-tile-locked'}`}>
                <div className="arena-tile-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="arena-tile-icon">{arena.ticker.replace('$', '').slice(0, 1)}</span>
                    <span>
                      <p className="arena-tile-name">{arena.name}</p>
                      <span className="arena-tile-ticker">{arena.ticker}</span>
                    </span>
                  </div>
                  <span className={`arena-badge ${isLive ? 'arena-badge-live' : 'arena-badge-locked'}`}>
                    {isLive ? 'LIVE' : 'LOCKED'}
                  </span>
                </div>

                <div className="arena-tile-stats">
                  <div>
                    <div className="arena-tile-stat-lab">HOLDERS TRACKED</div>
                    <div className="arena-tile-stat-val">{holderCount != null ? holderCount : '—'}</div>
                  </div>
                  <div>
                    <div className="arena-tile-stat-lab">TOTAL SUPPLY</div>
                    <div className="arena-tile-stat-val">{arena.totalSupply ? fmt(arena.totalSupply) : '—'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="arena-tile-stat-lab">ARENA TVL ({markets.live ? 'SHARED' : 'LOCAL PREVIEW'})</div>
                    <div className="arena-tile-stat-val">{isLive ? `${fmt(tvl)} ${BET_TOKEN}` : '—'}</div>
                  </div>
                </div>

                <button
                  className="arena-btn arena-btn-primary arena-btn-block"
                  disabled={!isLive}
                  onClick={() => navigate(`/arena/${arena.id}`)}
                >
                  {isLive ? 'Enter Arena' : 'Coming Soon'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
