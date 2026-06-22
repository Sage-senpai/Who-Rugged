import { useEffect, useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { useWallet } from '../wallet/WalletContext'
import { useNetwork } from '../wallet/NetworkContext'
import { explorerAddress } from '../wallet/chain'
import { displayName, getUsername, setUsername, shortAddress } from '../wallet/identity'
import { playerSprite } from '../lib/avatar'
import { loadPlayer } from '../game/profile'
import { SKINS, getSkin, isUnlocked, setSkin, skinById } from '../cosmetics/skins'
import { listFriends, ping, requestFriend, respondFriend, socialConfigured } from '../social/socialClient'
import type { FriendRec, Named } from '../social/socialClient'
import { sfx } from '../lib/sfx'
import './menu.css'

export function Profile() {
  const w = useWallet()
  const net = useNetwork()
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

          <FriendsPanel address={w.address} />

          <section className="panel">
            <h2 className="panel-h">Network</h2>
            <div className="seg" role="radiogroup" aria-label="Network">
              <button
                type="button"
                role="radio"
                aria-checked={net.networkId === 'testnet'}
                className={`seg-btn ${net.networkId === 'testnet' ? 'active' : ''}`}
                onClick={() => { sfx.play('toggle'); net.setNetwork('testnet') }}
              >
                Testnet · Free
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={net.networkId === 'mainnet'}
                className={`seg-btn ${net.networkId === 'mainnet' ? 'active' : ''}`}
                onClick={() => { sfx.play('toggle'); net.setNetwork('mainnet') }}
              >
                Mainnet · Real
              </button>
            </div>
            <div className="danger-row" style={{ marginTop: 14 }}>
              <span className="dr-text">
                <span className="net-badge">{net.chain.isTestnet ? 'TESTNET' : 'MAINNET'}</span> {net.chain.name}
              </span>
              {w.rightChain ? (
                <span className="net-ok">● Connected</span>
              ) : (
                <button className="btn-danger" onClick={() => void w.switchNetwork()}>
                  Switch wallet to this network
                </button>
              )}
            </div>
            <p className="panel-note">
              Solo practice needs no tokens on any network. Playing with others uses the selected
              network, so use Mainnet for real tables.
            </p>
            {w.error && <p className="panel-note" style={{ color: 'var(--alarm)' }}>{w.error}</p>}
          </section>

          <section className="panel">
            <h2 className="panel-h">{net.chain.isTestnet ? 'Testnet balance' : 'Balance'}</h2>
            <div className="prof-row">
              <span className="prof-bal">
                {w.balance ?? '0.0000'} <b>{net.chain.currency.symbol}</b>
              </span>
              <button className="seg-btn" onClick={() => void w.refreshBalance()}>
                Refresh
              </button>
            </div>
            <div className="prof-links">
              {net.chain.isTestnet && net.chain.faucet && (
                <a className="btn btn-gold" href={net.chain.faucet} target="_blank" rel="noreferrer">
                  ◇ Get testnet 0G
                </a>
              )}
              <a className="btn btn-ghost" href={explorerAddress(net.chain, w.address)} target="_blank" rel="noreferrer">
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

function FriendsPanel({ address }: { address: string }) {
  const [rec, setRec] = useState<FriendRec>({ friends: [], incoming: [], outgoing: [] })
  const [online, setOnline] = useState<Named[]>([])
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const myName = getUsername(address) || shortAddress(address)

  const load = async () => {
    setRec(await listFriends(address))
    setOnline((await ping(address, myName)).online)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const add = async (to: string) => {
    const target = to.trim()
    if (!target || target.toLowerCase() === address.toLowerCase()) return
    setBusy(true)
    await requestFriend(address, myName, target)
    setAddr('')
    await load()
    setBusy(false)
    sfx.play('select')
  }
  const respond = async (requester: string, accept: boolean) => {
    setBusy(true)
    await respondFriend(requester, address, accept, myName)
    await load()
    setBusy(false)
    sfx.play('toggle')
  }

  if (!socialConfigured) {
    return (
      <section className="panel">
        <h2 className="panel-h">Friends</h2>
        <p className="panel-note" style={{ marginTop: 0 }}>
          Deploy the lobby worker and set <code>VITE_LOBBY_URL</code> to add friends and see who is
          online.
        </p>
      </section>
    )
  }

  const onlineAddrs = new Set(online.map((o) => o.addr.toLowerCase()))
  const friendAddrs = new Set(rec.friends.map((f) => f.addr.toLowerCase()))
  const others = online.filter(
    (o) => o.addr.toLowerCase() !== address.toLowerCase() && !friendAddrs.has(o.addr.toLowerCase()),
  )

  return (
    <section className="panel">
      <div className="lobby-bar">
        <h2 className="panel-h" style={{ margin: 0 }}>Friends</h2>
        <button className="seg-btn" onClick={() => void load()}>Refresh</button>
      </div>

      <label className="prof-label">Add by ID (wallet address)</label>
      <div className="prof-row">
        <input className="prof-input" value={addr} placeholder="0x..." onChange={(e) => setAddr(e.target.value)} />
        <button className="seg-btn" disabled={busy || addr.trim().length < 6} onClick={() => void add(addr)}>Add</button>
      </div>

      {rec.incoming.length > 0 && (
        <>
          <label className="prof-label">Requests</label>
          {rec.incoming.map((r) => (
            <div className="friend-row" key={r.addr}>
              <span className="fr-name">{r.name || shortAddress(r.addr)}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="seg-btn" disabled={busy} onClick={() => void respond(r.addr, true)}>Accept</button>
                <button className="btn-danger" disabled={busy} onClick={() => void respond(r.addr, false)}>✕</button>
              </span>
            </div>
          ))}
        </>
      )}

      <label className="prof-label">Your friends ({rec.friends.length})</label>
      {rec.friends.length === 0 ? (
        <p className="empty-note">No friends yet. Add someone by their ID, or from who is online below.</p>
      ) : (
        rec.friends.map((f) => (
          <div className="friend-row" key={f.addr}>
            <span className={`wdot ${onlineAddrs.has(f.addr.toLowerCase()) ? 'ok' : 'off'}`} />
            <span className="fr-name">{f.name || shortAddress(f.addr)}</span>
            <span className="fr-addr">{shortAddress(f.addr)}</span>
          </div>
        ))
      )}

      <label className="prof-label">Online now ({others.length})</label>
      {others.length === 0 ? (
        <p className="empty-note">Nobody else online right now.</p>
      ) : (
        others.map((o) => (
          <div className="friend-row" key={o.addr}>
            <span className="wdot ok" />
            <span className="fr-name">{o.name || shortAddress(o.addr)}</span>
            <button className="seg-btn" disabled={busy} onClick={() => void add(o.addr)}>Add</button>
          </div>
        ))
      )}
    </section>
  )
}
