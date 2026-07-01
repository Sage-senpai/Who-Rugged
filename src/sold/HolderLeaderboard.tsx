import type { PredictionWindow, Prediction } from './soldTypes'
import { PredictionCard } from './PredictionCard'

interface Props {
  window: PredictionWindow
  myPredictions: Prediction[]
  canPredict: boolean
  onVote: (wallet: string, vote: 'yes' | 'no') => void
}

export function HolderLeaderboard({ window, myPredictions, canPredict, onVote }: Props) {
  const sorted = [...window.holders].sort((a, b) => b.balanceAtSnapshot - a.balanceAtSnapshot)

  return (
    <div className="sold-leaderboard-holders" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map((holder) => (
        <PredictionCard
          key={holder.wallet}
          holder={holder}
          myPrediction={myPredictions.find((p) => p.wallet === holder.wallet)}
          disabled={!canPredict || window.status !== 'open'}
          onVote={onVote}
        />
      ))}
    </div>
  )
}
