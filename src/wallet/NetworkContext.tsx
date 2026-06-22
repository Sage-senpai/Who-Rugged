/* Which 0G network the app targets (testnet vs mainnet), persisted. The wallet
   reads this to know the right chain; switching here drives the wallet switch.
   Solo/practice play ignores it entirely (no tokens needed); it matters for
   playing with others on mainnet. */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_NETWORK, NETWORKS } from './chain'
import type { ChainConfig, NetworkId } from './chain'

const KEY = 'who-rugged:network'

function load(): NetworkId {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'testnet' || v === 'mainnet') return v
  } catch {
    /* default */
  }
  return DEFAULT_NETWORK
}

interface NetworkCtx {
  networkId: NetworkId
  chain: ChainConfig
  setNetwork: (id: NetworkId) => void
}

const Ctx = createContext<NetworkCtx | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networkId, setNetworkId] = useState<NetworkId>(load)

  const setNetwork = useCallback((id: NetworkId) => {
    setNetworkId(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* non-fatal */
    }
  }, [])

  const value = useMemo<NetworkCtx>(
    () => ({ networkId, chain: NETWORKS[networkId], setNetwork }),
    [networkId, setNetwork],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNetwork(): NetworkCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider')
  return ctx
}
