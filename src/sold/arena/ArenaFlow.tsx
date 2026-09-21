import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTokenPrice } from '../soldClient'
import { useArena } from './useArena'
import { ArenaTopbar } from './ArenaTopbar'
import { ScanHolders } from './ScanHolders'
import { SelectHolder } from './SelectHolder'
import { SelectMarketType } from './SelectMarketType'
import { PredictBinary } from './PredictBinary'
import { PredictMagnitude } from './PredictMagnitude'
import { ReviewCommit } from './ReviewCommit'
import { ComingSoon } from './ComingSoon'
import { Thesis } from '../dmp/Thesis'
import './arena.css'

export function ArenaFlow() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const a = useArena(arenaId)
  const [usdPrice, setUsdPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!a.isLive || !a.arena) return
    let active = true
    void getTokenPrice(a.arena.id).then((p) => { if (active && p) setUsdPrice(p.usd) })
    return () => { active = false }
  }, [a.isLive, a.arena])

  const myInPlay = useMemo(() => {
    const all = [...a.markets.positions, ...a.markets.binaryPositions, ...a.markets.magnitudePositions]
    return all.reduce((s, p) => s + p.stake, 0)
  }, [a.markets.positions, a.markets.binaryPositions, a.markets.magnitudePositions])

  if (!a.arena) {
    return (
      <div className="arena-shell">
        <ArenaTopbar />
        <div className="arena-wrap arena-page">
          <p className="arena-locked-note">
            Unknown arena. <Link to="/arena">Back to arenas →</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!a.isLive) {
    return (
      <div className="arena-shell">
        <ArenaTopbar />
        <div className="arena-wrap arena-page">
          <Link to="/arena" className="arena-back">← Back to Arena</Link>
          <p className="arena-locked-note">
            {a.arena.name} ({a.arena.ticker}) isn't wired to a live backend yet — no tracked
            wallets, no real odds. Enter a live arena instead.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="arena-shell">
      <ArenaTopbar inPlay={myInPlay} />
      <div className="arena-wrap arena-page">
        {a.scene === 'scan' && <ScanHolders arena={a.arena} markets={a.markets} usdPrice={usdPrice} onSelect={a.selectHolder} />}
        {a.scene === 'holder' && a.holder && (
          <SelectHolder holder={a.holder} usdPrice={usdPrice} totalSupply={a.arena.totalSupply} arenaId={a.arena.id}
            onBack={a.back} onPredict={a.openThesis} />
        )}
        {a.scene === 'thesis' && a.holder && (
          <Thesis
            holder={a.markets.markets.find((m) => m.wallet === a.holder!.wallet) ?? a.holder}
            arena={a.arena}
            usdPrice={usdPrice}
            onBack={a.back}
            onClassic={a.openMarketTypePicker}
            onContinue={a.submitRead}
          />
        )}
        {a.scene === 'marketType' && a.holder && (
          <SelectMarketType holder={a.holder} onBack={a.back} onSelect={a.selectMarketType} />
        )}
        {a.scene === 'predict' && a.holder && a.marketKind === 'binary' && (
          <PredictBinary holder={a.holder} live={a.markets.live} onBack={a.back} onChoose={a.selectOutcome} />
        )}
        {a.scene === 'predict' && a.holder && a.marketKind === 'magnitude' && (
          <PredictMagnitude holder={a.holder} live={a.markets.live} onBack={a.back} onChoose={a.selectOutcome} />
        )}
        {a.scene === 'review' && a.holder && a.outcome && (
          <ReviewCommit holder={a.holder} marketKind={a.marketKind!} outcome={a.outcome} stake={a.stake}
            committing={a.committing} commitError={a.commitError} readProbYes={a.read?.probYes}
            onBack={a.back} onCommit={a.commit} />
        )}
        {a.scene === 'locked' && <ComingSoon onDone={a.reset} />}
      </div>
    </div>
  )
}
