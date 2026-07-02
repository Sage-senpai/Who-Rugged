import { useCallback, useState } from 'react'
import { useSold } from './useSold'
import { HolderLeaderboard } from './HolderLeaderboard'
import { PredictorRankings } from './PredictorRankings'
import { ResolutionBanner } from './ResolutionBanner'
import { WalletRegister } from './WalletRegister'
import { BatchCard } from './BatchCard'
import { SoldNav } from './SoldNav'
import { useWallet } from '../wallet/WalletContext'
import './sold.css'

const STAKE = 50
type Tab = 'picks' | 'batch' | 'join'

export function WhoSold() {
  const { address } = useWallet()
  const { status, window, myPredictions, leaderboard, predict, register, predictBatch, activeBatch } = useSold(address ?? null)
  const [tab, setTab] = useState<Tab>('picks')
  const [batchVotes, setBatchVotes] = useState<Record<string, 'yes' | 'no'>>({})

  const handleVote = useCallback(
    (wallet: string, vote: 'yes' | 'no') => { void predict(wallet, vote, STAKE) },
    [predict],
  )

  const handleBatchVote = useCallback(
    (batchId: string, vote: 'yes' | 'no') => {
      setBatchVotes((prev) => ({ ...prev, [batchId]: vote }))
      void predictBatch(batchId, vote, STAKE)
    },
    [predictBatch],
  )

  if (status === 'unconfigured') {
    return (
      <main id="main" className="sold-shell">
        <p className="sold-loading">WHO SOLD? is not yet configured — set VITE_SOLD_URL and deploy the Worker.</p>
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
    <>
      <SoldNav />
      <main id="main" className="sold-shell">
      <header className="sold-header">
        <p className="sold-eyebrow">$ANSEM // PREDICTION MARKET</p>
        <h1 className="sold-title">THE MARKET</h1>
        <p className="sold-subtitle">
          Predict which $ANSEM holders dump before the window closes. Batch mode bets on the whole cohort.
        </p>
      </header>

      <ResolutionBanner window={window} />

      <nav className="sold-tabs">
        <button className={`sold-tab${tab === 'picks' ? ' active' : ''}`} onClick={() => setTab('picks')}>
          PICKS
        </button>
        <button className={`sold-tab${tab === 'batch' ? ' active' : ''}`} onClick={() => setTab('batch')}>
          BATCH
        </button>
        <button className={`sold-tab${tab === 'join' ? ' active' : ''}`} onClick={() => setTab('join')}>
          JOIN
        </button>
      </nav>

      {tab === 'picks' && (
        <div className="sold-body">
          <HolderLeaderboard
            window={window}
            myPredictions={myPredictions}
            canPredict={!!address}
            onVote={handleVote}
          />
          <PredictorRankings scores={leaderboard} myAddress={address ?? null} />
        </div>
      )}

      {tab === 'batch' && (
        <div className="sold-batch-list">
          {activeBatch ? (
            <BatchCard
              batch={activeBatch}
              myVote={batchVotes[activeBatch.batchId]}
              canPredict={!!address}
              onVote={handleBatchVote}
            />
          ) : (
            <div className="sold-batch-empty">
              <p>No active batch window right now.</p>
              <p className="sold-batch-empty-sub">
                Batch windows open after airdrop events — the community bets on what % of recipients will sell within 24h.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'join' && (
        <WalletRegister
          onRegister={register}
          connected={!!address}
        />
      )}
    </main>
    </>
  )
}
