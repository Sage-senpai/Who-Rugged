import type { PredictorScore } from './soldTypes'

interface Props {
  scores: PredictorScore[]
  myAddress: string | null
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PredictorRankings({ scores, myAddress }: Props) {
  const sorted = [...scores].sort((a, b) => b.pointsDelta - a.pointsDelta).slice(0, 10)

  return (
    <aside className="sold-leaderboard">
      <p className="sold-leaderboard-title">Predictor Rankings</p>
      {sorted.length === 0 && (
        <p style={{ fontSize: '0.72rem', opacity: 0.4 }}>No predictions settled yet.</p>
      )}
      {sorted.map((s, i) => (
        <div
          key={s.predictor}
          className="sold-rank-row"
          style={{ fontWeight: s.predictor === myAddress ? 700 : undefined }}
        >
          <span className="sold-rank-pos">{i + 1}.</span>
          <span className="sold-rank-addr" title={s.predictor}>
            {s.predictor === myAddress ? 'you' : shortAddr(s.predictor)}
          </span>
          <span className="sold-rank-delta" style={{ fontSize: '0.68rem', opacity: 0.45, marginRight: '0.25rem' }}>
            {s.correct}/{s.total}
          </span>
          <span className={`sold-rank-delta ${s.pointsDelta >= 0 ? 'pos' : 'neg'}`}>
            {s.pointsDelta >= 0 ? '+' : ''}{s.pointsDelta}
          </span>
        </div>
      ))}
    </aside>
  )
}
