/* Minimal typing for injected Solana wallet providers (Phantom, Solflare).
   These expose a small, de-facto-standard surface we lean on directly rather
   than pulling in the full @solana/wallet-adapter dependency tree. */
interface SolanaPublicKey {
  toString(): string
  toBase58?(): string
}

interface SolanaProviderLike {
  isPhantomAF?: boolean
  isPhantom?: boolean
  isSolflare?: boolean
  publicKey?: SolanaPublicKey | null
  isConnected?: boolean
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: SolanaPublicKey }>
  disconnect(): Promise<void>
  on(event: 'connect' | 'disconnect' | 'accountChanged', handler: (arg?: SolanaPublicKey | null) => void): void
  removeListener(event: 'connect' | 'disconnect' | 'accountChanged', handler: (arg?: SolanaPublicKey | null) => void): void
}

interface Window {
  solana?: SolanaProviderLike
  solflare?: SolanaProviderLike
  phantom?: { solana?: SolanaProviderLike }
}
