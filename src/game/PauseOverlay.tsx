import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Toggle } from '../components/Toggle'
import { useSettings } from '../settings/SettingsContext'

interface Props {
  onResume: () => void
}

/* In-game pause. Quick toggles live here so the player never loses the case to
   change a setting. Escape resumes; focus is moved in and restored on close. */
export function PauseOverlay({ onResume }: Props) {
  const { settings, set } = useSettings()
  const resumeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    resumeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onResume()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onResume])

  return (
    <div
      className="pause-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onResume()
      }}
    >
      <div className="pause-card" role="dialog" aria-modal="true" aria-label="Paused">
        <h2>Paused</h2>

        <Toggle label="Sound effects" checked={settings.sound} onChange={(v) => set('sound', v)} />
        <Toggle label="CRT scanlines" checked={settings.scanlines} onChange={(v) => set('scanlines', v)} />
        <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => set('reduceMotion', v)} />

        <div className="pause-links">
          <button className="resume" ref={resumeRef} onClick={onResume}>
            ▶ Resume
          </button>
          <Link to="/how">How to Play</Link>
          <Link to="/settings">All Settings</Link>
          <Link className="quit" to="/menu">
            Quit to Menu
          </Link>
        </div>
      </div>
    </div>
  )
}
