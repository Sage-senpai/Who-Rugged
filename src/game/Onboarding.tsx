import { useEffect, useRef } from 'react'

interface Props {
  onDismiss: () => void
}

const BEATS = [
  { k: 'READ', v: 'Five suspects speak. The thief lies. A baiter acts guilty on purpose.' },
  { k: 'SCAN', v: 'Two interrogations. Each gives a noisy, attested read. Never the answer.' },
  { k: 'ACCUSE', v: 'Bust one. A wrong call pays the accused from your bond. A high meter is not proof.' },
  { k: 'REVEAL', v: 'Seals break into attestations and the pot settles. Nobody could rig it.' },
]

/* First-run coach card. Shows once, dismissible, with a route to the full
   How to Play. Focus is trapped on the dismiss button while open. */
export function Onboarding({ onDismiss }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btnRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        onDismiss()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div className="onb-overlay" onMouseDown={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">
        <div className="onb-eyebrow">FIRST CASE</div>
        <h2 id="onb-title">You are the cop. Catch the thief.</h2>
        <ol className="onb-beats">
          {BEATS.map((b) => (
            <li key={b.k}>
              <span className="onb-k">{b.k}</span>
              <span className="onb-v">{b.v}</span>
            </li>
          ))}
        </ol>
        <button className="onb-btn" ref={btnRef} onClick={onDismiss}>
          Take the case ▶
        </button>
        <p className="onb-foot">
          Keys: <b>1-5</b> scan a suspect, <b>P</b> pause, <b>N</b> new case.
        </p>
      </div>
    </div>
  )
}
