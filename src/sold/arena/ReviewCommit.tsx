import { arenaAvatarFor } from '../../lib/arenaAvatar'
import { BET_TOKEN } from '../soldConfig'
import { binaryById, emptyBinaryPools, quoteBinary } from '../market/binary'
import { magnitudeById, emptyMagnitudePools, quoteMagnitude } from '../market/magnitude'
import type { HolderMarket } from '../market/marketTypes'
import type { MarketKind } from './arenaTypes'
import type { Outcome } from './useArena'
import { useCountdown } from './useCountdown'

interface Props {
  holder: HolderMarket
  marketKind: MarketKind
  outcome: Outcome
  stake: number
  onBack: () => void
  onCommit: () => void
}

export function ReviewCommit({ holder, marketKind, outcome, stake, onBack, onCommit }: Props) {
  const countdown = useCountdown(holder.closesAt)

  const predictionLabel =
    outcome.kind === 'binary' ? binaryById(outcome.side).label : magnitudeById(outcome.band).label

  const quote =
    outcome.kind === 'binary'
      ? quoteBinary(holder.realBinaryPools ?? holder.binaryPools ?? emptyBinaryPools(), outcome.side, stake)
      : quoteMagnitude(holder.realMagnitudePools ?? holder.magnitudePools ?? emptyMagnitudePools(), outcome.band, stake)

  return (
    <div>
      <button className="arena-back" onClick={onBack}>← Back</button>
      <div className="arena-scene-head">
        <div>
          <p className="arena-eyebrow">Scene 6 · Review &amp; Commit</p>
          <h1 className="arena-h1">Review your bet before you lock it in</h1>
        </div>
        <div className="arena-timer">
          <span className="arena-timer-lab">PREDICTION WINDOW</span>
          <span className="arena-timer-val">{countdown}</span>
        </div>
      </div>

      <div className="arena-holder-strip">
        <img className="arena-avatar" src={arenaAvatarFor(holder.avatarSeed)} alt="" />
        <div>
          <div className="arena-holder-handle">@{holder.handle}</div>
          <div className="arena-holder-addr">{holder.wallet.slice(0, 8)}...{holder.wallet.slice(-6)}</div>
        </div>
      </div>

      <div className="arena-panel">
        <div className="arena-review-row">
          <span className="arena-review-lab">MARKET TYPE</span>
          <span className="arena-review-val">{marketKind === 'binary' ? 'Binary' : 'Rug by %'}</span>
        </div>
        <div className="arena-review-row">
          <span className="arena-review-lab">PREDICTION</span>
          <span className="arena-review-val">{predictionLabel}</span>
        </div>
        <div className="arena-review-row">
          <span className="arena-review-lab">STAKE</span>
          <span className="arena-review-val">{stake} {BET_TOKEN}</span>
        </div>
        <div className="arena-review-row">
          <span className="arena-review-lab">POTENTIAL RETURN</span>
          <span className="arena-review-val">
            {quote.payout.toFixed(0)} {BET_TOKEN} ({quote.multiple.toFixed(2)}×)
          </span>
        </div>
      </div>

      <div className="arena-warning">
        ⚠ Once you lock your bet, it cannot be changed. Your prediction stays hidden until resolution.
      </div>

      <button className="arena-btn arena-btn-primary arena-btn-lg arena-btn-block" onClick={onCommit}>
        🔒 Lock Bet
      </button>
    </div>
  )
}
