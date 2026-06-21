/* 0G Galileo testnet network config. Defaults are from docs.0g.ai (verified
   2026-06-18); every field is overridable via .env so mainnet is a config
   change, not a code change. Testnet only for v1. */

const env = import.meta.env

export const OG_CHAIN = {
  id: Number(env.VITE_OG_CHAIN_ID ?? 16602),
  name: (env.VITE_OG_CHAIN_NAME as string) ?? '0G Galileo Testnet',
  rpcUrl: (env.VITE_RPC_URL as string) ?? 'https://evmrpc-testnet.0g.ai',
  currency: { name: '0G', symbol: (env.VITE_OG_CURRENCY_SYMBOL as string) ?? '0G', decimals: 18 },
  explorer: (env.VITE_OG_EXPLORER as string) ?? 'https://chainscan-galileo.0g.ai',
  faucet: (env.VITE_OG_FAUCET as string) ?? 'https://faucet.0g.ai',
  isTestnet: true,
} as const

/** Chain id as the 0x hex string the wallet RPC expects. */
export const OG_CHAIN_HEX = '0x' + OG_CHAIN.id.toString(16)

/** Params for wallet_addEthereumChain. */
export const ADD_CHAIN_PARAMS = {
  chainId: OG_CHAIN_HEX,
  chainName: OG_CHAIN.name,
  nativeCurrency: OG_CHAIN.currency,
  rpcUrls: [OG_CHAIN.rpcUrl],
  blockExplorerUrls: [OG_CHAIN.explorer],
}

export const explorerAddress = (addr: string) => `${OG_CHAIN.explorer}/address/${addr}`
