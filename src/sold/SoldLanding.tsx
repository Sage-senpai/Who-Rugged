import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../wallet/WalletContext'
import { ConnectButton } from '../wallet/ConnectButton'
import { getCurrentWindow } from './soldClient'
import { SoldNav } from './SoldNav'
import type { PredictionWindow } from './soldTypes'
import './sold-landing.css'

const HOLDERS = [
  { rank: 1, handle: 'blknoiz06', pct: '58.66%', bal: '586.6M', named: true },
  { rank: 2, handle: 'Whale_CLM6E4', pct: '1.06%', bal: '10.6M', named: false },
  { rank: 3, handle: 'cryptowhizz', pct: '0.95%', bal: '9.5M', named: true },
  { rank: 4, handle: 'Whale_8wLPuP', pct: '0.52%', bal: '5.2M', named: false },
  { rank: 5, handle: 'Whale_HDixbr', pct: '0.38%', bal: '3.8M', named: false },
  { rank: 6, handle: 'nockchain', pct: '0.33%', bal: '3.3M', named: true },
  { rank: 7, handle: 'CxCTVj_261x', pct: '0.04%', bal: '400K', named: true },
]

function useCountdown(closesAt: number | null) {
  const [label, setLabel] = useState('--:--:--')
  useEffect(() => {
    if (!closesAt) return
    const tick = () => {
      const diff = closesAt - Date.now()
      if (diff <= 0) { setLabel('SETTLING'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
    }
    tick()
    const t = setInterval(tick, 1_000)
    return () => clearInterval(t)
  }, [closesAt])
  return label
}

export function SoldLanding() {
  const { address } = useWallet()
  const [liveWindow, setLiveWindow] = useState<PredictionWindow | null>(null)
  const countdown = useCountdown(liveWindow?.closesAt ?? null)

  useEffect(() => {
    getCurrentWindow().then(setLiveWindow)
  }, [])

  return (
    <div className="sold-landing-view">

      {/* ── SHARED NAV ── */}
      <SoldNav countdown={liveWindow ? countdown : undefined} windowOpen={liveWindow?.status === 'open'} />

      {/* ── HUD (market stats only, nav above) ── */}
      <div className="hud">
        <div className="wrap">
          <span className="b alarm">$ANSEM</span>
          <span className="b gold">WINDOW <i>{liveWindow ? countdown : '—'}</i></span>
          <span className="b lime">11 <i>HOLDERS TRACKED</i></span>
          <span className="b">ORACLE <i>SOLANA</i></span>
          <span className="ticker">◉ LIVE MARKET</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <header id="main">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">$ANSEM Prediction Market · Solana</div>
              <h1 className="sold-logo">
                WHO<br />
                SOLD<span className="q">?</span>
              </h1>
              <p className="tag">
                Ansem's wallet is public. <b>Bet on what he does with it.</b>
                {' '}The community tracks every major holder —
                {' '}<em>call who sells before the window closes and stack $GG.</em>
              </p>
              <p className="sub">
                Real-time prediction market on on-chain Solana data. No price APIs,
                no speculation — wallet balances, read live, resolved automatically.
              </p>
              <div className="cta">
                {address ? (
                  <Link className="btn btn-gold" to="/sold/play">
                    ▶ Enter the Market
                  </Link>
                ) : (
                  <div className="sold-wallet-inline">
                    <ConnectButton />
                    <Link className="btn btn-ghost" to="/sold/play">
                      Browse without wallet
                    </Link>
                  </div>
                )}
                <a className="btn btn-ghost" href="#how">
                  How it works
                </a>
              </div>
            </div>

            {/* Holder wall */}
            <div className="sold-holder-wall">
              <div className="sold-holder-wall-hdr">
                <span>TOP $ANSEM HOLDERS</span>
                <span>BEING WATCHED</span>
              </div>
              {HOLDERS.map((h) => (
                <div className="sold-holder-row" key={h.handle}>
                  <span className="sold-holder-rank">#{h.rank}</span>
                  <span className="sold-holder-handle">{h.handle}</span>
                  <span className="sold-holder-bal">{h.bal}</span>
                  <span className="sold-holder-pct">{h.pct}</span>
                  <span className={`sold-holder-tag ${h.named ? 'named' : 'anon'}`}>
                    {h.named ? 'NAMED' : 'ANON'}
                  </span>
                </div>
              ))}
              <div className="sold-holder-wall-foot">
                + community-registered holders · new window every 12h
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── VS SECTION ── */}
      <section className="sold-vs-section" aria-label="Choose your game">
        <div className="wrap">
          <div className="sold-vs-eyebrow">TWO GAMES. ONE UNIVERSE.</div>
          <div className="sold-vs-grid">

            {/* WHO SOLD */}
            <div className="sold-vs-card sold-vs-card--sold">
              <div className="sold-vs-card-tag">PREDICTION MARKET</div>
              <div className="sold-vs-card-logo">WHO<br />SOLD<span>?</span></div>
              <p className="sold-vs-card-desc">
                Track $ANSEM's biggest holders. Call who dumps before the 12-hour window closes.
                Parimutuel payouts — the market sets the odds.
              </p>
              <ul className="sold-vs-card-traits">
                <li>On-chain oracle via Alchemy</li>
                <li>Individual picks + batch cohorts</li>
                <li>Earn $GG when you call it right</li>
              </ul>
              <div className="sold-vs-card-ctas">
                <Link className="btn btn-gold" to="/sold/play">▶ Enter Market</Link>
                <a className="btn btn-ghost sold-ghost-sold" href="#how">How it works</a>
              </div>
            </div>

            {/* VS divider */}
            <div className="sold-vs-divider">
              <div className="sold-vs-divider-line" />
              <div className="sold-vs-divider-badge">VS</div>
              <div className="sold-vs-divider-line" />
            </div>

            {/* WHO RUGGED */}
            <div className="sold-vs-card sold-vs-card--rugged">
              <div className="sold-vs-card-tag">SOCIAL DEDUCTION</div>
              <div className="sold-vs-card-logo sold-vs-card-logo--rugged">WHO<br />RUGGED<span>?</span></div>
              <p className="sold-vs-card-desc">
                Five suspects. One drained the vault. Roles sealed in a hardware enclave,
                pot settles on-chain. Zero trust, provably fair.
              </p>
              <ul className="sold-vs-card-traits sold-vs-card-traits--rugged">
                <li>TEE-attested roles, no admin peek</li>
                <li>Staked bond on every accusation</li>
                <li>Verdicts stored on 0G Network</li>
              </ul>
              <div className="sold-vs-card-ctas">
                <Link className="btn btn-cyan" to="/who-rugged">▶ Play Now</Link>
                <Link className="btn btn-ghost sold-ghost-rugged" to="/who-rugged#og">Why 0G</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── THREE MODES ── */}
      <section id="how">
        <div className="wrap">
          <div className="eyebrow">Choose your play</div>
          <h2 className="sec-h">Three ways to <span className="u">participate</span></h2>
          <p className="lead">
            Bet on individual wallets, bet on an entire airdrop cohort, or add your own wallet
            to be tracked. Every route earns $GG.
          </p>
          <div className="three">
            <div className="ico-card">
              <div className="ic">◎</div>
              <h4>Individual Picks</h4>
              <p>
                Pick a holder — blknoiz06, cryptowhizz, nockchain, the 261x trader — and
                call whether they sell before the 12h window closes.
              </p>
              <span className="tag-pill">YES / NO · fixed window</span>
            </div>
            <div className="ico-card">
              <div className="ic">⊞</div>
              <h4>Batch Markets</h4>
              <p>
                After an airdrop, bet on what <em style={{ color: 'var(--alarm)' }}>percentage</em> of
                recipients dump within 24h. Parimutuel odds — the market sets the line.
              </p>
              <span className="tag-pill">COHORT % · parimutuel</span>
            </div>
            <div className="ico-card">
              <div className="ic">✦</div>
              <h4>Join & Be Tracked</h4>
              <p>
                Hold ≥ 100k $ANSEM? Add your Solana wallet. The community bets on you —
                and you earn extra $GG every window your balance stays untouched.
              </p>
              <span className="tag-pill">100k $ANSEM minimum</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUR STEPS ── */}
      <section>
        <div className="wrap">
          <div className="eyebrow">One window</div>
          <h2 className="sec-h">Four beats, twelve hours</h2>
          <div className="steps">
            <div className="step">
              <div className="no">01</div>
              <h4>Snapshot</h4>
              <p>Window opens. Every tracked wallet's $ANSEM balance is recorded via Alchemy.</p>
            </div>
            <div className="step">
              <div className="no">02</div>
              <h4>Predict</h4>
              <p>Community places YES or NO bets with $GG stakes. Odds update live as the pool grows.</p>
            </div>
            <div className="step">
              <div className="no">03</div>
              <h4>Oracle</h4>
              <p>At close, Alchemy reads final balances. A balance drop &gt;10% counts as a sell.</p>
            </div>
            <div className="step">
              <div className="no">04</div>
              <h4>Settle</h4>
              <p>Correct predictors split the pool. Batch winners get parimutuel payouts. Scores update.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKET MECHANIC ── */}
      <section>
        <div className="wrap">
          <div className="eyebrow">Why this isn't a fixed bet</div>
          <h2 className="sec-h">Parimutuel odds — <span className="u">the market sets the line</span></h2>
          <p className="lead">
            Unlike sportsbooks, there's no house edge and no fixed payout. Your winnings
            depend on how many people bet wrong.
          </p>
          <div className="sold-mechanic">
            <div className="sold-mechanic-title">LIVE ODDS EXAMPLE — "WILL BLKNOIZ06 SELL?"</div>
            <div className="sold-odds-demo">
              <div className="sold-odds-bar-wrap">
                <span style={{ fontSize: 11, color: 'var(--alarm)', width: 40 }}>SELLS</span>
                <div className="sold-odds-bar">
                  <div className="sold-odds-fill-yes" style={{ width: '62%' }} />
                  <div className="sold-odds-fill-no" style={{ width: '38%' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--lime)', width: 40, textAlign: 'right' }}>HOLDS</span>
              </div>
              <div className="sold-odds-labels">
                <span className="yes">62% of pool · 3,100 $GG</span>
                <span className="no">38% · 1,900 $GG</span>
              </div>
            </div>
            <div className="sold-mechanic-body">
              If SELLS wins: each YES bettor gets their stake back <b>+ proportional share of the 1,900 $GG NO pool</b>.<br />
              If HOLDS wins: each NO bettor splits the 3,100 $GG YES pool proportionally.<br />
              <b>Early bettors set the line. Late bettors react to it.</b> The market finds consensus.
            </div>
          </div>

          <div className="sold-flow">
            <span className="node">Snapshot at open</span>
            <span className="arr">▶</span>
            <span className="node">Stakes pool</span>
            <span className="arr">▶</span>
            <span className="node"><b>Alchemy</b> reads balance</span>
            <span className="arr">▶</span>
            <span className="node">DO alarm fires</span>
            <span className="arr">▶</span>
            <span className="node"><b>$GG settles</b></span>
          </div>
        </div>
      </section>

      {/* ── ANSEM SECTION ── */}
      <section>
        <div className="wrap">
          <div className="eyebrow">The target</div>
          <h2 className="sec-h">Public information. <span className="u">Everyone's watching.</span></h2>
          <p className="lead">
            Ansem posted his wallet publicly. It holds 58.66% of the entire $ANSEM supply.
            Every move is on-chain, forever. We just built the bet around it.
          </p>
          <div className="sold-ansem-block">
            <div className="sold-ansem-stat">
              <span className="sold-ansem-stat-label">HOLDINGS</span>
              <span className="sold-ansem-stat-val">58.66%</span>
              <span className="sold-ansem-stat-sub">of total $ANSEM supply</span>
            </div>
            <div className="sold-ansem-divider" />
            <div className="sold-ansem-stat">
              <span className="sold-ansem-stat-label">TOKENS</span>
              <span className="sold-ansem-stat-val">586.6M</span>
              <span className="sold-ansem-stat-sub">snapshot Jul 1, 2026</span>
            </div>
            <div className="sold-ansem-divider" />
            <div className="sold-ansem-body">
              <b>blknoiz06</b> — one of the most followed traders on X — publicly shared this wallet.
              Every transfer is observable. The prediction market simply makes the observation worth
              something: bet on whether he moves before the window closes.
              <div className="sold-ansem-wallet">
                GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52
              </div>
            </div>
          </div>
          <span className="sold-big">
            The bet isn't on a price. It's on behavior — and behavior is verifiable.
          </span>
        </div>
      </section>

      {/* ── LIVE WINDOW ── */}
      {liveWindow && (
        <section>
          <div className="wrap">
            <div className="eyebrow">Right now</div>
            <h2 className="sec-h">Current window is <span className="u">open</span></h2>
            <div className="sold-live-strip">
              <span className="sold-live-dot" />
              <span className="sold-live-label">WINDOW CLOSES IN</span>
              <span className="sold-live-countdown">{countdown}</span>
              <span className="sold-live-holders">
                {liveWindow.holders.length} holders tracked · window {liveWindow.windowId}
              </span>
              <div className="sold-live-cta">
                <Link className="btn btn-gold" to="/sold/play">
                  ▶ Place Your Bet
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── JOIN SECTION ── */}
      <section id="join">
        <div className="wrap">
          <div className="eyebrow">Hold $ANSEM?</div>
          <h2 className="sec-h">Get tracked. <span className="u">Let the market bet on you.</span></h2>
          <p className="lead">
            Any wallet holding ≥ 100k $ANSEM can register. Once added, the community bets on
            your every move — and you earn $GG when you don't sell.
          </p>
          <div className="sold-join-grid">
            <div className="sold-join-card">
              <h4>TO REGISTER</h4>
              <ul>
                <li>Connect your 0G wallet (EVM, for identity)</li>
                <li>Enter your Solana wallet address</li>
                <li>We verify you hold ≥ 100k $ANSEM live via Alchemy</li>
                <li>You appear in the next window's holder list</li>
              </ul>
              <div style={{ marginTop: 16 }}>
                <Link className="btn btn-ghost" to="/sold/play">
                  Register Wallet →
                </Link>
              </div>
            </div>
            <div className="sold-join-card">
              <h4>WHAT BEING TRACKED MEANS</h4>
              <p>
                Your $ANSEM balance is read at window open and window close — read-only,
                nothing is moved. If you don't sell, predictors who bet HOLDS earn. If you do
                sell, predictors who bet SELLS earn. Your reputation is on-chain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="wrap">
          <div className="marq">
            <span>
              ◉ WHO SOLD ◉ $ANSEM ◉ ON-CHAIN ORACLE ◉ PARIMUTUEL MARKET ◉ 12H WINDOWS ◉
              INDIVIDUAL PICKS ◉ BATCH COHORTS ◉ REGISTER YOUR WALLET ◉ WHO RUGGED ◉ FIVE SUSPECTS ◉
              ONE THIEF ◉ TEE-ATTESTED ◉ 0G NETWORK ◉ WHO SOLD ◉ $ANSEM ◉ ON-CHAIN ORACLE ◉
            </span>
          </div>
          <div className="links">
            <a href="#how">HOW IT WORKS</a>
            <a href="#join">JOIN</a>
            <Link to="/sold/play">ENTER MARKET</Link>
            <Link to="/who-rugged" style={{ color: 'var(--cyan, #00d4ff)' }}>WHO RUGGED? →</Link>
          </div>
          <p className="fine">
            A prediction market on $ANSEM holder behavior. On-chain oracle via Alchemy + Solana.
            Built alongside WHO RUGGED? on 0G, 2026.
          </p>
        </div>
      </footer>

    </div>
  )
}
