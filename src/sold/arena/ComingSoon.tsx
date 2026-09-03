/* Scenes 7-9 (Bet Locked / Holder Acts / Resolution) as one static pipeline —
   the storyboard itself leaves these unshaped, so this matches that treatment
   rather than inventing UI the source design doesn't specify. */
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

      <button className="arena-btn arena-btn-ghost" style={{ marginTop: 20 }} onClick={onDone}>
        ← Back to Scan Holders
      </button>
    </div>
  )
}
