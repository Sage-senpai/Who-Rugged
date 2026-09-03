/* Scene 2 — Scan Holders. Every field here is real: balances/ranks come from
   the live oracle poll already running in useMarkets(); "trend" is the real
   balanceAtSnapshot vs balanceNow delta (not a fabricated transaction feed —
   that lives in Scene 3's on-demand activity fetch). Value is shown only when
   a real price came back; otherwise the column reads "—", never $0. */
import { useMemo } from 'react'
import { arenaAvatarFor } from '../../lib/arenaAvatar'
import type { HolderMarket } from '../market/marketTypes'
import type { UseMarketsReturn } from '../market/useMarkets'
import type { ArenaDef } from './arenaTypes'

interface Props {
  arena: ArenaDef
  markets: UseMarketsReturn
  usdPrice: number | null
  onSelect: (h: HolderMarket) => void
}

function shortAddr(w: string): string {
  return `${w.slice(0, 4)}...${w.slice(-4)}`
}

function trendOf(h: HolderMarket): { label: string; cls: string } {
  if (h.balanceNow == null) return { label: 'TRACKING', cls: 'arena-action-hold' }
  if (h.balanceNow < h.balanceAtSnapshot) return { label: 'SELLING', cls: 'arena-action-sell' }
  if (h.balanceNow > h.balanceAtSnapshot) return { label: 'BUYING', cls: 'arena-action-buy' }
  return { label: 'HOLDING', cls: 'arena-action-hold' }
}

export function ScanHolders({ arena, markets, usdPrice, onSelect }: Props) {
  const ranked = useMemo(
    () => [...markets.markets].sort((a, b) => b.balanceAtSnapshot - a.balanceAtSnapshot),
    [markets.markets],
  )

  return (
    <div>
      <div className="arena-scene-head">
        <div>
          <p className="arena-eyebrow">Scene 2 · Scan Holders</p>
          <h1 className="arena-h1">
            {arena.name} arena <span className="arena-badge arena-badge-live" style={{ marginLeft: 8 }}>LIVE</span>
          </h1>
          <p className="arena-sub">Real tracked holders, ranked by position size. Updates every 30s.</p>
        </div>
      </div>

      {markets.loading ? (
        <p className="arena-loading">Loading real holder data…</p>
      ) : (
        <div className="arena-table-wrap">
          <table className="arena-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>HOLDER</th>
                <th>% OF SUPPLY</th>
                <th>VALUE (USD)</th>
                <th>TREND</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((h, i) => {
                const pct = arena.totalSupply ? (h.balanceAtSnapshot / arena.totalSupply) * 100 : null
                const value = usdPrice != null ? h.balanceAtSnapshot * usdPrice : null
                const trend = trendOf(h)
                return (
                  <tr key={h.wallet} onClick={() => onSelect(h)}>
                    <td className="arena-rank">#{String(i + 1).padStart(2, '0')}</td>
                    <td>
                      <div className="arena-holder-cell">
                        <img className="arena-avatar" src={arenaAvatarFor(h.avatarSeed)} alt="" loading="lazy" />
                        <div>
                          <div className="arena-holder-handle">@{h.handle}</div>
                          <div className="arena-holder-addr">{shortAddr(h.wallet)}</div>
                        </div>
                        {i < 3 && <span className="arena-tag" style={{ marginLeft: 8 }}>WHALE</span>}
                      </div>
                    </td>
                    <td>{pct != null ? `${pct.toFixed(2)}%` : '—'}</td>
                    <td>{value != null ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</td>
                    <td className={`arena-action ${trend.cls}`}>{trend.label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="arena-table-foot">
            {ranked.length} holders tracked · {markets.live ? 'shared live pools' : 'local preview'} · updates every 30s
          </div>
        </div>
      )}
    </div>
  )
}
