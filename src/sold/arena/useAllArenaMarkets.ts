/* One useMarkets() call per live arena. Each arena needs its own call, since a
   shared one would leak one arena's numbers onto another's tile, and the rules
   of hooks forbid calling a hook in a loop, so this is explicit rather than
   generic. Shared by the 2D arena list and the 3D floor so the two always show
   the same numbers. Keep the ids in step with LIVE_ARENAS in arenas.ts. */
import { useMemo } from 'react'
import { useSolana } from '../../wallet/SolanaContext'
import { useMarkets, type UseMarketsReturn } from '../market/useMarkets'

export function useAllArenaMarkets() {
  const { address } = useSolana()
  const ansem = useMarkets(address, 'ansem')
  const bonk = useMarkets(address, 'bonk')
  const wif = useMarkets(address, 'wif')
  const floki = useMarkets(address, 'floki')
  const babydoge = useMarkets(address, 'babydoge')
  const broccoli = useMarkets(address, 'broccoli')
  const zashArc = useMarkets(address, 'zash-arc')
  const zashSeis = useMarkets(address, 'zash-seis')

  const byArena: Record<string, UseMarketsReturn> = {
    ansem, bonk, wif, floki, babydoge, broccoli, 'zash-arc': zashArc, 'zash-seis': zashSeis,
  }
  const myInPlay = useMemo(
    () => [ansem, bonk, wif, floki, babydoge, broccoli, zashArc, zashSeis].reduce((s, m) => {
      const all = [...m.positions, ...m.binaryPositions, ...m.magnitudePositions]
      return s + all.reduce((x, p) => x + p.stake, 0)
    }, 0),
    [ansem, bonk, wif, floki, babydoge, broccoli, zashArc, zashSeis],
  )
  return { address, byArena, myInPlay }
}
