import { useEffect, useState } from 'react'

/** mm:ss (or hh:mm:ss past an hour) countdown to `closesAt`, ticking every second. */
export function useCountdown(closesAt: number): string {
  const [label, setLabel] = useState('--:--')
  useEffect(() => {
    const tick = () => {
      const diff = closesAt - Date.now()
      if (diff <= 0) { setLabel('CLOSED'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [closesAt])
  return label
}
