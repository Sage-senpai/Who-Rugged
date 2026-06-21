/* Minimal EIP-1193 provider typing for the injected wallet (MetaMask, etc.). */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on(event: string, handler: (...args: unknown[]) => void): void
  removeListener(event: string, handler: (...args: unknown[]) => void): void
  isMetaMask?: boolean
}

interface Window {
  ethereum?: Eip1193Provider
}
