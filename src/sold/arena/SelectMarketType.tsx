import type { HolderMarket } from '../market/marketTypes'
import type { MarketKind } from './arenaTypes'

interface Props {
  holder: HolderMarket
  onBack: () => void
  onSelect: (kind: MarketKind) => void
}

export function SelectMarketType({ holder, onBack, onSelect }: Props) {
  return (
    <div>
      <button className="arena-back" onClick={onBack}>← Back to Holder</button>
      <p className="arena-eyebrow">Scene 4 · Select Market Type</p>
      <h1 className="arena-h1">What do you want to predict about @{holder.handle}?</h1>
      <p className="arena-sub" style={{ marginBottom: 20 }}>Different markets, different payouts. Choose the one that fits your read.</p>

      <div className="arena-mtype-grid">
        <button className="arena-mtype-card" onClick={() => onSelect('binary')}>
          <span className="arena-mtype-icon arena-mtype-icon-binary">◎</span>
          <h3 className="arena-mtype-title">Binary</h3>
          <p className="arena-mtype-desc">Will they perform the action within the prediction window?</p>
          <span className="arena-mtype-example">Example: will they sell within the time window?</span>
        </button>

        <button className="arena-mtype-card" onClick={() => onSelect('magnitude')}>
          <span className="arena-mtype-icon arena-mtype-icon-magnitude">▤</span>
          <h3 className="arena-mtype-title">Rug by %</h3>
          <p className="arena-mtype-desc">How much of their position will they reduce?</p>
          <span className="arena-mtype-example">Example: how much of their position will they rug?</span>
        </button>
      </div>
    </div>
  )
}
