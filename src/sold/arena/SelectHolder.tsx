/* Scene 3 — Select Holder. Behavior stats + activity feed are real, on-demand
   fetches (server/src/sold/SolanaOracle.ts fetchRecentActivity) — best-effort
   classification from balance deltas, never fabricated rows. Three honest
   states: not configured, configured-but-empty, and real data. */
import { useEffect, useState } from 'react'
import { arenaAvatarFor } from '../../lib/arenaAvatar'
import { soldConfigured, getActivity, type ActivityEvent } from '../soldClient'
import type { HolderMarket } from '../market/marketTypes'

interface Props {
  holder: HolderMarket
  usdPrice: number | null
  totalSupply: number | null
  onBack: () => void
  onPredict: () => void
}

function fmtBal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

function relTime(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function SelectHolder({ holder, usdPrice, totalSupply, onBack, onPredict }: Props) {
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null)

  useEffect(() => {
    setActivity(null)
    if (!soldConfigured) return
    let active = true
    void getActivity(holder.wallet, 10).then((rows) => { if (active) setActivity(rows) })
    return () => { active = false }
  }, [holder.wallet])

  const pct = totalSupply ? (holder.balanceAtSnapshot / totalSupply) * 100 : null
  const value = usdPrice != null ? holder.balanceAtSnapshot * usdPrice : null
  const buys = activity?.filter((e) => e.kind === 'buy').length ?? null
  const sells = activity?.filter((e) => e.kind === 'sell').length ?? null
  const transfers = activity?.filter((e) => e.kind === 'unknown').length ?? null
  const earliest = activity?.length ? activity[activity.length - 1].at : null

  return (
    <div>
      <button className="arena-back" onClick={onBack}>← Back to Arena</button>
      <p className="arena-eyebrow">Scene 3 · Select Holder</p>

      <div className="arena-detail-grid">
        <div className="arena-detail-card">
          <img className="arena-avatar arena-avatar-lg" src={arenaAvatarFor(holder.avatarSeed)} alt="" />
          <div className="arena-holder-handle" style={{ fontSize: 15 }}>@{holder.handle}</div>
          <div className="arena-holder-addr">{holder.wallet}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div>
              <div className="arena-tile-stat-lab">% SUPPLY</div>
              <div className="arena-tile-stat-val">{pct != null ? `${pct.toFixed(2)}%` : '—'}</div>
            </div>
            <div>
              <div className="arena-tile-stat-lab">VALUE</div>
              <div className="arena-tile-stat-val">{value != null ? `$${Math.round(value).toLocaleString()}` : '—'}</div>
            </div>
          </div>
          <a
            className="arena-btn arena-btn-ghost arena-btn-block"
            href={`https://solscan.io/account/${holder.wallet}`}
            target="_blank" rel="noreferrer"
          >
            View on Explorer ↗
          </a>
        </div>

        <div>
          <div className="arena-panel">
            <p className="arena-panel-title">BEHAVIOR OVERVIEW</p>
            <div className="arena-stat-grid">
              <div>
                <div className="arena-stat-lab">OBSERVED SINCE</div>
                <div className="arena-stat-val" style={{ fontSize: 13 }}>{earliest ? relTime(earliest) : '—'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">BUYS</div>
                <div className="arena-stat-val">{buys ?? '—'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">SELLS</div>
                <div className="arena-stat-val">{sells ?? '—'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">TRANSFERS</div>
                <div className="arena-stat-val">{transfers ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="arena-panel">
            <p className="arena-panel-title">RECENT ACTIVITY (BEST-EFFORT, FROM ON-CHAIN BALANCE DELTAS)</p>
            {!soldConfigured ? (
              <p className="arena-empty-note">Connect the live oracle to see on-chain activity.</p>
            ) : activity == null ? (
              <p className="arena-empty-note">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="arena-empty-note">No on-chain activity data yet.</p>
            ) : (
              activity.map((e) => (
                <div className="arena-activity-row" key={e.signature}>
                  <span className="arena-activity-time">{relTime(e.at)}</span>
                  <span className={`arena-activity-kind arena-action-${e.kind === 'buy' ? 'buy' : e.kind === 'sell' ? 'sell' : 'hold'}`}>
                    {e.kind.toUpperCase()}
                  </span>
                  <span className="arena-activity-amt">{fmtBal(e.amount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="arena-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--ar-text-dim)' }}>This holder is being observed.</span>
            <button className="arena-btn arena-btn-primary arena-btn-lg" onClick={onPredict}>
              Predict Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
