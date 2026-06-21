import { useEffect, useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { useWallet } from '../wallet/WalletContext'
import { OG_CHAIN, explorerAddress } from '../wallet/chain'
import { displayName, getUsername, setUsername, shortAddress } from '../wallet/identity'
import { playerSprite } from '../lib/avatar'
import { loadPlayer } from '../game/profile'
import { SKINS, getSkin, isUnlocked, setSkin, skinById } from '../cosmetics/skins'
import { sfx } from '../lib/sfx'
import './menu.css'

export function Profile() {
  const w = useWallet()
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const elo = loadPlayer().elo
  const [skinId, setSkinId] = useState(() => getSkin(elo).id)

  useEffect(() => {
    if (w.address) setName(getUsername(w.address))
  }, [w.address])

  const pickSkin = (id: string) => {
    setSkin(id)
    setSkinId(id)
    sfx.play('toggle')
  }

  const copyId = async () => {
    if (!w.address) return
    try {
      await navigator.clipboard.writeText(w.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard may be blocked */
    }
  }

  const save = () => {
    if (!w.address) return
    setUsername(w.address, name)
    sfx.play('toggle')
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <ScreenShell title="Profile" sub="Your wallet, your ID, your testnet balance." back={{ to: '/menu', label: '◀ Menu' }} showStats={false}>
      {w.status === 'no-wallet' ? (
        <section className="panel">
          <h2 className="panel-h">No wallet detected</h2>
          <p className="panel-note" style={{ marginTop: 0 }}>
            Install a web3 wallet to link an identity and join pooled games.{' '}
            <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              Get MetaMask
            </a>
            . Until then the game plays fine without one.
          </p>
        </section>
      ) : w.status !== 'connected' || !w.address ? (
        <section className="panel">
          <h2 className="panel-h">Link your wallet</h2>
          <p className="panel-note" style={{ marginTop: 0, marginBottom: 16 }}>
            Connect to claim a unique ID, hold a testnet balance, and join crowdfunded
            tournaments later. Testnet only for now, no real funds.
          </p>
          {w.error && <p className="panel-note" style={{ color: 'var(--alarm)' }}>{w.error}</p>}
          <button className="bigbtn" onClick={() => void w.connect()} disabled={w.status === 'connecting'}>
            {w.status === 'connecting' ? 'Linking…' : '◇ Connect Wallet'}
          </button>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2 className="panel-h">Identity</h2>
            <div className="prof-head">
              <div className="prof-mug">
                <img alt="" src={playerSprite(w.address, skinById(skinId))} />
              </div>
              <div>
                <div className="prof-name">{displayName(w.address, name)}</div>
                <div className="prof-addr">{shortAddress(w.address)}</div>
              </div>
            </div>

            <label className="prof-label" htmlFor="uname">
              Username
            </label>
            <div className="prof-row">
              <input
                id="uname"
                className="prof-input"
                value={name}
                maxLength={20}
                placeholder="pick a handle"
                onChange={(e) => setName(e.target.value)}
              />
              <button className="seg-btn" onClick={save}>
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>

            <label className="prof-label">Your ID (others add you by this)</label>
            <div className="prof-row">
              <code className="prof-id">{w.address}</code>
              <button className="seg-btn" onClick={() => void copyId()}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="panel-note">Adding friends by ID arrives with the multiplayer lobby.</p>
          </section>

          <section className="panel">
            <h2 className="panel-h">Skin</h2>
            <div className="skin-grid">
              {SKINS.map((s) => {
                const unlocked = isUnlocked(s, elo)
                const active = s.id === skinId
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`skin-tile ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}`}
                    onClick={() => unlocked && pickSkin(s.id)}
                    disabled={!unlocked}
                    aria-pressed={active}
                    title={unlocked ? s.blurb : `Unlocks at rank ${s.rank}`}
                  >
                    <img alt="" src={playerSprite(w.address!, s)} />
                    <span className="skin-name">{s.name}</span>
                    {!unlocked && <span className="skin-lock">RANK {s.rank}</span>}
                  </button>
                )
              })}
            </div>
            <p className="panel-note">{skinById(skinId).blurb} Unlock more by climbing the rank.</p>
          </section>

          <section className="panel">
            <h2 className="panel-h">Network</h2>
            <div className="danger-row">
              <span className="dr-text">
                <span className="net-badge">TESTNET</span> {OG_CHAIN.name}
              </span>
              {w.rightChain ? (
                <span className="net-ok">● Connected</span>
              ) : (
                <button className="btn-danger" onClick={() => void w.switchNetwork()}>
                  Switch to 0G
                </button>
              )}
            </div>
            {w.error && <p className="panel-note" style={{ color: 'var(--alarm)' }}>{w.error}</p>}
          </section>

          <section className="panel">
            <h2 className="panel-h">Testnet balance</h2>
            <div className="prof-row">
              <span className="prof-bal">
                {w.balance ?? '0.0000'} <b>{OG_CHAIN.currency.symbol}</b>
              </span>
              <button className="seg-btn" onClick={() => void w.refreshBalance()}>
                Refresh
              </button>
            </div>
            <div className="prof-links">
              <a className="btn btn-gold" href={OG_CHAIN.faucet} target="_blank" rel="noreferrer">
                ◇ Get testnet 0G
              </a>
              <a className="btn btn-ghost" href={explorerAddress(w.address)} target="_blank" rel="noreferrer">
                View on explorer
              </a>
              <button className="btn btn-ghost" onClick={w.disconnect}>
                Disconnect
              </button>
            </div>
          </section>
        </>
      )}
    </ScreenShell>
  )
}
