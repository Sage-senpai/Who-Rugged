/* Solana wallet connection over the injected provider (Phantom / Solflare).
   Read-only for now: we take the public key as the predictor identity on the
   WHO SOLD? side. No @solana/web3.js needed — the injected provider gives us
   the address and connect/disconnect, which is all the market keys on. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type SolStatus = 'no-wallet' | 'disconnected' | 'connecting' | 'connected'
export type SolWalletKind = 'phantom' | 'solflare' | 'unknown'

const OFF_KEY = 'who-sold:sol-off'

interface SolCtx {
  status: SolStatus
  address: string | null
  walletKind: SolWalletKind
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const Ctx = createContext<SolCtx | null>(null)

function detectProvider(): { provider: SolanaProviderLike | null; kind: SolWalletKind } {
  if (typeof window === 'undefined') return { provider: null, kind: 'unknown' }
  const phantom = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined)
  if (phantom) return { provider: phantom, kind: 'phantom' }
  if (window.solflare?.isSolflare) return { provider: window.solflare, kind: 'solflare' }
  if (window.solana) return { provider: window.solana, kind: window.solana.isSolflare ? 'solflare' : 'unknown' }
  return { provider: null, kind: 'unknown' }
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SolStatus>('disconnected')
  const [address, setAddress] = useState<string | null>(null)
  const [walletKind, setWalletKind] = useState<SolWalletKind>('unknown')
  const [error, setError] = useState<string | null>(null)

  // init: detect provider, silently restore a trusted session unless dismissed
  useEffect(() => {
    const { provider, kind } = detectProvider()
    if (!provider) {
      setStatus('no-wallet')
      return
    }
    setWalletKind(kind)

    let active = true
    const off = (() => {
      try { return localStorage.getItem(OFF_KEY) === '1' } catch { return false }
    })()

    if (!off) {
      void provider
        .connect({ onlyIfTrusted: true })
        .then(({ publicKey }) => {
          if (active && publicKey) { setAddress(publicKey.toString()); setStatus('connected') }
        })
        .catch(() => { /* not previously trusted — stay disconnected */ })
    }

    const onConnect = (pk?: SolanaPublicKey | null) => {
      const key = pk ?? provider.publicKey
      if (key) { setAddress(key.toString()); setStatus('connected') }
    }
    const onDisconnect = () => { setAddress(null); setStatus('disconnected') }
    const onAccountChanged = (pk?: SolanaPublicKey | null) => {
      if (pk) { setAddress(pk.toString()); setStatus('connected') }
      else { setAddress(null); setStatus('disconnected') }
    }

    provider.on('connect', onConnect)
    provider.on('disconnect', onDisconnect)
    provider.on('accountChanged', onAccountChanged)
    return () => {
      active = false
      provider.removeListener('connect', onConnect)
      provider.removeListener('disconnect', onDisconnect)
      provider.removeListener('accountChanged', onAccountChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    const { provider, kind } = detectProvider()
    if (!provider) { setStatus('no-wallet'); return }
    setWalletKind(kind)
    setStatus('connecting')
    setError(null)
    try {
      const { publicKey } = await provider.connect()
      try { localStorage.removeItem(OFF_KEY) } catch { /* non-fatal */ }
      setAddress(publicKey.toString())
      setStatus('connected')
    } catch {
      setError('Connection cancelled. Approve the request in your Solana wallet to link it.')
      setStatus('disconnected')
    }
  }, [])

  const disconnect = useCallback(() => {
    try { localStorage.setItem(OFF_KEY, '1') } catch { /* non-fatal */ }
    const { provider } = detectProvider()
    void provider?.disconnect().catch(() => {})
    setAddress(null)
    setStatus('disconnected')
  }, [])

  const value = useMemo<SolCtx>(
    () => ({ status, address, walletKind, error, connect, disconnect }),
    [status, address, walletKind, error, connect, disconnect],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSolana(): SolCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSolana must be used within SolanaProvider')
  return ctx
}
