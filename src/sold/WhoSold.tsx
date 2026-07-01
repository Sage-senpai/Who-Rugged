import { useCallback } from 'react'
import { useSold } from './useSold'
import { HolderLeaderboard } from './HolderLeaderboard'
import { PredictorRankings } from './PredictorRankings'
import { ResolutionBanner } from './ResolutionBanner'
import { useWallet } from '../wallet/WalletContext'
import './sold.css'

const STAKE = 50

export function WhoSold() {
  const { address } = useWallet()
  const { status, window, myPredictions, leaderboard, predict } = useSold(address ?? null)

  const handleVote = useCallback(
    (wallet: string, vote: 'yes' | 'no') => {
      void predict(wallet, vote, STAKE)
    },
    [predict],
  )

  if (status === 'unconfigured') {
    return (
      <main id="main" className="sold-shell">
        <p className="sold-unconfigured">WHO SOLD? is not yet configured — set VITE_SOLD_URL and deploy the Worker.</p>
      </main>
    )
  }

  if (status === 'loading' || !window) {
    return (
      <main id="main" className="sold-shell">
        <p className="sold-loading">LOADING WINDOW…</p>
      </main>
    )
  }

  return (
    <main id="main" className="sold-shell">
      <header className="sold-header">
        <p className="sold-eyebrow">$ANSEM // PREDICTION MARKET</p>
        <h1 className="sold-title">WHO SOLD?</h1>
        <p className="sold-subtitle">
          Predict which top $ANSEM holders dump before the window closes. Each correct call earns {STAKE * 2} $GG.
        </p>
      </header>

      <ResolutionBanner window={window} />

      <div className="sold-body">
        <HolderLeaderboard
          window={window}
          myPredictions={myPredictions}
          canPredict={!!address}
          onVote={handleVote}
        />
        <PredictorRankings scores={leaderboard} myAddress={address ?? null} />
      </div>
    </main>
  )
}
