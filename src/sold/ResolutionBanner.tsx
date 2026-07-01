import type { PredictionWindow } from './soldTypes'

interface Props {
  window: PredictionWindow
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function ResolutionBanner({ window }: Props) {
  const now = Date.now()
  const remaining = window.closesAt - now

  if (window.status === 'settled') {
    const sold = window.holders.filter(
      (h) => h.balanceNow !== null && h.balanceNow < h.balanceAtSnapshot,
    )
    return (
      <div className="sold-resolution">
        <p className="sold-resolution-title">Window Settled</p>
        <p className="sold-resolution-body">
          {sold.length === 0
            ? 'Nobody sold. Diamond hands across the board.'
            : `${sold.map((h) => `@${h.handle}`).join(', ')} sold before close.`}
        </p>
      </div>
    )
  }

  if (window.status === 'resolving') {
    return (
      <div className="sold-resolution">
        <p className="sold-resolution-title">Resolving…</p>
        <p className="sold-resolution-body">Checking on-chain balances. Results in a moment.</p>
      </div>
    )
  }

  return (
    <div className="sold-countdown">
      <span className="sold-countdown-dot" />
      <span>Window closes in {formatTime(remaining)}</span>
    </div>
  )
}
