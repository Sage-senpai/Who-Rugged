import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSolana } from '../wallet/SolanaContext'
import { WalletMenu } from '../wallet/WalletMenu'
import { getCurrentWindow } from './soldClient'
import { SoldNav } from './SoldNav'
import { BET_TOKEN, EVIL_TOKEN_TICKER, EVIL_TOKEN_LIVE } from './soldConfig'
import type { PredictionWindow } from './soldTypes'
import './sold-landing.css'

/* Airdrop suspects — pulled from Solscan, Jul 1 2026.
   These are the wallets CT is already watching. */
const SUSPECTS = [
  { rank: 1, handle: 'blknoiz06', bal: '586.6M', pct: '58.66%', named: true, role: 'KINGPIN' },
  { rank: 2, handle: 'Whale_CLM6E4', bal: '10.6M', pct: '1.06%', named: false, role: 'SILENT BAG' },
  { rank: 3, handle: 'cryptowhizz', bal: '9.5M', pct: '0.95%', named: true, role: 'VOCAL HOLDER' },
  { rank: 4, handle: 'Whale_8wLPuP', bal: '5.2M', pct: '0.52%', named: false, role: 'GHOST WALLET' },
  { rank: 5, handle: 'nockchain', bal: '3.3M', pct: '0.33%', named: true, role: 'BUILDER' },
  { rank: 6, handle: 'CxCTVj_261x', bal: '400K', pct: '0.04%', named: true, role: '261× TRADER' },
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
  const { address } = useSolana()
  const [liveWindow, setLiveWindow] = useState<PredictionWindow | null>(null)
  const countdown = useCountdown(liveWindow?.closesAt ?? null)

  useEffect(() => {
    getCurrentWindow().then(setLiveWindow)
  }, [])

  return (
    <div className="sold-landing-view">

      <SoldNav countdown={liveWindow ? countdown : undefined} windowOpen={liveWindow?.status === 'open'} />

      {/* ── HUD ── */}
      <div className="hud">
        <div className="wrap">
          <span className="b alarm">$ANSEM</span>
          <span className="b gold">WINDOW <i>{liveWindow ? countdown : '—'}</i></span>
          <span className="b lime">ORACLE <i>SOLANA LIVE</i></span>
          {EVIL_TOKEN_LIVE ? (
            <span className="b" style={{ color: 'var(--alarm)' }}>BET <i>{EVIL_TOKEN_TICKER}</i></span>
          ) : (
            <span className="b" style={{ opacity: 0.5 }}>{EVIL_TOKEN_TICKER} <i>COMING SOON</i></span>
          )}
          <span className="ticker">◉ AIRDROP BETRAYAL MARKET</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <header id="main">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">$ANSEM Airdrop · Solana · Public Wallets</div>
              <h1 className="sold-logo">
                WHO<br />
                SOLD<span className="q">?</span>
              </h1>
              <p className="tag">
                Ansem dropped. CT is already calling who betrays the community first.
                {' '}<b>Put {EVIL_TOKEN_LIVE ? EVIL_TOKEN_TICKER : BET_TOKEN} on it.</b>
              </p>
              <p className="sub">
                Every airdrop recipient's wallet is public on Solana. We built the market
                around that fact — bet on who dumps before the window closes.
                The oracle reads it live. Settlement is automatic.
              </p>
              <div className="cta">
                {address ? (
                  <Link className="btn btn-gold" to="/sold/play">
                    ▶ Enter the Market
                  </Link>
                ) : (
                  <div className="sold-wallet-inline">
                    <WalletMenu />
                    <Link className="btn btn-ghost" to="/sold/play">
                      Browse without wallet
                    </Link>
                  </div>
                )}
                <a className="btn btn-ghost" href="#moat">
                  Got the airdrop? →
                </a>
              </div>
            </div>

            {/* Suspect wall */}
            <div className="sold-holder-wall">
              <div className="sold-holder-wall-hdr">
                <span>PUBLICLY WATCHED</span>
                <span>WALLETS ON-CHAIN</span>
              </div>
              {SUSPECTS.map((s) => (
                <div className="sold-holder-row" key={s.handle}>
                  <span className="sold-holder-rank">#{s.rank}</span>
                  <span className="sold-holder-handle">{s.handle}</span>
                  <span className="sold-holder-bal">{s.bal}</span>
                  <span className={`sold-holder-tag ${s.named ? 'named' : 'anon'}`}>
                    {s.role}
                  </span>
                </div>
              ))}
              <div className="sold-holder-wall-foot">
                + community-registered recipients · window resets every 12h
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOAT — THE BETRAYAL REGISTER ── */}
      <section id="moat" className="sold-moat-section">
        <div className="wrap">
          <div className="sold-moat-inner">
            <div className="sold-moat-left">
              <div className="eyebrow" style={{ color: 'var(--alarm)' }}>THE MOAT</div>
              <h2 className="sec-h" style={{ margin: '10px 0 0' }}>
                Got the airdrop?<br />
                <span className="u">CT is already betting you'll dump.</span>
              </h2>
              <p className="lead" style={{ marginTop: 16 }}>
                People have been saying it on CT for months: "this guy will sell the second
                he gets the drop." We built the market for that exact bet.
                Add your wallet. Let the community put money on it.
                If you hold, you earn. If you dump, they earn.
                Either way, the blockchain remembers.
              </p>
              <div className="sold-moat-ctas">
                <Link className="btn btn-gold" to="/sold/play">
                  ▶ Register My Wallet
                </Link>
                <Link className="btn btn-ghost" to="/sold/play">
                  Browse the market →
                </Link>
              </div>
            </div>
            <div className="sold-moat-right">
              <div className="sold-moat-card">
                <div className="sold-moat-card-eyebrow">TO JOIN THE WATCH LIST</div>
                <ol className="sold-moat-steps">
                  <li>
                    <span className="sold-moat-num">01</span>
                    <div>
                      <strong>Connect your Solana wallet</strong>
                      <p>Phantom or Solflare — proves who is registering</p>
                    </div>
                  </li>
                  <li>
                    <span className="sold-moat-num">02</span>
                    <div>
                      <strong>Submit your Solana wallet</strong>
                      <p>Must hold ≥ 100k $ANSEM at verification time</p>
                    </div>
                  </li>
                  <li>
                    <span className="sold-moat-num">03</span>
                    <div>
                      <strong>Alchemy verifies live</strong>
                      <p>On-chain read, no off-chain trust, no screenshots</p>
                    </div>
                  </li>
                  <li>
                    <span className="sold-moat-num">04</span>
                    <div>
                      <strong>You're in the next window</strong>
                      <p>The community bets on you every 12h</p>
                    </div>
                  </li>
                </ol>
                <div className="sold-moat-card-note">
                  Your wallet is read-only. Nothing is moved. Your on-chain actions speak for themselves.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VS SECTION ── */}
      <section className="sold-vs-section" aria-label="Choose your game">
        <div className="wrap">
          <div className="sold-vs-eyebrow">TWO GAMES. ONE UNIVERSE.</div>
          <div className="sold-vs-grid">

            <div className="sold-vs-card sold-vs-card--sold">
              <div className="sold-vs-card-tag">PREDICTION MARKET</div>
              <div className="sold-vs-card-logo">WHO<br />SOLD<span>?</span></div>
              <p className="sold-vs-card-desc">
                Track $ANSEM airdrop recipients. Bet on who dumps within the 12-hour window.
                Parimutuel payouts — the market sets the odds. Oracle reads Solana live.
              </p>
              <ul className="sold-vs-card-traits">
                <li>Real wallets. Real on-chain behavior.</li>
                <li>Individual picks + batch airdrop cohorts</li>
                <li>Earn {EVIL_TOKEN_LIVE ? EVIL_TOKEN_TICKER : BET_TOKEN} when you call it right</li>
              </ul>
              <div className="sold-vs-card-ctas">
                <Link className="btn btn-gold" to="/sold/play">▶ Enter Market</Link>
                <a className="btn btn-ghost sold-ghost-sold" href="#how">How it works</a>
              </div>
            </div>

            <div className="sold-vs-divider">
              <div className="sold-vs-divider-line" />
              <div className="sold-vs-divider-badge">VS</div>
              <div className="sold-vs-divider-line" />
            </div>

            <div className="sold-vs-card sold-vs-card--rugged">
              <div className="sold-vs-card-tag">SOCIAL DEDUCTION</div>
              <div className="sold-vs-card-logo sold-vs-card-logo--rugged">WHO<br />RUGGED<span>?</span></div>
              <p className="sold-vs-card-desc">
                Five suspects. One drained the vault. Roles sealed in a TEE,
                pot settles on-chain. Read between the lies. Make the accusation.
              </p>
              <ul className="sold-vs-card-traits sold-vs-card-traits--rugged">
                <li>TEE-attested roles — no admin peek</li>
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

      {/* ── HOW IT WORKS ── */}
      <section id="how">
        <div className="wrap">
          <div className="eyebrow">The mechanics</div>
          <h2 className="sec-h">Three ways to <span className="u">participate</span></h2>
          <p className="lead">
            Bet on individual wallets, bet on an entire airdrop cohort, or register your own
            wallet and let the market bet on you.
          </p>
          <div className="three">
            <div className="ico-card">
              <div className="ic">◎</div>
              <h4>Individual Picks</h4>
              <p>
                Choose a specific recipient and call whether they sell before the 12h window
                closes. YES = they dump. NO = they hold. Simple on-chain resolution.
              </p>
              <span className="tag-pill">YES / NO · fixed window</span>
            </div>
            <div className="ico-card">
              <div className="ic">⊞</div>
              <h4>Batch Markets</h4>
              <p>
                After an airdrop, bet on what <em style={{ color: 'var(--alarm)' }}>percentage</em> of
                the entire cohort dumps within 24h. Parimutuel — the community sets the line.
              </p>
              <span className="tag-pill">COHORT % · parimutuel</span>
            </div>
            <div className="ico-card">
              <div className="ic">✦</div>
              <h4>Be the Target</h4>
              <p>
                Register your wallet. The community bets on you every window.
                Hold and earn. Dump and they earn. Your reputation is permanently on-chain.
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
              <p>Window opens. Every tracked wallet's $ANSEM balance is read via Alchemy on Solana mainnet.</p>
            </div>
            <div className="step">
              <div className="no">02</div>
              <h4>Predict</h4>
              <p>Community places bets. Odds update live as the pool fills. Early bettors set the line.</p>
            </div>
            <div className="step">
              <div className="no">03</div>
              <h4>Oracle</h4>
              <p>At close, Alchemy reads final balances. A drop &gt;10% counts as a sell. No humans involved.</p>
            </div>
            <div className="step">
              <div className="no">04</div>
              <h4>Settle</h4>
              <p>
                Correct predictors split the pool. Payouts are automatic.
                The blockchain remembers who sold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKET MECHANIC ── */}
      <section>
        <div className="wrap">
          <div className="eyebrow">The payout model</div>
          <h2 className="sec-h">Parimutuel — <span className="u">the market sets the line</span></h2>
          <p className="lead">
            No house edge. No fixed payout. Your winnings depend entirely on how many people
            bet wrong. The more consensus, the worse the odds for latecomers.
          </p>
          <div className="sold-mechanic">
            <div className="sold-mechanic-title">LIVE ODDS EXAMPLE — "WILL BLKNOIZ06 DUMP?"</div>
            <div className="sold-odds-demo">
              <div className="sold-odds-bar-wrap">
                <span style={{ fontSize: 11, color: 'var(--alarm)', width: 44 }}>DUMPS</span>
                <div className="sold-odds-bar">
                  <div className="sold-odds-fill-yes" style={{ width: '62%' }} />
                  <div className="sold-odds-fill-no" style={{ width: '38%' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--lime)', width: 40, textAlign: 'right' }}>HOLDS</span>
              </div>
              <div className="sold-odds-labels">
                <span className="yes">62% of pool · 3,100 {BET_TOKEN}</span>
                <span className="no">38% · 1,900 {BET_TOKEN}</span>
              </div>
            </div>
            <div className="sold-mechanic-body">
              If DUMPS wins: each YES bettor gets their stake back <b>+ proportional share of the 1,900 {BET_TOKEN} NO pool</b>.<br />
              If HOLDS wins: each NO bettor splits the 3,100 {BET_TOKEN} YES pool proportionally.<br />
              <b>Early bettors move the line. Late bettors absorb risk.</b> The market finds truth.
            </div>
          </div>

          <div className="sold-flow">
            <span className="node">Snapshot at open</span>
            <span className="arr">▶</span>
            <span className="node">Stakes pool</span>
            <span className="arr">▶</span>
            <span className="node"><b>Alchemy</b> reads chain</span>
            <span className="arr">▶</span>
            <span className="node">DO alarm fires</span>
            <span className="arr">▶</span>
            <span className="node"><b>{BET_TOKEN} settles</b></span>
          </div>
        </div>
      </section>

      {/* ── ANSEM SECTION ── */}
      <section>
        <div className="wrap">
          <div className="eyebrow">The original suspect</div>
          <h2 className="sec-h">He posted the wallet. <span className="u">CT is watching.</span></h2>
          <p className="lead">
            Ansem's wallet holds 58.66% of the entire $ANSEM supply. He posted it publicly.
            Every move is permanently on-chain. The market just made the watching worth something.
          </p>
          <div className="sold-ansem-block">
            <div className="sold-ansem-stat">
              <span className="sold-ansem-stat-label">SUPPLY HELD</span>
              <span className="sold-ansem-stat-val">58.66%</span>
              <span className="sold-ansem-stat-sub">of 1B $ANSEM total</span>
            </div>
            <div className="sold-ansem-divider" />
            <div className="sold-ansem-stat">
              <span className="sold-ansem-stat-label">TOKENS</span>
              <span className="sold-ansem-stat-val">586.6M</span>
              <span className="sold-ansem-stat-sub">snapshot Jul 1, 2026</span>
            </div>
            <div className="sold-ansem-divider" />
            <div className="sold-ansem-body">
              <b>blknoiz06</b> is one of the most-followed traders on CT. He named the token after himself,
              deployed it on pump.fun, and posted the wallet. Every single transfer is public.
              The question the community has been asking since day one:
              <br /><br />
              <em style={{ color: 'var(--alarm)', fontStyle: 'normal', fontWeight: 700 }}>
                "Will he dump on us?"
              </em>
              <div className="sold-ansem-wallet">
                GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52
              </div>
            </div>
          </div>
          <span className="sold-big">
            The bet isn't on a price. It's on a person — and people are observable.
          </span>
        </div>
      </section>

      {/* ── EVIL ANSEM TEASER ── */}
      {!EVIL_TOKEN_LIVE && (
        <section className="sold-evil-section">
          <div className="wrap">
            <div className="sold-evil-inner">
              <div className="sold-evil-badge">⚡ COMING SOON</div>
              <div className="sold-evil-title">$EVIL ANSEM</div>
              <p className="sold-evil-body">
                The native betting token for WHO SOLD? is on its way.
                {BET_TOKEN} bets will migrate. Early participants get priority access.
                Follow for launch.
              </p>
              <div className="sold-evil-note">
                Currently using {BET_TOKEN} points for all bets. Token launch converts balances 1:1.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── LIVE WINDOW ── */}
      {liveWindow && (
        <section>
          <div className="wrap">
            <div className="eyebrow">Right now</div>
            <h2 className="sec-h">Window is <span className="u">open</span></h2>
            <div className="sold-live-strip">
              <span className="sold-live-dot" />
              <span className="sold-live-label">CLOSES IN</span>
              <span className="sold-live-countdown">{countdown}</span>
              <span className="sold-live-holders">
                {liveWindow.holders.length} suspects tracked · {liveWindow.windowId}
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

      {/* ── FOOTER ── */}
      <footer>
        <div className="wrap">
          <div className="marq">
            <span>
              ◉ WHO SOLD ◉ $ANSEM ◉ AIRDROP BETRAYAL MARKET ◉ ON-CHAIN ORACLE ◉ PARIMUTUEL ◉
              12H WINDOWS ◉ INDIVIDUAL PICKS ◉ BATCH COHORTS ◉ $EVIL ANSEM COMING ◉
              WHO RUGGED ◉ FIVE SUSPECTS ◉ ONE THIEF ◉ TEE-ATTESTED ◉ 0G NETWORK ◉
            </span>
          </div>
          <div className="links">
            <a href="#how">HOW IT WORKS</a>
            <a href="#moat">JOIN</a>
            <Link to="/sold/play">ENTER MARKET</Link>
            <Link to="/who-rugged" style={{ color: 'var(--cyan, #00d4ff)' }}>WHO RUGGED? →</Link>
          </div>
          <p className="fine">
            A prediction market on $ANSEM airdrop behavior. On-chain oracle via Alchemy + Solana.
            Built alongside WHO RUGGED? on 0G, 2026. $EVIL ANSEM token coming soon.
          </p>
        </div>
      </footer>

    </div>
  )
}
