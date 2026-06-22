import { useEffect } from 'react'
import { useWallet } from '../wallet/WalletContext'
import { getUsername, shortAddress } from '../wallet/identity'
import { ping, socialConfigured } from './socialClient'

/* Keeps the player marked online app-wide while their wallet is connected.
   Renders nothing. A heartbeat every 30s; presence expires server-side after
   60s of silence. */
export function PresenceBeacon() {
  const { address, status } = useWallet()
  useEffect(() => {
    if (!socialConfigured || status !== 'connected' || !address) return
    const name = getUsername(address) || shortAddress(address)
    void ping(address, name)
    const id = window.setInterval(() => void ping(address, name), 30_000)
    return () => window.clearInterval(id)
  }, [address, status])
  return null
}
