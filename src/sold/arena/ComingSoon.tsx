/* Scenes 7-9 (Bet Locked / Holder Acts / Resolution) as one static pipeline —
   the storyboard itself leaves these unshaped, so this matches that treatment
   rather than inventing UI the source design doesn't specify. Resolution
   itself already happens server-side (BucketMarket's sample/settle cycle);
   Portfolio is where that becomes visible, so this links there instead of
   just describing the pipeline in the abstract. */
import { Link } from 'react-router-dom'

interface Props {
  onDone: () => void
}

export function ComingSoon({ onDone }: Props) {
  return (
    <div>
      <p className="arena-eyebrow">Scenes 7-9 · Coming Soon</p>
      <h1 className="arena-h1">Your bet is locked in</h1>
      <p className="arena-sub">
        It's hidden until the window closes. Here's how resolution will work once it ships.
      </p>

      <div className="arena-soon-grid">
        <div className="arena-soon-card">
          <div className="arena-soon-num">SCENE 7</div>
          <div className="arena-soon-title">Bet Locked</div>
          <p className="arena-soon-desc">Your prediction is sealed and hidden from the market until resolution.</p>
        </div>
        <div className="arena-soon-card">
          <div className="arena-soon-num">SCENE 8</div>
          <div className="arena-soon-title">Holder Acts</div>
          <p className="arena-soon-desc">The protocol detects the holder's on-chain action in real time.</p>
        </div>
        <div className="arena-soon-card">
          <div className="arena-soon-num">SCENE 9</div>
          <div className="arena-soon-title">Resolution</div>
          <p className="arena-soon-desc">All actions are verified on-chain by the oracle. Markets resolve accordingly.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Link to="/portfolio" className="arena-btn arena-btn-primary">Track it in Portfolio →</Link>
        <button className="arena-btn arena-btn-ghost" onClick={onDone}>← Back to Scan Holders</button>
      </div>
    </div>
  )
}
