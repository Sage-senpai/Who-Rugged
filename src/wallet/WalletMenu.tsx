/* Solana wallet control for the WHO SOLD? side. Who Sold is Solana-only — the
   airdrop, the wallets, and the oracle all live on Solana — so this connects
   Phantom/Solflare and nothing else. (WHO RUGGED? keeps its own 0G wallet.) */
import { useEffect, useRef, useState } from 'react'
import { useSolana } from './SolanaContext'
import { shortAddress } from './identity'
import { sfx } from '../lib/sfx'
import './wallet-menu.css'

export function WalletMenu() {
  const { status, address, connect, disconnect } = useSolana()
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

  if (status === 'no-wallet') {
    return (
      <a className="wm-trigger" href="https://phantom.app/download" target="_blank" rel="noreferrer">
        ◎ Get a Solana wallet
      </a>
    )
  }

  if (status === 'connected' && address) {
    return (
      <div className="wm" ref={ref}>
        <button
          className="wm-trigger on"
          onClick={() => { sfx.play('select'); setOpen((v) => !v) }}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="wm-dot sol" />
          ◎ {shortAddress(address)}
          <span className="wm-caret">▾</span>
        </button>
        {open && (
          <div className="wm-panel wm-panel--sol" role="menu">
            <div className="wm-panel-title">SOLANA WALLET</div>
            <div className="wm-mini-addr">{address}</div>
            <button className="wm-btn ghost wm-disc" onClick={() => { disconnect(); setOpen(false) }}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className="wm-trigger"
      disabled={status === 'connecting'}
      onClick={() => { sfx.play('select'); void connect() }}
    >
      ◎ {status === 'connecting' ? 'Connecting…' : 'Connect Solana'}
    </button>
  )
}
