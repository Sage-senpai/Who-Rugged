/* Scene 1 — Enter Arena. Each potentially-live arena needs its own
   useMarkets() call — one shared call would leak one arena's numbers onto
   another's tile. Includes the still-locked BSC arenas too, so flipping
   them live in arenas.ts later needs no further code change here. Rules of
   hooks forbid calling a hook in a loop, so this is explicit rather than
   generic — fine for a list this size. */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { UseMarketsReturn } from '../market/useMarkets'
import { useAllArenaMarkets } from './useAllArenaMarkets'
import { EMPTY_COMMUNITY, fetchCommunity, type CommunityList } from './communityClient'
import { ListCoinForm } from '../../floor/ListCoin'
import { pct } from '../dmp/dmp'
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

function tvlOf(markets: UseMarketsReturn): number {
  return markets.markets.reduce((sum, m) => {
    const time = poolTotal(m.realPools ?? m.pools)
    const bin = binaryPoolTotal(m.realBinaryPools ?? m.binaryPools ?? { yes: 0, no: 0 })
    const mag = magnitudePoolTotal(m.realMagnitudePools ?? m.magnitudePools ?? { b0_10: 0, b10_25: 0, b25_50: 0, b50_75: 0, b75_100: 0 })
    return sum + time + bin + mag
  }, 0)
}

/** The "i" icon: a backend wallet-history signal, cached and refreshed on a
    slow cycle (server/src/sold/walletAnalytics.ts) — not computed live on
    every page view. Chain support is read off the mint's own address format
    (0x = BSC, same test already used for explorer links) rather than a
    hardcoded arena list, so it stays correct if more Solana arenas get added. */
function AnalyticsInfo({ arena, markets, open, onToggle }: {
  arena: { mint: string | null }
  markets: UseMarketsReturn | undefined
  open: boolean
  onToggle: () => void
}) {
  const chainSupported = arena.mint != null && !arena.mint.startsWith('0x')
  const a = markets?.analytics

  return (
    <div className="arena-info">
      <button
        className="arena-info-btn"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        aria-label="Wallet-history analytics for this arena"
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        <div className="arena-info-pop" onClick={(e) => e.stopPropagation()} role="status">
          <p className="arena-info-title">MODEL SIGNAL</p>
          {!chainSupported ? (
            <p>Wallet-history analytics aren't wired up for this chain yet — no activity feed to read from.</p>
          ) : !a ? (
            <p>Still gathering signal for this arena. Check back shortly.</p>
          ) : a.topPYes == null ? (
            <p>Not enough wallet history yet for any tracked holder ({a.total} tracked).</p>
          ) : (
            <>
              <p>
                <b>@{a.topHandle}</b> is the model's highest-risk holder: up to{' '}
                <b>{pct(a.topPYes)}</b> likely to sell this window, from wallet history alone.
              </p>
              <p className="arena-info-fine">
                {a.scored} of {a.total} tracked holders scored. This is the model's read, not the market's — open a
                holder to see both, plus your own.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function ArenaHome() {
  const navigate = useNavigate()
  const { address, byArena, myInPlay } = useAllArenaMarkets()
  const [openInfo, setOpenInfo] = useState<string | null>(null)
  const [community, setCommunity] = useState<CommunityList>(EMPTY_COMMUNITY)
  useEffect(() => {
    let cancelled = false
    void fetchCommunity().then((l) => { if (!cancelled) setCommunity(l) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="arena-shell">
      <ArenaTopbar inPlay={address ? myInPlay : undefined} />
      <div className="arena-wrap arena-page" onClick={() => setOpenInfo(null)}>
        <div className="arena-scene-head">
          <div>
            <p className="arena-eyebrow">Scene 1 · Enter Arena</p>
            <h1 className="arena-h1">Choose a token arena</h1>
            <p className="arena-sub">Pick a live arena to scan its top holders and predict what they do next.</p>
          </div>
          <Link to="/arena" className="arena-btn arena-btn-ghost">Walk the 3D floor</Link>
        </div>

        <div className="arena-grid">
          {ARENAS.map((arena) => {
            const isLive = arena.status === 'live'
            const markets = byArena[arena.id]
            const holderCount = isLive && markets ? markets.markets.length : null
            const tvl = isLive && markets ? tvlOf(markets) : 0
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isLive && (
                      <AnalyticsInfo
                        arena={arena}
                        markets={markets}
                        open={openInfo === arena.id}
                        onToggle={() => setOpenInfo((cur) => (cur === arena.id ? null : arena.id))}
                      />
                    )}
                    <span className={`arena-badge ${isLive ? 'arena-badge-live' : 'arena-badge-locked'}`}>
                      {isLive ? 'LIVE' : 'LOCKED'}
                    </span>
                  </div>
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
                    <div className="arena-tile-stat-lab">ARENA TVL ({markets?.live ? 'SHARED' : 'LOCAL PREVIEW'})</div>
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

        <div className="arena-scene-head" style={{ marginTop: 36 }}>
          <div>
            <p className="arena-eyebrow">Community</p>
            <h2 className="arena-h1">Community tables</h2>
            <p className="arena-sub">Tables players opened for their own Solana coins. Paste a token address to open one.</p>
          </div>
        </div>
        {community.tables.length > 0 && (
          <div className="arena-grid" style={{ marginBottom: 20 }}>
            {community.tables.map((t) => (
              <div key={t.id} className="arena-tile">
                <div className="arena-tile-head">
                  <span>
                    <p className="arena-tile-name">{t.name}</p>
                    <span className="arena-tile-ticker">${t.symbol}</span>
                  </span>
                  <span className="arena-badge arena-badge-neutral">COMMUNITY</span>
                </div>
                <button className="arena-btn arena-btn-primary arena-btn-block" onClick={() => navigate(`/arena/${t.id}`)}>Enter Arena</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ maxWidth: 520 }}>
          <ListCoinForm
            open={community.tables.length}
            cap={community.cap}
            ttlDays={community.ttlDays}
            onListed={(t) => navigate(`/arena/${t.id}`)}
          />
        </div>
      </div>
    </div>
  )
}
