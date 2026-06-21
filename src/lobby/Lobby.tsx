import { useEffect, useRef, useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { useWallet } from '../wallet/WalletContext'
import { getUsername, shortAddress } from '../wallet/identity'
import { spriteFor } from '../lib/avatar'
import { sfx } from '../lib/sfx'
import { LobbyClient, lobbyConfigured, randomCode } from './lobbyClient'
import type { ConnStatus, Room, Seat } from './lobbyClient'
import './lobby.css'

export function Lobby() {
  const w = useWallet()
  const address = w.address
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [conn, setConn] = useState<ConnStatus>('idle')
  const clientRef = useRef<LobbyClient | null>(null)

  useEffect(() => {
    if (!activeCode || !address) return
    const username = getUsername(address) || shortAddress(address)
    const client = new LobbyClient(activeCode, setRoom, (s) => {
      setConn(s)
      if (s === 'open') client.join(address, username)
    })
    clientRef.current = client
    client.connect()
    return () => {
      client.close()
      clientRef.current = null
    }
  }, [activeCode, address])

  const leave = () => {
    if (address) clientRef.current?.leave(address)
    clientRef.current?.close()
    setActiveCode(null)
    setRoom(null)
    setConn('idle')
  }

  const mySeat = room?.seats.find((s) => s.address === address)
  const isHost = !!room && room.hostAddress === address

  // ---- gates ----
  if (!lobbyConfigured) {
    return (
      <ScreenShell title="Multiplayer Lobby" sub="Real seats at the table." back={{ to: '/menu', label: '◀ Menu' }} showStats={false}>
        <section className="panel">
          <h2 className="panel-h">Server not configured</h2>
          <p className="panel-note" style={{ marginTop: 0 }}>
            The lobby runs on a Cloudflare Durable Object you deploy yourself. Deploy <code>server/</code>{' '}
            with <code>wrangler deploy</code>, then set <code>VITE_LOBBY_URL</code> to its wss URL and
            rebuild. Until then, play the Crowdfunding Courtroom solo, the AI fills every seat.
          </p>
        </section>
      </ScreenShell>
    )
  }

  if (w.status !== 'connected' || !address) {
    return (
      <ScreenShell title="Multiplayer Lobby" sub="Real seats at the table." back={{ to: '/menu', label: '◀ Menu' }} showStats={false}>
        <section className="panel">
          <h2 className="panel-h">Link a wallet to take a seat</h2>
          <p className="panel-note" style={{ marginTop: 0, marginBottom: 16 }}>
            Your wallet is your seat identity, so others can see who is at the table.
          </p>
          <button className="bigbtn" onClick={() => void w.connect()}>◇ Connect Wallet</button>
        </section>
      </ScreenShell>
    )
  }

  // ---- pre-room: create or join ----
  if (!activeCode) {
    return (
      <ScreenShell title="Multiplayer Lobby" sub="Create a table or join by code. AI fills empty seats." back={{ to: '/menu', label: '◀ Menu' }} showStats={false}>
        <section className="panel">
          <h2 className="panel-h">New table</h2>
          <p className="panel-note" style={{ marginTop: 0, marginBottom: 14 }}>Open a room and share the code. Up to six seats.</p>
          <button className="bigbtn" onClick={() => { sfx.play('select'); setActiveCode(randomCode()) }}>Create table ▶</button>
        </section>
        <section className="panel">
          <h2 className="panel-h">Join a table</h2>
          <div className="prof-row">
            <input
              className="prof-input"
              value={codeInput}
              maxLength={6}
              placeholder="ENTER CODE"
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <button className="seg-btn" disabled={codeInput.length < 4} onClick={() => { sfx.play('select'); setActiveCode(codeInput) }}>Join</button>
          </div>
        </section>
      </ScreenShell>
    )
  }

  // ---- in a room ----
  return (
    <ScreenShell title="Multiplayer Lobby" back={{ to: '/menu', label: '◀ Menu' }} showStats={false}>
      <section className="panel">
        <div className="lobby-bar">
          <div>
            <span className="panel-h" style={{ margin: 0 }}>TABLE CODE</span>
            <div className="lobby-code">{activeCode}</div>
          </div>
          <div className="lobby-status">
            <span className={`wdot ${conn === 'open' ? 'ok' : 'bad'}`} />{' '}
            {conn === 'open' ? 'Connected' : conn === 'connecting' ? 'Connecting…' : conn === 'error' ? 'Server unreachable' : 'Offline'}
          </div>
        </div>

        {room?.status === 'started' && (
          <div className="lobby-started">
            TABLE SEALED. Synchronized rounds over the socket land next, with 0G sealing the roles. For
            now the host drives a solo Courtroom while seats sync.
          </div>
        )}

        <div className="seat-grid">
          {(room?.seats ?? []).map((s) => (
            <SeatCard key={s.index} seat={s} youAddress={address} hostAddress={room?.hostAddress ?? null} isHost={isHost} onRemoveAI={(i) => clientRef.current?.removeAI(i)} />
          ))}
        </div>
      </section>

      <div className="bar">
        <p className="note">
          {isHost ? 'You host this table. Add AI agents or start when the room is set.' : 'Waiting for the host to start. Ready up when you are set.'}
        </p>
        <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => { sfx.play('toggle'); if (address && mySeat) clientRef.current?.setReady(address, !mySeat.ready) }}>
            {mySeat?.ready ? '✓ Ready' : 'Ready up'}
          </button>
          {isHost && <button className="btn btn-ghost" onClick={() => { sfx.play('select'); clientRef.current?.addAI() }}>+ Add AI</button>}
          {isHost && (
            <button className="bigbtn" disabled={room?.status === 'started'} onClick={() => { sfx.play('select'); if (address) clientRef.current?.start(address) }}>
              Start table ▶
            </button>
          )}
          <button className="btn btn-ghost" onClick={leave}>Leave</button>
        </span>
      </div>
    </ScreenShell>
  )
}

function SeatCard({ seat, youAddress, hostAddress, isHost, onRemoveAI }: {
  seat: Seat
  youAddress: string | null
  hostAddress: string | null
  isHost: boolean
  onRemoveAI: (index: number) => void
}) {
  const you = seat.kind === 'human' && seat.address === youAddress
  const host = seat.kind === 'human' && seat.address === hostAddress
  const label = seat.kind === 'empty' ? 'Empty seat' : seat.username || (seat.address ? shortAddress(seat.address) : 'Player')
  const seed = seat.address ?? `ai-${seat.index}`

  return (
    <div className={`seat ${seat.kind} ${you ? 'you' : ''}`}>
      {seat.kind === 'empty' ? (
        <div className="seat-empty">SEAT {seat.index + 1}</div>
      ) : (
        <>
          <div className="seat-mug"><img alt="" src={spriteFor(seed)} /></div>
          <div className="seat-name">{label}</div>
          <div className="seat-tags">
            {you && <span className="seat-tag you">YOU</span>}
            {host && <span className="seat-tag host">HOST</span>}
            {seat.kind === 'ai' && <span className="seat-tag ai">AI</span>}
            <span className={`seat-tag ${seat.ready ? 'ready' : 'wait'}`}>{seat.ready ? 'READY' : 'WAIT'}</span>
          </div>
          {isHost && seat.kind === 'ai' && (
            <button className="seat-remove" onClick={() => onRemoveAI(seat.index)} aria-label="Remove AI">✕</button>
          )}
        </>
      )}
    </div>
  )
}
