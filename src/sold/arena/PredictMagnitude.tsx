import { useState } from 'react'
import { arenaAvatarFor } from '../../lib/arenaAvatar'
import { BET_TOKEN } from '../soldConfig'
import { MAGNITUDE_BANDS, emptyMagnitudePools, impliedMagnitudeProbs, quoteMagnitude, type MagnitudeBand } from '../market/magnitude'
import type { HolderMarket } from '../market/marketTypes'
import type { Outcome } from './useArena'
import { useCountdown } from './useCountdown'

interface Props {
  holder: HolderMarket
  live: boolean
  onBack: () => void
  onChoose: (outcome: Outcome, stake: number) => void
}

const STAKE_PRESETS = [10, 25, 50, 100]

export function PredictMagnitude({ holder, live, onBack, onChoose }: Props) {
  const [stake, setStake] = useState(STAKE_PRESETS[1])
  const pools = holder.magnitudePools ?? emptyMagnitudePools()
  const payoutPools = live ? holder.realMagnitudePools ?? pools : pools
  const probs = impliedMagnitudeProbs(pools)
  const countdown = useCountdown(holder.closesAt)

  return (
    <div>
      <button className="arena-back" onClick={onBack}>← Back to Holder</button>
      <div className="arena-scene-head">
        <div>
          <p className="arena-eyebrow">Scene 5B · Rug by % Prediction</p>
          <h1 className="arena-h1">How much of their position will they rug?</h1>
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

      <p className="arena-question">Protocol estimate distribution</p>
      {MAGNITUDE_BANDS.map((band) => {
        const p = probs[band.id]
        const q = quoteMagnitude(payoutPools, band.id, stake)
        return (
          <button
            key={band.id}
            className="arena-outcome-row"
            style={{ ['--c' as string]: band.color }}
            onClick={() => onChoose({ kind: 'magnitude', band: band.id as MagnitudeBand }, stake)}
          >
            <span className="arena-outcome-fill" style={{ width: `${Math.round(p * 100)}%` }} />
            <span className="arena-outcome-label">{band.short}</span>
            <span>
              <span className="arena-outcome-pct">{Math.round(p * 100)}%</span>{' '}
              <span className="arena-outcome-mult">{q.multiple.toFixed(2)}× if right</span>
            </span>
          </button>
        )
      })}

      <div className="arena-stake-row">
        <span className="arena-stake-lab">YOUR STAKE</span>
        {STAKE_PRESETS.map((s) => (
          <button key={s} className={`arena-stake-chip${stake === s ? ' on' : ''}`} onClick={() => setStake(s)}>
            {s} {BET_TOKEN}
          </button>
        ))}
      </div>
    </div>
  )
}
