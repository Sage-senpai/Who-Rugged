/* 0G network configs. Two networks: Galileo testnet (free play, faucet tokens)
   and Aristotle mainnet (real, for playing with others). Values verified from
   docs.0g.ai (2026-06-22); all overridable via .env so endpoints can change
   without a code change. The selected network is held in NetworkContext. */

export type NetworkId = 'testnet' | 'mainnet'

export interface ChainConfig {
  networkId: NetworkId
  id: number
  name: string
  rpcUrl: string
  currency: { name: string; symbol: string; decimals: number }
  explorer: string
  faucet?: string
  isTestnet: boolean
}

const env = import.meta.env

export const NETWORKS: Record<NetworkId, ChainConfig> = {
  testnet: {
    networkId: 'testnet',
    id: Number(env.VITE_OG_CHAIN_ID ?? 16602),
    name: (env.VITE_OG_CHAIN_NAME as string) ?? '0G Galileo Testnet',
    rpcUrl: (env.VITE_RPC_URL as string) ?? 'https://evmrpc-testnet.0g.ai',
    currency: { name: '0G', symbol: (env.VITE_OG_CURRENCY_SYMBOL as string) ?? '0G', decimals: 18 },
    explorer: (env.VITE_OG_EXPLORER as string) ?? 'https://chainscan-galileo.0g.ai',
    faucet: (env.VITE_OG_FAUCET as string) ?? 'https://faucet.0g.ai',
    isTestnet: true,
  },
  mainnet: {
    networkId: 'mainnet',
    id: Number(env.VITE_OG_MAINNET_CHAIN_ID ?? 16661),
    name: (env.VITE_OG_MAINNET_NAME as string) ?? '0G Aristotle Mainnet',
    rpcUrl: (env.VITE_OG_MAINNET_RPC as string) ?? 'https://evmrpc.0g.ai',
    currency: { name: '0G', symbol: '0G', decimals: 18 },
    explorer: (env.VITE_OG_MAINNET_EXPLORER as string) ?? 'https://chainscan.0g.ai',
    isTestnet: false,
  },
}

export const DEFAULT_NETWORK: NetworkId = (env.VITE_DEFAULT_NETWORK as NetworkId) ?? 'testnet'

export const chainHex = (id: number): string => '0x' + id.toString(16)

export const addChainParams = (c: ChainConfig) => ({
  chainId: chainHex(c.id),
  chainName: c.name,
  nativeCurrency: c.currency,
  rpcUrls: [c.rpcUrl],
  blockExplorerUrls: [c.explorer],
})

export const explorerAddress = (c: ChainConfig, addr: string) => `${c.explorer}/address/${addr}`
