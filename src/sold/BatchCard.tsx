import { useEffect, useState } from 'react'
import type { BatchWindow } from './soldTypes'

interface Props {
  batch: BatchWindow
  myVote?: 'yes' | 'no'
  canPredict: boolean
  onVote: (batchId: string, vote: 'yes' | 'no') => void
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : String(n)
}

function useCountdown(closesAt: number) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = closesAt - Date.now()
      if (diff <= 0) { setLabel('SETTLING'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
    }
    tick()
    const t = setInterval(tick, 1_000)
    return () => clearInterval(t)
  }, [closesAt])
  return label
}

export function BatchCard({ batch, myVote, canPredict, onVote }: Props) {
  const countdown = useCountdown(batch.closesAt)
  const { yesPct, yesPool, noPool } = batch.odds
  const yesPctDisplay = Math.round(yesPct * 100)
  const noPctDisplay = 100 - yesPctDisplay
  const thresholdPct = Math.round(batch.threshold * 100)
  const isOpen = batch.status === 'open'

  return (
    <div className="sold-batch-card">
      <div className="sold-batch-header">
        <div>
          <p className="sold-batch-eyebrow">BATCH PREDICTION</p>
          <h3 className="sold-batch-label">{batch.label}</h3>
        </div>
        <div className="sold-batch-meta">
          <span className="sold-batch-wallets">{batch.wallets.length} wallets</span>
          <span className="sold-batch-threshold">threshold &gt;{thresholdPct}%</span>
        </div>
      </div>

      {batch.status === 'settled' && batch.result ? (
        <div className={`sold-batch-result sold-batch-result--${batch.result.exceeded ? 'yes' : 'no'}`}>
          <span className="sold-batch-result-label">
            {batch.result.exceeded ? 'SOLD ABOVE THRESHOLD' : 'HELD BELOW THRESHOLD'}
          </span>
          <span className="sold-batch-result-stat">
            {batch.result.sellersCount} / {batch.result.total} sold ({Math.round(batch.result.pct * 100)}%)
          </span>
        </div>
      ) : (
        <div className="sold-batch-status">
          <span className={`sold-countdown-dot${batch.status === 'resolving' ? ' settling' : ''}`} />
          <span className="sold-batch-timer">{batch.status === 'resolving' ? 'RESOLVING…' : countdown}</span>
        </div>
      )}

      {/* parimutuel odds bar */}
      <div className="sold-batch-odds">
        <span className="sold-batch-odds-label sold-batch-odds-label--yes">
          SELLS {yesPctDisplay}% • {fmt(yesPool)} $GG
        </span>
        <div className="sold-batch-odds-bar">
          <div className="sold-batch-odds-fill sold-batch-odds-fill--yes" style={{ width: `${yesPctDisplay}%` }} />
          <div className="sold-batch-odds-fill sold-batch-odds-fill--no" style={{ width: `${noPctDisplay}%` }} />
        </div>
        <span className="sold-batch-odds-label sold-batch-odds-label--no">
          HOLDS {noPctDisplay}% • {fmt(noPool)} $GG
        </span>
      </div>

      <div className="sold-card-actions">
        <button
          className={`sold-btn sold-btn-yes${myVote === 'yes' ? ' active' : ''}`}
          disabled={!canPredict || !isOpen}
          onClick={() => onVote(batch.batchId, 'yes')}
        >
          SELLS
        </button>
        <button
          className={`sold-btn sold-btn-no${myVote === 'no' ? ' active' : ''}`}
          disabled={!canPredict || !isOpen}
          onClick={() => onVote(batch.batchId, 'no')}
        >
          HOLDS
        </button>
      </div>

      {myVote && (
        <p className="sold-batch-my-vote">
          You bet {myVote === 'yes' ? 'SELLS' : 'HOLDS'} — payout is parimutuel (your share of the losing pool).
        </p>
      )}
    </div>
  )
}
