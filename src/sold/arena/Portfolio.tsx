/* Portfolio — every position the connected wallet has open or settled, across
   all three market dimensions AND all three live arenas. This is the payoff
   view the "locked" scene points to: place a bet, then come here to watch it
   resolve for real. Status and payout are derived client-side from the same
   real pools the server settles from, so a resolved row shows the same
   number the server paid out.

   Three explicit useMarkets() calls (not a loop) because hooks can't be
   called conditionally/dynamically — fine for a fixed, small arena list. */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSolana } from '../../wallet/SolanaContext'
import { useMarkets, type UseMarketsReturn } from '../market/useMarkets'
import { arenaAvatarFor } from '../../lib/arenaAvatar'
import { ArenaTopbar } from './ArenaTopbar'
import { arenaById } from './arenas'
import { bucketById, potentialPayout } from '../market/buckets'
import { binaryById, potentialBinaryPayout } from '../market/binary'
import { magnitudeById, potentialMagnitudePayout } from '../market/magnitude'
import { BET_TOKEN } from '../soldConfig'
import './arena.css'

function shortAddr(w: string): string {
  return `${w.slice(0, 4)}...${w.slice(-4)}`
}

type Status = 'pending' | 'won' | 'lost'
interface Row {
  key: string
  arenaTicker: string
  wallet: string
  handle: string
  avatarSeed: string
  kind: 'Time' | 'Binary' | 'Rug %'
  outcomeLabel: string
  stake: number
  status: Status
  payout: number
  placedAt: number
}

function rowsFor(arenaId: string, markets: UseMarketsReturn): Row[] {
  const ticker = arenaById(arenaId)?.ticker ?? arenaId
  const holderOf = (wallet: string) => markets.markets.find((m) => m.wallet === wallet)
  const out: Row[] = []

  for (const p of markets.positions) {
    const h = holderOf(p.wallet)
    const resolved = h?.resolvedBucket != null
    const won = resolved && h!.resolvedBucket === p.bucket
    const pools = h?.realPools ?? h?.pools
    out.push({
      key: `${arenaId}-bucket-${p.wallet}-${p.placedAt}`, arenaTicker: ticker,
      wallet: p.wallet, handle: h?.handle ?? shortAddr(p.wallet), avatarSeed: h?.avatarSeed ?? p.wallet,
      kind: 'Time', outcomeLabel: bucketById(p.bucket).short, stake: p.stake,
      status: !resolved ? 'pending' : won ? 'won' : 'lost',
      payout: !resolved ? (pools ? potentialPayout(pools, p.bucket, p.stake) : p.stake)
        : won ? potentialPayout(h!.realPools ?? h!.pools, p.bucket, p.stake) : 0,
      placedAt: p.placedAt,
    })
  }
  for (const p of markets.binaryPositions) {
    const h = holderOf(p.wallet)
    const resolved = h?.resolvedBinary != null
    const won = resolved && h!.resolvedBinary === p.side
    const pools = h?.realBinaryPools ?? h?.binaryPools
    out.push({
      key: `${arenaId}-binary-${p.wallet}-${p.placedAt}`, arenaTicker: ticker,
      wallet: p.wallet, handle: h?.handle ?? shortAddr(p.wallet), avatarSeed: h?.avatarSeed ?? p.wallet,
      kind: 'Binary', outcomeLabel: binaryById(p.side).short, stake: p.stake,
      status: !resolved ? 'pending' : won ? 'won' : 'lost',
      payout: !resolved ? (pools ? potentialBinaryPayout(pools, p.side, p.stake) : p.stake)
        : won ? potentialBinaryPayout(h!.realBinaryPools ?? h!.binaryPools!, p.side, p.stake) : 0,
      placedAt: p.placedAt,
    })
  }
  for (const p of markets.magnitudePositions) {
    const h = holderOf(p.wallet)
    const resolved = h?.resolvedMagnitudeBand != null
    const won = resolved && h!.resolvedMagnitudeBand === p.band
    const pools = h?.realMagnitudePools ?? h?.magnitudePools
    out.push({
      key: `${arenaId}-magnitude-${p.wallet}-${p.placedAt}`, arenaTicker: ticker,
      wallet: p.wallet, handle: h?.handle ?? shortAddr(p.wallet), avatarSeed: h?.avatarSeed ?? p.wallet,
      kind: 'Rug %', outcomeLabel: magnitudeById(p.band).short, stake: p.stake,
      status: !resolved ? 'pending' : won ? 'won' : 'lost',
      payout: !resolved ? (pools ? potentialMagnitudePayout(pools, p.band, p.stake) : p.stake)
        : won ? potentialMagnitudePayout(h!.realMagnitudePools ?? h!.magnitudePools!, p.band, p.stake) : 0,
      placedAt: p.placedAt,
    })
  }
  return out
}

export function Portfolio() {
  const { address } = useSolana()
  const ansem = useMarkets(address, 'ansem')
  const bonk = useMarkets(address, 'bonk')
  const wif = useMarkets(address, 'wif')
  const floki = useMarkets(address, 'floki')
  const babydoge = useMarkets(address, 'babydoge')
  const broccoli = useMarkets(address, 'broccoli')
  const zashArc = useMarkets(address, 'zash-arc')
  const zashSeis = useMarkets(address, 'zash-seis')
  const all: [string, UseMarketsReturn][] = [
    ['ansem', ansem], ['bonk', bonk], ['wif', wif], ['floki', floki], ['babydoge', babydoge],
    ['broccoli', broccoli], ['zash-arc', zashArc], ['zash-seis', zashSeis],
  ]
  const anyLoading = all.some(([, m]) => m.loading)
  const anyLive = all.some(([, m]) => m.live)

  const rows = useMemo<Row[]>(
    () => all.flatMap(([id, m]) => rowsFor(id, m)).sort((a, b) => b.placedAt - a.placedAt),
    [ansem, bonk, wif, floki, babydoge, broccoli, zashArc, zashSeis],
  )

  const pending = rows.filter((r) => r.status === 'pending')
  const settled = rows.filter((r) => r.status !== 'pending')
  const inPlay = pending.reduce((s, r) => s + r.stake, 0)
  const netPnl = settled.reduce((s, r) => s + (r.status === 'won' ? r.payout - r.stake : -r.stake), 0)

  return (
    <div className="arena-shell">
      <ArenaTopbar inPlay={address ? inPlay : undefined} />
      <div className="arena-wrap arena-page">
        <p className="arena-eyebrow">Portfolio</p>
        <h1 className="arena-h1">Your positions</h1>

        {!address ? (
          <p className="arena-locked-note">
            Connect a Solana wallet to see your positions. <Link to="/arena">← Back to Arena</Link>
          </p>
        ) : anyLoading ? (
          <p className="arena-loading">Loading your positions…</p>
        ) : rows.length === 0 ? (
          <p className="arena-locked-note">
            No positions yet. <Link to="/arena">Enter an arena →</Link>
          </p>
        ) : (
          <>
            <div className="arena-portfolio-summary">
              <div>
                <div className="arena-portfolio-summary-label">In play</div>
                <div className="arena-portfolio-summary-value">{inPlay.toLocaleString()} {BET_TOKEN}</div>
              </div>
              <div>
                <div className="arena-portfolio-summary-label">Settled P/L</div>
                <div className={`arena-portfolio-summary-value ${netPnl >= 0 ? 'arena-pnl-up' : 'arena-pnl-down'}`}>
                  {netPnl >= 0 ? '+' : ''}{netPnl.toLocaleString()} {BET_TOKEN}
                </div>
              </div>
            </div>

            <div className="arena-table-wrap">
              <table className="arena-table">
                <thead>
                  <tr>
                    <th>ARENA</th>
                    <th>HOLDER</th>
                    <th>MARKET</th>
                    <th>YOUR CALL</th>
                    <th>STAKE</th>
                    <th>STATUS</th>
                    <th>PAYOUT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td><span className="arena-tag">{r.arenaTicker}</span></td>
                      <td>
                        <div className="arena-holder-cell">
                          <img className="arena-avatar" src={arenaAvatarFor(r.avatarSeed)} alt="" loading="lazy" />
                          <div className="arena-holder-handle">@{r.handle}</div>
                        </div>
                      </td>
                      <td>{r.kind}</td>
                      <td>{r.outcomeLabel}</td>
                      <td>{r.stake.toLocaleString()} {BET_TOKEN}</td>
                      <td><span className={`arena-status arena-status-${r.status}`}>{r.status.toUpperCase()}</span></td>
                      <td className={r.status === 'lost' ? 'arena-pnl-down' : r.status === 'won' ? 'arena-pnl-up' : ''}>
                        {r.status === 'lost' ? '—' : `${r.payout.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${BET_TOKEN}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="arena-table-foot">
                {anyLive ? 'Live server pools' : 'Local preview'} · resolves automatically once the oracle confirms a holder's action
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
