import { useEffect, useRef } from 'react'
import type { Verdict } from '../lib/types'
import { spriteFor, initialFor } from '../lib/avatar'

interface Props {
  verdict: Verdict
  onProceed: () => void
}

/* The courtroom beat on a wrong bust (spec layer 7). The accused you arrested
   is innocent, so they sue. A Lawyer collects boosted damages. Kept short: one
   defense line, the damages figure, then on to the verdict. */
export function CourtroomOverlay({ verdict, onProceed }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    btnRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        onProceed()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onProceed])

  return (
    <div className="court-overlay">
      <div className="court-card" role="dialog" aria-modal="true" aria-labelledby="court-title">
        <div className="court-bar">
          <span className="gavel" aria-hidden="true">
            ⚖
          </span>
          <span id="court-title">COURTROOM · PRECINCT 0G</span>
        </div>

        <div className="court-accused">
          <div className="court-mug">
            <span className="fb" aria-hidden="true">
              {initialFor(verdict.accusedHandle)}
            </span>
            <img alt="" src={spriteFor(verdict.accusedHandle)} />
          </div>
          <div>
            <div className="court-name">{verdict.accusedHandle}</div>
            <div className="court-job">{verdict.accusedProfession}, wrongfully arrested</div>
          </div>
        </div>

        <p className="court-defense">“{verdict.defense}”</p>

        {verdict.lawyerBoosted && (
          <div className="court-lawyer">LAWYER ON RETAINER · DAMAGES BOOSTED</div>
        )}

        <div className="court-suing">
          <span className="cs-lab">SUING YOU FOR</span>
          <span className="cs-amt">{verdict.damages.toLocaleString()} $GG</span>
        </div>

        <button className="court-btn" ref={btnRef} onClick={onProceed}>
          Hear the verdict ▶
        </button>
      </div>
    </div>
  )
}
