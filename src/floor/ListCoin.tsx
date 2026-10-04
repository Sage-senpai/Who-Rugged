/* The "open a community table" form. One component for the 3D listing panel
   and the flat map, so the wording and the error handling cannot drift. */
import { useId, useState } from 'react'
import { communityConfigured, listCoin, LIST_ERRORS, type CommunityTable, type ListError } from '../sold/arena/communityClient'
import { MINT_RE } from '../sold/arena/arenas'
import './listcoin.css'

interface Props {
  open: number
  cap: number
  ttlDays: number
  onListed: (table: CommunityTable, created: boolean) => void
}

export function ListCoinForm({ open, cap, ttlDays, onListed }: Props) {
  const id = useId()
  const [mint, setMint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ListError | null>(null)

  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (t) { setMint(t); setError(null) }
    } catch { /* clipboard blocked: the player can still paste by hand */ }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await listCoin(mint)
    setBusy(false)
    if (res.ok) { setMint(''); onListed(res.table, res.created) }
    else setError(res.error)
  }

  const shaped = MINT_RE.test(mint.trim())
  const full = open >= cap

  return (
    <form className="fl-list" onSubmit={submit}>
      <label htmlFor={id} className="fl-list-label">Solana token address</label>
      <div className="fl-list-row">
        <input
          id={id}
          className="fl-list-input"
          value={mint}
          onChange={(e) => { setMint(e.target.value); setError(null) }}
          placeholder="Paste a mint address"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={busy || !communityConfigured}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-msg`}
        />
        <button type="button" className="arena-btn arena-btn-ghost fl-sm" onClick={paste} disabled={busy || !communityConfigured}>Paste</button>
      </div>
      <p id={`${id}-msg`} className={`fl-list-msg${error ? ' fl-list-err' : ''}`} role={error ? 'alert' : undefined}>
        {!communityConfigured
          ? LIST_ERRORS.offline
          : busy
            ? 'Checking the token on-chain…'
            : error
              ? LIST_ERRORS[error]
              : full
                ? LIST_ERRORS.full
                : `We check it on-chain, then open a table anyone can sit at. ${open} of ${cap} community tables are open, and idle ones close after ${ttlDays} days.`}
      </p>
      <button type="submit" className="arena-btn arena-btn-primary arena-btn-block" disabled={busy || !shaped || full || !communityConfigured}>
        {busy ? 'Checking…' : 'Open the table'}
      </button>
      <p className="fl-list-fine">Listing a coin is not an endorsement. Tables read real holder wallets and play with points.</p>
    </form>
  )
}
