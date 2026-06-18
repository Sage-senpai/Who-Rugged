import { Link } from 'react-router-dom'
import { Lineup } from './Lineup'
import './landing.css'

export function Landing() {
  return (
    <div className="landing-view">
      <div className="hud">
        <div className="wrap">
          <span className="b gold">
            SCORE <i>08,500</i>
          </span>
          <span className="b">
            VAULT <i>1,000 $GG</i>
          </span>
          <span className="b">
            SUSPECTS <i>5</i>
          </span>
          <span className="b alarm">THIEF ???</span>
          <span className="coin">◉ INSERT COIN</span>
        </div>
      </div>

      <header id="main">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">0G Zero Cup // Entry No.001</div>
              <h1 className="logo">
                WHO
                <br />
                RUGGED<span className="q">?</span>
              </h1>
              <p className="tag">
                Five suspects. One drained the vault. <b>You are the cop who has to catch them.</b>
              </p>
              <p className="sub">
                A social deduction game that can prove it never cheated. The roles are sealed inside
                a hardware enclave, the pot lives on-chain, and the whole round is yours to verify.
              </p>
              <div className="cta">
                <Link className="btn btn-gold" to="/menu">
                  ▶ Press Start
                </Link>
                <a className="btn btn-ghost" href="#play">
                  How it works
                </a>
              </div>
            </div>

            <Lineup />
          </div>
        </div>
      </header>

      {/* PREMISE */}
      <section id="play">
        <div className="wrap">
          <div className="eyebrow">The job</div>
          <h2 className="sec-h">
            Read the room. Make the <span className="u">arrest</span>.
          </h2>
          <p className="lead">
            Everyone at the table has a hidden profession. One is the Thief. You get statements, a
            couple of interrogations, and one shot to call it.
          </p>
          <div className="three">
            <div className="ico-card">
              <div className="ic">✦</div>
              <h4>Hidden roles</h4>
              <p>Doctor, Lawyer, Technician, DevRel, Community Builder. One of them flipped the vault.</p>
            </div>
            <div className="ico-card">
              <div className="ic">◎</div>
              <h4>Read and probe</h4>
              <p>Statements lie. Interrogations give a noisy read, never the answer. Privacy is the point.</p>
            </div>
            <div className="ico-card">
              <div className="ic">⚖</div>
              <h4>High stakes</h4>
              <p>Right call recovers the vault. Wrong call, the accused sues and the thief walks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section>
        <div className="wrap">
          <div className="eyebrow">One round</div>
          <h2 className="sec-h">Four beats, two minutes</h2>
          <div className="steps">
            <div className="step">
              <div className="no">01</div>
              <h4>Read</h4>
              <p>Each suspect speaks. The thief deflects. A baiter acts guilty on purpose.</p>
            </div>
            <div className="step">
              <div className="no">02</div>
              <h4>Probe</h4>
              <p>Spend an interrogation for a sealed, TEE-attested suspicion read.</p>
            </div>
            <div className="step">
              <div className="no">03</div>
              <h4>Accuse</h4>
              <p>Lock one suspect. Your bond is now on the line.</p>
            </div>
            <div className="step">
              <div className="no">04</div>
              <h4>Reveal</h4>
              <p>Seals break into attestations. The pot settles on-chain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TWIST */}
      <section>
        <div className="wrap">
          <div className="twist">
            <div className="eyebrow">The twist nobody else has</div>
            <h3>An innocent can act guilty on purpose.</h3>
            <p>
              A wrong arrest pays the accused. So innocents have a reason to bait you, perform guilt,
              and farm the lawsuit. The thief hides inside a crowd that is all faking it. Your staked
              bond is what makes every accusation a real gamble.
            </p>
            <span className="big">It is poker bluffing welded onto social deduction.</span>
          </div>
        </div>
      </section>

      {/* 0G + how this uses 0G */}
      <section id="og">
        <div className="wrap">
          <div className="eyebrow">Why it can't cheat</div>
          <h2 className="sec-h">
            Built on <span className="u">0G</span>, not a server you have to trust
          </h2>
          <p className="lead">
            A money game lives or dies on fairness. Here you do not take our word for it, the
            hardware proves it. Three layers, each load-bearing.
          </p>
          <div className="chips">
            <div className="chip">
              <div className="lab">CHIP 01 · COMPUTE</div>
              <h4>The Seal</h4>
              <p>Roles and every AI suspect's reasoning run inside a TEE. Nobody, including us, can see or fake who the thief is.</p>
              <div className="ingame">In game: <b>Sealing roles</b> and the suspicion <b>Scan</b>.</div>
              <span className="badge">TEE attested</span>
            </div>
            <div className="chip">
              <div className="lab">CHIP 02 · CHAIN</div>
              <h4>The Vault</h4>
              <p>The pot, your bond, lawsuit damages, and rewards settle on-chain. Anyone can audit the payout.</p>
              <div className="ingame">In game: the <b>verdict ledger</b> and your <b>rank</b>.</div>
              <span className="badge">On-chain</span>
            </div>
            <div className="chip">
              <div className="lab">CHIP 03 · STORAGE</div>
              <h4>The Tape</h4>
              <p>Every case is saved as a verifiable replay, and the agents remember how you played them last time.</p>
              <div className="ingame">In game: the <b>verifiable replay</b> id at reveal.</div>
              <span className="badge">User owned</span>
            </div>
          </div>

          <div className="flow" aria-label="Trust flow">
            <span className="node">
              Roles sealed in <b>TEE</b>
            </span>
            <span className="arr">▶</span>
            <span className="node">Signed by the enclave key</span>
            <span className="arr">▶</span>
            <span className="node">Attestation proves no peek</span>
            <span className="arr">▶</span>
            <span className="node">
              Pot settles <b>on-chain</b>
            </span>
          </div>

          <p className="scope">
            Honest scope for v1: attestation checks and payout authorization run in a trusted
            off-chain resolver, decentralized in v2. We document this rather than fake it.
          </p>
        </div>
      </section>

      {/* UI KIT */}
      <section id="kit">
        <div className="wrap">
          <div className="eyebrow">Insert coin // UI kit</div>
          <h2 className="sec-h">The component set</h2>
          <p className="lead">
            The reusable pieces, in the cartridge style. These are the same tokens the game build
            ships with, so the look stays consistent.
          </p>
          <div className="kit">
            <div className="kit-grid">
              <div className="kit-box">
                <div className="kl">BUTTONS</div>
                <div className="btnrow">
                  <button className="btn btn-gold">Press Start</button>
                  <button className="btn btn-cyan">Interrogate</button>
                  <button className="btn btn-ghost">Accuse</button>
                </div>
              </div>
              <div className="kit-box">
                <div className="kl">SUSPICION METER</div>
                <div className="meter-lab">
                  <span>SUSPICION READ</span>
                  <span>62%</span>
                </div>
                <div className="meter">
                  <i />
                </div>
              </div>
              <div className="kit-box">
                <div className="kl">SEAL → VERIFIED</div>
                <span className="stamp sealed">● Sealed · TEE</span>{' '}
                <span className="stamp verified">✓ Verified</span>
              </div>
              <div className="kit-box">
                <div className="kl">VERDICT LEDGER</div>
                <div className="ledger">
                  <div className="r">
                    <span>Vault recovered</span>
                    <span className="pos">+350 $GG</span>
                  </div>
                  <div className="r">
                    <span>State bounty</span>
                    <span className="pos">+120 $GG</span>
                  </div>
                  <div className="r">
                    <span>Net</span>
                    <span className="pos">+470 $GG</span>
                  </div>
                </div>
              </div>
              <div className="kit-box">
                <div className="kl">BADGES</div>
                <div className="badges">
                  <span className="tagb cop">COP</span>
                  <span className="tagb loot">LOOT</span>
                  <span className="tagb thief">RUGGED</span>
                </div>
              </div>
              <div className="kit-box">
                <div className="kl">PALETTE · MEANING</div>
                <div className="swatches">
                  <div className="sw" style={{ background: 'var(--sky)' }} title="cop" />
                  <div className="sw" style={{ background: 'var(--gold)' }} title="loot" />
                  <div className="sw" style={{ background: 'var(--alarm)' }} title="thief" />
                  <div className="sw" style={{ background: 'var(--lime)' }} title="verified" />
                  <div className="sw" style={{ background: 'var(--cyan)' }} title="scan" />
                  <div className="sw" style={{ background: 'var(--void-2)' }} title="night" />
                </div>
              </div>
            </div>
          </div>

          <div className="cta" style={{ marginTop: 26 }}>
            <Link className="btn btn-gold" to="/menu">
              ▶ Press Start
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="marq">
            <span>
              ◉ INSERT COIN ◉ WHO RUGGED ◉ FIVE SUSPECTS ◉ ONE THIEF ◉ ZERO TRUST ◉ PROVE IT ◉
              INSERT COIN ◉ WHO RUGGED ◉ FIVE SUSPECTS ◉ ONE THIEF ◉
            </span>
          </div>
          <div className="links">
            <a href="#play">HOW IT WORKS</a>
            <a href="#og">WHY 0G</a>
            <a href="#kit">UI KIT</a>
            <Link to="/menu">PLAY</Link>
          </div>
          <p className="fine">
            A crime-deduction game on 0G. Built for the Zero Cup, 2026. Not actually from 1986.
          </p>
        </div>
      </footer>
    </div>
  )
}
