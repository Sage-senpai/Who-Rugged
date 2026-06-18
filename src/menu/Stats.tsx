import { Link } from 'react-router-dom'
import { ScreenShell } from '../components/ScreenShell'
import { loadHistory, loadPlayer, unlockProgress } from '../game/profile'
import './menu.css'

const fmt = (n: number) => n.toLocaleString()

// Stand-in field until the leaderboard reads on-chain ELO from the contract.
const FIELD = [
  { name: 'vbyKai', elo: 1486 },
  { name: 'mevMike', elo: 1402 },
  { name: 'ledgerLou', elo: 1330 },
  { name: 'quietQ', elo: 1255 },
  { name: 'priya.eth', elo: 1188 },
  { name: 'glitch', elo: 1042 },
  { name: 'daoRen', elo: 968 },
]

export function Stats() {
  const p = loadPlayer()
  const history = loadHistory()
  const unlock = unlockProgress(p.elo)
  const winRate = p.played > 0 ? Math.round((p.wins / p.played) * 100) : 0

  const board = [...FIELD, { name: 'YOU', elo: p.elo, you: true }]
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 8)

  return (
    <ScreenShell title="Stats" sub="Your case record on this device." back={{ to: '/menu', label: '◀ Menu' }}>
      <section className="panel">
        <h2 className="panel-h">Profile</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="sv">{fmt(p.balance)}</div>
            <div className="sl">Balance $GG</div>
          </div>
          <div className="stat">
            <div className="sv">{p.elo}</div>
            <div className="sl">Rank</div>
          </div>
          <div className="stat">
            <div className="sv">{p.wins}/{p.played}</div>
            <div className="sl">Solved</div>
          </div>
          <div className="stat">
            <div className="sv">{winRate}%</div>
            <div className="sl">Win rate</div>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-lab">
            <span>NEXT UNLOCK: {unlock.label.toUpperCase()}</span>
            <span>
              {p.elo} / {unlock.target}
            </span>
          </div>
          <div className="progress">
            <i style={{ width: `${Math.round(unlock.pct * 100)}%` }} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-h">Recent cases</h2>
        {history.length === 0 ? (
          <p className="empty-note">No cases on record yet. Press start and make your first bust.</p>
        ) : (
          <div>
            {history.map((h, i) => (
              <div className="history-row" key={i}>
                <span className="hr-case">#{String(h.caseNo).padStart(4, '0')}</span>
                <span className="hr-title">{h.title}</span>
                <span className={`hr-delta ${h.delta >= 0 ? 'pos' : 'neg'}`}>
                  {h.delta >= 0 ? '+' : ''}
                  {h.delta} $GG
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-h">Leaderboard</h2>
        <p className="panel-note" style={{ marginTop: 0, marginBottom: 12 }}>
          Reads from 0G Chain once rank settles on contract. Sample field for now.
        </p>
        <div>
          {board.map((row, i) => (
            <div className="lb-row" key={row.name + i}>
              <span className="lb-rank">{i + 1}</span>
              <span className={`lb-name ${'you' in row && row.you ? 'you' : ''}`}>
                {'you' in row && row.you ? 'YOU' : row.name}
              </span>
              <span className="lb-elo">{row.elo}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="cta" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 22 }}>
        <Link className="btn btn-gold" to="/play">
          ▶ Play a case
        </Link>
        <Link className="btn btn-ghost" to="/menu">
          Back to menu
        </Link>
      </div>
    </ScreenShell>
  )
}
