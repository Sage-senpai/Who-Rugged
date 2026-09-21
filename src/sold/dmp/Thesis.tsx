/* The Read: study the wallet, set a probability, then hand off to the existing
   Review & Commit. It sits in front of the binary engine and changes nothing
   in it: this screen only decides (side, stake) and remembers the probability.

   Order follows the handoff doc's hierarchy: the question, the clock, the
   wallet evidence, then the player's own read, then the market, then the
   model. The model (and the final odds derived from it) stay sealed until the
   player has set a probability, so it can't anchor them. */
import { useEffect, useMemo, useState } from 'react'
import { arenaAvatarFor } from '../../lib/arenaAvatar'
import { BET_TOKEN } from '../soldConfig'
import { getActivity, soldConfigured, type ActivityEvent } from '../soldClient'
import { emptyBinaryPools } from '../market/binary'
import type { HolderMarket } from '../market/marketTypes'
import type { ArenaDef } from '../arena/arenaTypes'
import { useCountdown } from '../arena/useCountdown'
import {
  QUALIFYING_SELL_PCT, STAKE_PRESETS, blendedOdds, marketProbability, payoutMultiple, pct,
  sideForProbability, type ReadDraft,
} from './dmp'
import { BASE_RATE, buildWalletModel, confidenceLabel } from './walletModel'
import './dmp.css'

interface Props {
  holder: HolderMarket
  arena: ArenaDef
  usdPrice: number | null
  onBack: () => void
  onClassic: () => void
  onContinue: (draft: ReadDraft) => void
}

function relTime(ms: number): string {
  const m = Math.floor((Date.now() - ms) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function fmtAmount(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n >= 10 ? `${Math.round(n)}` : n.toFixed(2)
}

export function Thesis({ holder, arena, usdPrice, onBack, onClassic, onContinue }: Props) {
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null)
  const [prob, setProb] = useState(50)
  const [touched, setTouched] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [initialProb, setInitialProb] = useState<number | null>(null)
  const [stake, setStake] = useState(STAKE_PRESETS[1])
  const countdown = useCountdown(holder.closesAt)
  const timeUp = countdown === 'CLOSED'
  // The server locks a holder the moment a qualifying sell is sampled, so a
  // market can end before its clock does. Mirrors the engine's holder-locked rule.
  const decided = holder.resolvedBucket != null
  const closed = timeUp || decided

  useEffect(() => {
    setActivity(null)
    if (!soldConfigured) { setActivity([]); return }
    let active = true
    void getActivity(holder.wallet, 20, arena.id).then((rows) => { if (active) setActivity(rows) })
    return () => { active = false }
  }, [holder.wallet, arena.id])

  const model = useMemo(
    () => buildWalletModel(holder, activity, arena.totalSupply),
    [holder, activity, arena.totalSupply],
  )

  const pools = holder.realBinaryPools ?? emptyBinaryPools()
  const poolTotal = pools.yes + pools.no
  const marketP = marketProbability(pools)
  const blend = blendedOdds(model.pYes, model.confidence, pools)
  const side = sideForProbability(prob)
  const multiple = side ? payoutMultiple(pools, side, stake) : null

  const buys = activity?.filter((e) => e.kind === 'buy').length
  const sells = activity?.filter((e) => e.kind === 'sell').length
  const transfers = activity?.filter((e) => e.kind === 'unknown').length
  const earliest = activity?.length ? Math.min(...activity.map((e) => e.at)) : null
  const supplyPct = arena.totalSupply ? (holder.balanceAtSnapshot / arena.totalSupply) * 100 : null
  const value = usdPrice != null ? holder.balanceAtSnapshot * usdPrice : null
  const drift = holder.balanceNow != null && holder.balanceAtSnapshot > 0
    ? (holder.balanceNow - holder.balanceAtSnapshot) / holder.balanceAtSnapshot
    : null

  const canContinue = touched && side !== null && !closed
  const hint = decided
    ? 'This market is already decided. Pick another wallet.'
    : timeUp ? 'This window has closed. Pick another wallet.'
    : !touched ? 'Move the slider to set your read.'
    : side === null ? 'Pick a side: move off 50%.'
    : null

  const reveal = () => { setInitialProb(prob); setRevealed(true) }
  const submit = () => {
    if (!canContinue) return
    onContinue({
      probYes: prob / 100,
      initialProbYes: (initialProb ?? prob) / 100,
      stake,
      modelP: model.pYes,
      modelConfidence: model.confidence,
      modelSeen: revealed,
      marketP,
      blendedP: blend.pFinal,
    })
  }

  const explorer = holder.wallet.startsWith('0x')
    ? `https://bscscan.com/address/${holder.wallet}`
    : `https://solscan.io/account/${holder.wallet}`

  return (
    <div className="dmp">
      <button className="arena-back" onClick={onBack}>← Back to Holder</button>

      <div className="dmp-head">
        <div>
          <p className="arena-eyebrow">The Read · Study the wallet</p>
          <h1 className="dmp-q">
            Will @{holder.handle} sell {QUALIFYING_SELL_PCT}% or more of their {arena.ticker} before the window closes?
          </h1>
          <p className="arena-sub">Read the wallet, set your probability, then check it against the model and the crowd.</p>
        </div>
        <div className="arena-timer">
          <span className="arena-timer-lab">TIME LEFT</span>
          <span className={`arena-timer-val${closed ? ' arena-pnl-down' : ''}`}>{decided ? 'DECIDED' : countdown}</span>
        </div>
      </div>

      {decided && (
        <div className="arena-warning arena-warning-error" role="status">
          This wallet has already sold {holder.dropRatio != null ? `${(holder.dropRatio * 100).toFixed(1)}% of its balance` : 'past the threshold'} this
          window, so the market resolved YES early and staking is closed. You can still read the wallet below.
        </div>
      )}

      <div className="dmp-grid">
        <div className="dmp-col">
          <section className="arena-panel" aria-label="Wallet">
            <p className="arena-panel-title">WALLET</p>
            <div className="dmp-profile">
              <img className="arena-avatar arena-avatar-lg" src={arenaAvatarFor(holder.avatarSeed)} alt="" />
              <div className="dmp-profile-id">
                <div className="arena-holder-handle" style={{ fontSize: 15 }}>@{holder.handle}</div>
                <div className="arena-holder-addr dmp-addr">{holder.wallet}</div>
                <a className="dmp-link" href={explorer} target="_blank" rel="noreferrer">View on explorer ↗</a>
              </div>
            </div>
            <div className="dmp-stats">
              <div>
                <div className="arena-stat-lab">% OF SUPPLY</div>
                <div className="dmp-stat-val">{supplyPct != null ? `${supplyPct.toFixed(2)}%` : 'n/a'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">POSITION VALUE</div>
                <div className="dmp-stat-val">{value != null ? `$${Math.round(value).toLocaleString()}` : 'n/a'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">THIS WINDOW</div>
                <div className={`dmp-stat-val ${drift != null && drift < 0 ? 'arena-pnl-down' : drift != null && drift > 0 ? 'arena-pnl-up' : ''}`}>
                  {drift != null ? `${drift >= 0 ? '+' : ''}${(drift * 100).toFixed(1)}%` : 'Tracking'}
                </div>
              </div>
            </div>
          </section>

          <section className="arena-panel" aria-label="Behavior">
            <p className="arena-panel-title">BEHAVIOR</p>
            <div className="dmp-stats dmp-stats-4">
              <div>
                <div className="arena-stat-lab">OBSERVED</div>
                <div className="dmp-stat-val dmp-stat-sm">{earliest ? relTime(earliest) : 'n/a'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">BUYS</div>
                <div className="dmp-stat-val">{buys ?? 'n/a'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">SELLS</div>
                <div className="dmp-stat-val">{sells ?? 'n/a'}</div>
              </div>
              <div>
                <div className="arena-stat-lab">TRANSFERS</div>
                <div className="dmp-stat-val">{transfers ?? 'n/a'}</div>
              </div>
            </div>
          </section>

          <section className="arena-panel" aria-label="Wallet DNA">
            <p className="arena-panel-title">WALLET DNA</p>
            {activity == null ? (
              <p className="arena-empty-note">Reading the wallet…</p>
            ) : (
              <dl className="dmp-dna">
                <div><dt>Trader type</dt><dd>{model.dna.traderType}</dd></div>
                <div><dt>Sell frequency</dt><dd>{model.dna.sellFrequency}</dd></div>
                <div><dt>Partial exits</dt><dd>{model.dna.partialExits}</dd></div>
                <div><dt>Current position</dt><dd>{model.dna.position}</dd></div>
                <div><dt>Average hold</dt><dd className="dmp-dim">{model.dna.averageHold}</dd></div>
                <div><dt>Typical exit trigger</dt><dd className="dmp-dim">{model.dna.exitTrigger}</dd></div>
              </dl>
            )}
          </section>

          <section className="arena-panel" aria-label="Recent transfers">
            <p className="arena-panel-title">RECENT TRANSFERS</p>
            {!soldConfigured ? (
              <p className="arena-empty-note">Live oracle not connected.</p>
            ) : activity == null ? (
              <p className="arena-empty-note">Reading the wallet…</p>
            ) : activity.length === 0 ? (
              <p className="arena-empty-note">
                No transfer history available for this wallet yet. The model will say so rather than guess.
              </p>
            ) : (
              activity.slice(0, 6).map((e) => (
                <div className="arena-activity-row" key={e.signature}>
                  <span className="arena-activity-time">{relTime(e.at)}</span>
                  <span className={`arena-activity-kind arena-action-${e.kind === 'buy' ? 'buy' : e.kind === 'sell' ? 'sell' : 'hold'}`}>
                    {e.kind.toUpperCase()}
                  </span>
                  <span className="arena-activity-amt">{fmtAmount(e.amount)}</span>
                </div>
              ))
            )}
            <p className="dmp-fine">
              Inferred from token balance changes. It can't tell a market sell from a plain transfer.
            </p>
          </section>
        </div>

        <div className="dmp-col">
          <section className="arena-panel" aria-label="Your read">
            <p className="arena-panel-title">YOUR READ</p>
            <p className="dmp-ask">How likely is it that this wallet sells?</p>

            <div className="dmp-dial-read" aria-live="polite">
              <span className={`dmp-dial-num${touched ? '' : ' dmp-unset'}`}>{prob}%</span>
              <span className={`dmp-dial-side ${side === 'yes' ? 'is-sell' : side === 'no' ? 'is-hold' : ''}`}>
                {side === 'yes' ? 'SELL' : side === 'no' ? 'HOLD' : touched ? 'EVEN' : 'NOT SET'}
              </span>
            </div>
            <input
              className="dmp-range"
              type="range" min={1} max={99} step={1} value={prob}
              style={{ ['--p' as string]: `${prob}%` }}
              onChange={(e) => { setProb(Number(e.target.value)); setTouched(true) }}
              aria-label="Probability that the wallet sells"
              aria-valuetext={`${prob} percent sell, ${100 - prob} percent hold`}
              disabled={closed}
            />
            <div className="dmp-split" aria-hidden="true">
              <span className="dmp-split-sell" style={{ width: `${prob}%` }}>SELL {prob}%</span>
              <span className="dmp-split-hold" style={{ width: `${100 - prob}%` }}>HOLD {100 - prob}%</span>
            </div>

            <div className="arena-stake-row">
              <span className="arena-stake-lab">STAKE</span>
              {STAKE_PRESETS.map((s) => (
                <button
                  key={s}
                  className={`arena-stake-chip${stake === s ? ' on' : ''}`}
                  onClick={() => setStake(s)}
                  aria-pressed={stake === s}
                >
                  {s} {BET_TOKEN}
                </button>
              ))}
            </div>
            <p className="dmp-fine">Your probability is your prediction. Your stake is your exposure. They are separate.</p>
          </section>

          <section className="arena-panel" aria-label="Signals">
            <p className="arena-panel-title">SIGNALS</p>
            <div className="dmp-triad">
              <div className="dmp-sig" style={{ ['--c' as string]: 'var(--ar-accent)' }}>
                <span className="dmp-sig-lab"><i className="dmp-dot" />YOU</span>
                <span className="dmp-sig-val">{touched ? `${prob}%` : 'n/a'}</span>
                <span className="dmp-sig-sub">{touched ? 'sell' : 'not set'}</span>
              </div>
              <div className="dmp-sig" style={{ ['--c' as string]: 'var(--dmp-market)' }}>
                <span className="dmp-sig-lab"><i className="dmp-dot" />MARKET</span>
                <span className="dmp-sig-val">{marketP != null ? pct(marketP) : 'n/a'}</span>
                <span className="dmp-sig-sub">{marketP != null ? 'sell, real stakes' : 'no stakes yet'}</span>
              </div>
              <div className={`dmp-sig${revealed ? '' : ' dmp-sig-sealed'}`} style={{ ['--c' as string]: 'var(--dmp-model)' }}>
                <span className="dmp-sig-lab"><i className="dmp-dot" />MODEL</span>
                <span className="dmp-sig-val">{revealed ? pct(model.pYes) : 'Sealed'}</span>
                <span className="dmp-sig-sub">{revealed ? `${confidenceLabel(model.confidence).toLowerCase()} confidence` : 'set your read first'}</span>
              </div>
            </div>

            {!revealed ? (
              <div className="dmp-sealed">
                <p>The model estimate stays sealed so it can't anchor you. Set your own probability, then open it.</p>
                <button className="arena-btn arena-btn-ghost" disabled={!touched} onClick={reveal}>
                  Open model estimate
                </button>
              </div>
            ) : (
              <div className="dmp-model">
                <div className="dmp-final">
                  <div className="dmp-final-top">
                    <span className="dmp-final-lab">FINAL ODDS</span>
                    <span className="dmp-final-val">{pct(blend.pFinal)}<small> sell</small></span>
                  </div>
                  {blend.weightless ? (
                    <p className="dmp-fine">
                      Nothing to blend yet: no wallet history to lean on and no stakes in the pool. This is just the
                      model's number.
                    </p>
                  ) : (
                    <>
                      <div className="dmp-weights" role="img" aria-label={`Model carries ${pct(blend.modelShare)} of the weight, pools carry ${pct(blend.poolShare)}`}>
                        <span className="dmp-w-model" style={{ width: `${blend.modelShare * 100}%` }} />
                        <span className="dmp-w-pool" style={{ width: `${blend.poolShare * 100}%` }} />
                      </div>
                      <p className="dmp-fine">
                        Model {pct(blend.modelShare)} · Pools {pct(blend.poolShare)} of the weight. The model counts as
                        a stake of its own; as real stakes pile in, the crowd takes over.
                      </p>
                    </>
                  )}
                  {touched && (
                    <p className="dmp-delta">
                      You are {Math.abs(Math.round(prob - blend.pFinal * 100))} pts {prob >= blend.pFinal * 100 ? 'above' : 'below'} the final odds.
                      {initialProb != null && initialProb !== prob && ` Your first read was ${initialProb}%.`}
                    </p>
                  )}
                </div>

                <p className="dmp-sub-title">WHY THE MODEL SAYS {pct(model.pYes)}</p>
                {model.signals.length === 0 ? (
                  <p className="arena-empty-note">
                    {model.sampleSize === 0
                      ? `No usable history for this wallet, so the model only has its starting assumption (${pct(BASE_RATE)} for a full window), scaled down for the time left.`
                      : 'Nothing in the recent history pushes the estimate either way.'}
                  </p>
                ) : (
                  <ul className="dmp-signals">
                    {model.signals.map((s) => (
                      <li key={s.id}>
                        <span className={`dmp-arrow ${s.effect}`} aria-hidden="true">{s.effect === 'sell' ? '↑' : '↓'}</span>
                        <span className="dmp-sig-body">
                          <span className="dmp-sig-name">{s.label}</span>
                          <span className="dmp-sig-detail">{s.detail}</span>
                        </span>
                        <span className="dmp-strength">{s.effect === 'sell' ? 'sell' : 'hold'} · {s.strength}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="dmp-fine">
                  {confidenceLabel(model.confidence)} confidence, based on {model.sampleSize} recent transfers and adjusted
                  for the time left. Baseline model v0: hand-set weights, not yet calibrated against resolved markets.
                </p>
              </div>
            )}

            <div className="dmp-pools">
              <div>
                <div className="arena-stat-lab">SELL POOL</div>
                <div className="dmp-pool-val">{pools.yes.toLocaleString()}</div>
              </div>
              <div>
                <div className="arena-stat-lab">HOLD POOL</div>
                <div className="dmp-pool-val">{pools.no.toLocaleString()}</div>
              </div>
              <div>
                <div className="arena-stat-lab">{side ? `IF ${side === 'yes' ? 'SELL' : 'HOLD'} WINS` : 'PAYOUT'}</div>
                <div className="dmp-pool-val">{multiple != null ? `${multiple.toFixed(2)}×` : 'n/a'}</div>
              </div>
            </div>
            <p className="dmp-fine">
              {poolTotal === 0
                ? 'No stakes yet. Payouts come only from other players\' real stakes, so a lone stake gets 1.00× back.'
                : 'Payouts are pure parimutuel on real stakes. The final odds above are a signal, not the payout.'}
            </p>
          </section>

          <div className="dmp-actions">
            <button className="arena-btn arena-btn-primary arena-btn-lg arena-btn-block" disabled={!canContinue} onClick={submit}>
              Continue to review →
            </button>
            {hint && <p className="dmp-hint">{hint}</p>}
            <button className="dmp-classic" onClick={onClassic}>
              Rug-by-% and the classic market view
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
