import { useEffect, useRef } from 'react'
import type { Verdict } from '../lib/types'

interface Props {
  verdict: Verdict
  onContinue: () => void
}

/* Accessible verdict dialog: focus moves in on open, Escape and the button
   both continue, focus is trapped while open and restored on close. */
export function VerdictModal({ verdict, onContinue }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    btnRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onContinue()
      }
      if (e.key === 'Tab') {
        // single focusable element, keep focus on it
        e.preventDefault()
        btnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [onContinue])

  return (
    <div
      className="verdict-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onContinue()
      }}
    >
      <div
        ref={dialogRef}
        className={`verdict ${verdict.kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verdict-title"
        aria-describedby="verdict-sub"
      >
        <h2 id="verdict-title">{verdict.title}</h2>
        <div className="vs" id="verdict-sub">
          {verdict.subtitle}
        </div>

        <div className="ledger">
          {verdict.rows.map((r, i) => (
            <div className="r" key={i}>
              <span>{r.label}</span>
              <span className={r.sign}>{r.amount}</span>
            </div>
          ))}
        </div>

        <p className="proof">
          <b>VERIFIABLE REPLAY</b> {verdict.replayCid}
          <br />
          Recorded on 0G Storage, roles sealed by 0G Compute, settled on 0G Chain. Nobody could see
          or alter who the thief was.
        </p>

        <button className="bigbtn" ref={btnRef} onClick={onContinue}>
          Continue ▶
        </button>
      </div>
    </div>
  )
}
