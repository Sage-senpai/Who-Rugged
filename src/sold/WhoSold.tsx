import { useCallback, useState } from 'react'
import { useSold } from './useSold'
import { PredictorRankings } from './PredictorRankings'
import { ResolutionBanner } from './ResolutionBanner'
import { WalletRegister } from './WalletRegister'
import { BatchCard } from './BatchCard'
import { SoldNav } from './SoldNav'
import { useSolana } from '../wallet/SolanaContext'
import { useMarkets } from './market/useMarkets'
import { HolderMarketCard } from './market/HolderMarketCard'
import type { BucketId } from './market/buckets'
import './sold.css'
import './market/market.css'

type Tab = 'picks' | 'batch' | 'join'

export function WhoSold() {
  const { address } = useSolana()
  const { window, leaderboard, register, predictBatch, activeBatch } = useSold(address ?? null)
  const markets = useMarkets(address ?? null)
  const [tab, setTab] = useState<Tab>('picks')
  const [batchVotes, setBatchVotes] = useState<Record<string, 'yes' | 'no'>>({})

  const handleMarketBet = useCallback(
    (wallet: string, bucket: BucketId, stake: number) => { markets.place(wallet, bucket, stake) },
    [markets],
  )

  const handleBatchVote = useCallback(
    (batchId: string, vote: 'yes' | 'no') => {
      setBatchVotes((prev) => ({ ...prev, [batchId]: vote }))
      void predictBatch(batchId, vote, markets.defaultStake)
    },
    [predictBatch, markets.defaultStake],
  )

  return (
    <>
      <SoldNav />
      <main id="main" className="sold-shell">
      <header className="sold-header">
        <p className="sold-eyebrow">$ANSEM // PREDICTION MARKET</p>
        <h1 className="sold-title">THE MARKET</h1>
        <p className="sold-subtitle">
          Real wallets. Live oracle. Parimutuel odds on <b>when</b> each holder dumps.
        </p>
      </header>

      {window && <ResolutionBanner window={window} />}

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
        <div className="mkt-picks">
          <div className="mkt-legend">
            <span className="mkt-legend-lab">ODDS</span>
            <span className="mkt-legend-note">
              odds = the crowd's read · payouts settle from real stakes only, no house edge ·
              a market locks the instant that holder is caught selling
            </span>
            <span className={`mkt-legend-mode ${markets.live ? 'live' : 'local'}`}>
              {markets.live ? '● SHARED POOLS' : '○ LOCAL PREVIEW'}
            </span>
          </div>
          <div className="mkt-grid">
            {markets.markets.map((m) => (
              <HolderMarketCard
                key={m.wallet}
                market={m}
                myPosition={markets.positions.find((p) => p.wallet === m.wallet)}
                canBet={!!address}
                live={markets.live}
                onBet={handleMarketBet}
              />
            ))}
          </div>
          <div className="mkt-rankings">
            <PredictorRankings scores={leaderboard} myAddress={address ?? null} />
          </div>
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
