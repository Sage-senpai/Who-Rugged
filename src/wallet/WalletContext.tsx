/* Wallet connection over the injected EIP-1193 provider (MetaMask et al.) with
   ethers v6 for balance reads. ethers is dynamically imported so screens that
   never touch the wallet do not pay for it. Testnet only for v1. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addChainParams, chainHex } from './chain'
import { useNetwork } from './NetworkContext'

export type WalletStatus = 'no-wallet' | 'disconnected' | 'connecting' | 'connected'

const OFF_KEY = 'who-rugged:wallet-off'

interface WalletCtx {
  status: WalletStatus
  address: string | null
  chainId: number | null
  balance: string | null
  error: string | null
  rightChain: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const Ctx = createContext<WalletCtx | null>(null)

function parseChainId(hex: unknown): number | null {
  if (typeof hex === 'string') return parseInt(hex, 16)
  if (typeof hex === 'number') return hex
  return null
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { chain } = useNetwork()
  const [status, setStatus] = useState<WalletStatus>('disconnected')
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshBalanceFor = useCallback(async (addr: string) => {
    if (!window.ethereum) return
    try {
      const { BrowserProvider, formatEther } = await import('ethers')
      const provider = new BrowserProvider(
        window.ethereum as unknown as ConstructorParameters<typeof BrowserProvider>[0],
      )
      const bal = await provider.getBalance(addr)
      setBalance(Number(formatEther(bal)).toFixed(4))
    } catch {
      setBalance(null)
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    if (address) await refreshBalanceFor(address)
  }, [address, refreshBalanceFor])

  // init: detect wallet, restore an existing authorization unless dismissed
  useEffect(() => {
    const eth = window.ethereum
    if (!eth) {
      setStatus('no-wallet')
      return
    }

    let active = true
    const off = (() => {
      try {
        return localStorage.getItem(OFF_KEY) === '1'
      } catch {
        return false
      }
    })()

    void (async () => {
      try {
        const cid = parseChainId(await eth.request({ method: 'eth_chainId' }))
        if (active) setChainId(cid)
        if (off) return
        const accounts = (await eth.request({ method: 'eth_accounts' })) as string[]
        if (active && accounts?.length) {
          setAddress(accounts[0])
          setStatus('connected')
          void refreshBalanceFor(accounts[0])
        }
      } catch {
        /* leave disconnected */
      }
    })()

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (!accounts?.length) {
        setAddress(null)
        setBalance(null)
        setStatus('disconnected')
      } else {
        setAddress(accounts[0])
        setStatus('connected')
        void refreshBalanceFor(accounts[0])
      }
    }
    const onChain = (...args: unknown[]) => {
      const cid = parseChainId(args[0])
      setChainId(cid)
      setAddress((a) => {
        if (a) void refreshBalanceFor(a)
        return a
      })
    }

    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      active = false
      eth.removeListener('accountsChanged', onAccounts)
      eth.removeListener('chainChanged', onChain)
    }
  }, [refreshBalanceFor])

  const connect = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) {
      setStatus('no-wallet')
      return
    }
    setStatus('connecting')
    setError(null)
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      const cid = parseChainId(await eth.request({ method: 'eth_chainId' }))
      try {
        localStorage.removeItem(OFF_KEY)
      } catch {
        /* non-fatal */
      }
      setAddress(accounts[0])
      setChainId(cid)
      setStatus('connected')
      void refreshBalanceFor(accounts[0])
    } catch {
      setError('Connection cancelled. Approve the request in your wallet to link it.')
      setStatus('disconnected')
    }
  }, [refreshBalanceFor])

  const disconnect = useCallback(() => {
    try {
      localStorage.setItem(OFF_KEY, '1')
    } catch {
      /* non-fatal */
    }
    setAddress(null)
    setBalance(null)
    setStatus('disconnected')
  }, [])

  const switchNetwork = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) return
    setError(null)
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex(chain.id) }] })
    } catch (e) {
      // 4902: chain not added yet, add it then it becomes current
      const code = (e as { code?: number })?.code
      if (code === 4902) {
        try {
          await eth.request({ method: 'wallet_addEthereumChain', params: [addChainParams(chain)] })
        } catch {
          setError('Could not add the 0G network. Add it manually from your wallet.')
        }
      } else {
        setError('Network switch cancelled.')
      }
    }
  }, [chain])

  const value = useMemo<WalletCtx>(
    () => ({
      status,
      address,
      chainId,
      balance,
      error,
      rightChain: chainId === chain.id,
      connect,
      disconnect,
      switchNetwork,
      refreshBalance,
    }),
    [status, address, chainId, balance, error, chain, connect, disconnect, switchNetwork, refreshBalance],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWallet(): WalletCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
