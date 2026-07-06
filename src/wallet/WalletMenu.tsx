/* Unified wallet control for the WHO SOLD? side: connect either a Solana wallet
   (Phantom/Solflare) or a 0G/EVM wallet, keep both, and pick which is the
   active betting identity. Both live side by side per the product decision. */
import { useEffect, useRef, useState } from 'react'
import { useWallet } from './WalletContext'
import { useSolana } from './SolanaContext'
import { useIdentity } from './IdentityContext'
import { shortAddress } from './identity'
import { sfx } from '../lib/sfx'
import './wallet-menu.css'

export function WalletMenu() {
  const evm = useWallet()
  const sol = useSolana()
  const { active, preferred, prefer } = useIdentity()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const label = active
    ? `${active.kind === 'sol' ? '◎' : '⬡'} ${shortAddress(active.address)}`
    : '◇ Connect wallet'

  return (
    <div className="wm" ref={ref}>
      <button
        className={`wm-trigger${active ? ' on' : ''}`}
        onClick={() => { sfx.play('select'); setOpen((v) => !v) }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {active && <span className={`wm-dot ${active.kind}`} />}
        {label}
        <span className="wm-caret">▾</span>
      </button>

      {open && (
        <div className="wm-panel" role="menu">
          <div className="wm-panel-title">CHOOSE A WALLET</div>

          {/* ── Solana ── */}
          <WalletRow
            icon="◎"
            name="Solana"
            sub="Phantom · Solflare"
            accent="sol"
            status={sol.status}
            address={sol.address}
            isActive={active?.kind === 'sol'}
            isPreferred={preferred === 'sol'}
            onConnect={() => { sfx.play('select'); void sol.connect() }}
            onUse={() => prefer('sol')}
            onDisconnect={() => sol.disconnect()}
            noWalletHref="https://phantom.app/download"
          />

          {/* ── 0G / EVM ── */}
          <WalletRow
            icon="⬡"
            name="0G Network"
            sub="MetaMask · EVM"
            accent="evm"
            status={evm.status}
            address={evm.address}
            isActive={active?.kind === 'evm'}
            isPreferred={preferred === 'evm'}
            onConnect={() => { sfx.play('select'); void evm.connect() }}
            onUse={() => prefer('evm')}
            onDisconnect={() => evm.disconnect()}
            noWalletHref="https://metamask.io/download/"
          />

          <p className="wm-note">
            Both can stay connected. Your bets key to the <b>active</b> wallet.
          </p>
        </div>
      )}
    </div>
  )
}

interface RowProps {
  icon: string
  name: string
  sub: string
  accent: 'sol' | 'evm'
  status: string
  address: string | null
  isActive: boolean
  isPreferred: boolean
  onConnect: () => void
  onUse: () => void
  onDisconnect: () => void
  noWalletHref: string
}

function WalletRow({
  icon, name, sub, accent, status, address, isActive, onConnect, onUse, onDisconnect, noWalletHref,
}: RowProps) {
  const connected = status === 'connected' && !!address
  return (
    <div className={`wm-row wm-row--${accent}${isActive ? ' active' : ''}`}>
      <div className="wm-row-id">
        <span className="wm-row-icon">{icon}</span>
        <div className="wm-row-text">
          <span className="wm-row-name">
            {name}
            {isActive && <span className="wm-badge">ACTIVE</span>}
          </span>
          <span className="wm-row-sub">{connected ? shortAddress(address!) : sub}</span>
        </div>
      </div>

      <div className="wm-row-actions">
        {status === 'no-wallet' ? (
          <a className="wm-btn ghost" href={noWalletHref} target="_blank" rel="noreferrer">Install</a>
        ) : connected ? (
          <>
            {!isActive && <button className="wm-btn use" onClick={onUse}>Use</button>}
            <button className="wm-btn ghost" onClick={onDisconnect} title="Disconnect">✕</button>
          </>
        ) : (
          <button className="wm-btn connect" disabled={status === 'connecting'} onClick={onConnect}>
            {status === 'connecting' ? '…' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  )
}
