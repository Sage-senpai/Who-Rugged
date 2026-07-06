import { useState } from 'react'
import { BET_TOKEN } from '../soldConfig'
import { BUCKETS, impliedProbs, quote, poolTotal, type BucketId } from './buckets'
import type { HolderMarket, MarketPosition } from './marketTypes'

interface Props {
  market: HolderMarket
  myPosition: MarketPosition | undefined
  canBet: boolean
  onBet: (wallet: string, bucket: BucketId, stake: number) => void
}

const STAKE_PRESETS = [50, 100, 250]

function fmtBal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}
const pct = (p: number) => `${Math.round(p * 100)}%`

export function HolderMarketCard({ market, myPosition, canBet, onBet }: Props) {
  const [stake, setStake] = useState(STAKE_PRESETS[0])
  const probs = impliedProbs(market.pools)
  const total = poolTotal(market.pools)
  const closed = Date.now() >= market.closesAt || market.resolvedBucket != null

  return (
    <article className="mkt-card">
      {/* header */}
      <header className="mkt-head">
        <img
          className="mkt-avatar"
          src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(market.avatarSeed)}`}
          alt={market.handle}
          loading="lazy"
        />
        <div className="mkt-head-id">
          <span className="mkt-handle">@{market.handle}</span>
          <span className="mkt-sub">
            {fmtBal(market.balanceAtSnapshot)} $ANSEM · {market.bettors} bettors
          </span>
        </div>
        <div className="mkt-head-pool">
          <span className="mkt-pool-val">{fmtBal(total)}</span>
          <span className="mkt-pool-lab">{BET_TOKEN} pool</span>
        </div>
      </header>

      <div className="mkt-q">WILL THEY SELL — AND WHEN?</div>

      {/* outcome rows */}
      <div className="mkt-rows">
        {BUCKETS.map((b) => {
          const p = probs[b.id]
          const picked = myPosition?.bucket === b.id
          const q = quote(market.pools, b.id, stake)
          const won = market.resolvedBucket === b.id
          const lost = market.resolvedBucket != null && !won
          return (
            <button
              key={b.id}
              className={`mkt-row${picked ? ' picked' : ''}${won ? ' won' : ''}${lost ? ' lost' : ''}`}
              style={{ ['--c' as string]: b.color }}
              disabled={!canBet || closed}
              onClick={() => onBet(market.wallet, b.id, stake)}
              title={canBet ? `Bet ${stake} ${BET_TOKEN} on ${b.label}` : 'Connect a wallet to bet'}
            >
              <span className="mkt-row-fill" style={{ width: pct(p) }} />
              <span className="mkt-row-label">
                <span className="mkt-row-short">{b.short}</span>
                <span className="mkt-row-full">{b.label}</span>
              </span>
              <span className="mkt-row-stats">
                <span className="mkt-row-pct">{pct(p)}</span>
                <span className="mkt-row-mult">{q.multiple.toFixed(2)}×</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* footer: stake control + your position */}
      <footer className="mkt-foot">
        {myPosition ? (
          <div className="mkt-pos">
            <span className="mkt-pos-tag">YOUR PICK</span>
            <span className="mkt-pos-body">
              {BUCKETS.find((b) => b.id === myPosition.bucket)?.short} · {myPosition.stake} {BET_TOKEN}
              <span className="mkt-pos-payout">
                → {quote(market.pools, myPosition.bucket, 0).payout.toFixed(0)} {BET_TOKEN} if right
              </span>
            </span>
          </div>
        ) : (
          <div className="mkt-stake">
            <span className="mkt-stake-lab">STAKE</span>
            {STAKE_PRESETS.map((s) => (
              <button
                key={s}
                className={`mkt-stake-chip${stake === s ? ' on' : ''}`}
                onClick={() => setStake(s)}
                disabled={!canBet || closed}
              >
                {s}
              </button>
            ))}
            <span className="mkt-stake-hint">
              {canBet ? `tap an outcome to bet ${stake} ${BET_TOKEN}` : 'connect a wallet to bet'}
            </span>
          </div>
        )}
      </footer>
    </article>
  )
}
