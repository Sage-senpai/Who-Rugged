/* Leaderboard — ranks every predictor who has settled at least one position,
   by points won, summed across all three live arenas. Reads the server's
   own scoreMap per arena (getMarketLeaderboard), the same numbers used to
   settle payouts, then merges — nothing computed here beyond addition. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSolana } from '../../wallet/SolanaContext'
import { getMarketLeaderboard } from '../soldClient'
import type { PredictorScore } from '../soldTypes'
import { ArenaTopbar } from './ArenaTopbar'
import './arena.css'

function shortAddr(w: string): string {
  return `${w.slice(0, 4)}...${w.slice(-4)}`
}

function merge(perArena: PredictorScore[][]): PredictorScore[] {
  const byPredictor: Record<string, PredictorScore> = {}
  for (const scores of perArena) {
    for (const s of scores) {
      const acc = (byPredictor[s.predictor] ??= { predictor: s.predictor, correct: 0, total: 0, pointsDelta: 0 })
      acc.correct += s.correct
      acc.total += s.total
      acc.pointsDelta += s.pointsDelta
    }
  }
  return Object.values(byPredictor)
}

export function Leaderboard() {
  const { address } = useSolana()
  const [rows, setRows] = useState<PredictorScore[] | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([
      getMarketLeaderboard('ansem'),
      getMarketLeaderboard('bonk'),
      getMarketLeaderboard('wif'),
    ]).then((results) => { if (active) setRows(merge(results)) })
    return () => { active = false }
  }, [])

  const ranked = rows ? [...rows].sort((a, b) => b.pointsDelta - a.pointsDelta) : null

  return (
    <div className="arena-shell">
      <ArenaTopbar />
      <div className="arena-wrap arena-page">
        <p className="arena-eyebrow">Leaderboard</p>
        <h1 className="arena-h1">Top predictors</h1>
        <p className="arena-sub">Ranked by real points won, across every settled position in every arena.</p>

        {ranked == null ? (
          <p className="arena-loading">Loading leaderboard…</p>
        ) : ranked.length === 0 ? (
          <p className="arena-locked-note">
            No settled predictions yet — the first resolved arena window will populate this.{' '}
            <Link to="/arena">Enter an arena →</Link>
          </p>
        ) : (
          <div className="arena-table-wrap">
            <table className="arena-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>PREDICTOR</th>
                  <th>ACCURACY</th>
                  <th>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const isMe = address != null && r.predictor === address
                  const accuracy = r.total > 0 ? (r.correct / r.total) * 100 : 0
                  return (
                    <tr key={r.predictor} className={isMe ? 'arena-row-me' : ''}>
                      <td className="arena-rank">#{String(i + 1).padStart(2, '0')}</td>
                      <td>{shortAddr(r.predictor)}{isMe ? ' (you)' : ''}</td>
                      <td>{accuracy.toFixed(0)}% ({r.correct}/{r.total})</td>
                      <td className={r.pointsDelta >= 0 ? 'arena-pnl-up' : 'arena-pnl-down'}>
                        {r.pointsDelta >= 0 ? '+' : ''}{r.pointsDelta.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
