import { useState } from 'react'

interface Props {
  onRegister: (wallet: string, handle: string) => Promise<{ ok: boolean; error?: string; balance?: number; eligible?: boolean; minRequired?: number }>
  connected: boolean
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}k`
    : n.toFixed(0)
}

export function WalletRegister({ onRegister, connected }: Props) {
  const [wallet, setWallet] = useState('')
  const [handle, setHandle] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState<{ text: string; balance?: number; minRequired?: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.trim()) return
    setState('checking')
    setMsg(null)

    const result = await onRegister(wallet.trim(), handle.trim())

    if (result.ok) {
      setState('success')
      setMsg({ text: result.error === 'already-registered' ? 'Already tracked — you\'re in the next window.' : `Registered! Balance: ${fmt(result.balance ?? 0)} $ANSEM` })
    } else if (result.error === 'insufficient-balance') {
      setState('error')
      setMsg({
        text: `Balance too low. Need ${fmt(result.minRequired ?? 0)} $ANSEM minimum.`,
        balance: result.balance,
        minRequired: result.minRequired,
      })
    } else if (result.error === 'oracle-unavailable') {
      setState('error')
      setMsg({ text: 'Oracle unavailable — try again shortly.' })
    } else {
      setState('error')
      setMsg({ text: result.error ?? 'Registration failed.' })
    }
  }

  if (!connected) {
    return (
      <div className="sold-register-wrap">
        <p className="sold-register-notice">Connect your 0G wallet first to register your Solana address.</p>
      </div>
    )
  }

  return (
    <div className="sold-register-wrap">
      <p className="sold-register-desc">
        Hold ≥ 100k $ANSEM? Add your Solana wallet to be tracked — the community will bet on whether you sell.
      </p>

      <form className="sold-register-form" onSubmit={handleSubmit}>
        <label className="sold-register-label">
          <span>Solana wallet address</span>
          <input
            className="sold-register-input"
            type="text"
            placeholder="Base58 address (44 chars)"
            value={wallet}
            onChange={(e) => { setWallet(e.target.value); setState('idle'); setMsg(null) }}
            disabled={state === 'checking' || state === 'success'}
            spellCheck={false}
          />
        </label>

        <label className="sold-register-label">
          <span>Handle <span className="sold-register-optional">(optional — defaults to Whale_xxxxxx)</span></span>
          <input
            className="sold-register-input"
            type="text"
            placeholder="e.g. cryptowhizz"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={state === 'checking' || state === 'success'}
          />
        </label>

        {state !== 'success' && (
          <button
            className="sold-register-submit"
            type="submit"
            disabled={!wallet.trim() || state === 'checking'}
          >
            {state === 'checking' ? 'CHECKING BALANCE…' : 'REGISTER WALLET'}
          </button>
        )}
      </form>

      {msg && (
        <p className={`sold-register-status sold-register-status--${state}`}>
          {msg.text}
          {msg.balance !== undefined && state === 'error' && (
            <span className="sold-register-balance"> (you hold {fmt(msg.balance)} $ANSEM)</span>
          )}
        </p>
      )}

      <p className="sold-register-note">
        Your wallet is tracked read-only — we only read your $ANSEM balance, nothing is moved. Minimum holding: 100k $ANSEM.
      </p>
    </div>
  )
}
