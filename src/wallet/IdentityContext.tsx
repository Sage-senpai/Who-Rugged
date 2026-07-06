/* Unified predictor identity across both chains. Both wallets can be connected
   at once (per product decision: "Solana alongside 0G everywhere"). The active
   identity is the one the user last chose; connecting a wallet with no prior
   preference adopts it. Bets on WHO SOLD? key to whichever identity is active. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useWallet } from './WalletContext'
import { useSolana } from './SolanaContext'

export type ChainKind = 'evm' | 'sol'

export interface Identity {
  address: string
  kind: ChainKind
}

interface IdentityCtx {
  /** The active betting identity, or null if neither wallet is connected. */
  active: Identity | null
  /** Convenience: the active address (predictor key) or null. */
  address: string | null
  evmAddress: string | null
  solAddress: string | null
  preferred: ChainKind
  /** Choose which connected wallet acts as the identity. */
  prefer: (kind: ChainKind) => void
}

const PREF_KEY = 'who-sold:pref-chain'
const Ctx = createContext<IdentityCtx | null>(null)

function loadPref(): ChainKind {
  try {
    const v = localStorage.getItem(PREF_KEY)
    if (v === 'evm' || v === 'sol') return v
  } catch { /* default */ }
  return 'sol'
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { address: evmAddress } = useWallet()
  const { address: solAddress } = useSolana()
  const [preferred, setPreferred] = useState<ChainKind>(loadPref)

  const prefer = useCallback((kind: ChainKind) => {
    setPreferred(kind)
    try { localStorage.setItem(PREF_KEY, kind) } catch { /* non-fatal */ }
  }, [])

  // Adopt a wallet automatically when it's the only one connected, so the user
  // never has a connected wallet that isn't the active identity.
  useEffect(() => {
    if (preferred === 'sol' && !solAddress && evmAddress) prefer('evm')
    if (preferred === 'evm' && !evmAddress && solAddress) prefer('sol')
  }, [preferred, evmAddress, solAddress, prefer])

  const active = useMemo<Identity | null>(() => {
    const evm = evmAddress ? ({ address: evmAddress, kind: 'evm' as const }) : null
    const sol = solAddress ? ({ address: solAddress, kind: 'sol' as const }) : null
    if (preferred === 'sol') return sol ?? evm
    return evm ?? sol
  }, [evmAddress, solAddress, preferred])

  const value = useMemo<IdentityCtx>(
    () => ({
      active,
      address: active?.address ?? null,
      evmAddress: evmAddress ?? null,
      solAddress: solAddress ?? null,
      preferred,
      prefer,
    }),
    [active, evmAddress, solAddress, preferred, prefer],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useIdentity(): IdentityCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
