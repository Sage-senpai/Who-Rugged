import type { TrackedHolder, Prediction } from './soldTypes'

interface Props {
  holder: TrackedHolder
  myPrediction: Prediction | undefined
  disabled: boolean
  onVote: (wallet: string, vote: 'yes' | 'no') => void
}

const STAKE = 50 // fixed $GG stake per prediction for now

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

export function PredictionCard({ holder, myPrediction, disabled, onVote }: Props) {
  const voted = myPrediction?.vote

  return (
    <article className={`sold-card${voted ? ` sold-card--${voted}` : ''}`}>
      <div className="sold-card-avatar">
        <img
          src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(holder.avatarSeed)}`}
          alt={holder.handle}
          loading="lazy"
        />
      </div>

      <div className="sold-card-info">
        <span className="sold-card-handle">@{holder.handle}</span>
        <span className="sold-card-balance">
          {holder.balanceNow !== null
            ? `${fmt(holder.balanceNow)} → sold: ${holder.balanceNow < holder.balanceAtSnapshot ? 'YES' : 'NO'}`
            : `${fmt(holder.balanceAtSnapshot)} $ANSEM`}
        </span>
      </div>

      <div className="sold-card-actions">
        <button
          className={`sold-btn sold-btn-yes${voted === 'yes' ? ' active' : ''}`}
          disabled={disabled}
          title={`Bet ${STAKE} $GG they sell`}
          onClick={() => onVote(holder.wallet, 'yes')}
        >
          SELLS
        </button>
        <button
          className={`sold-btn sold-btn-no${voted === 'no' ? ' active' : ''}`}
          disabled={disabled}
          title={`Bet ${STAKE} $GG they hold`}
          onClick={() => onVote(holder.wallet, 'no')}
        >
          HOLDS
        </button>
      </div>
    </article>
  )
}
