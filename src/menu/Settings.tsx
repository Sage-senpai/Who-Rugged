import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { Toggle } from '../components/Toggle'
import { useSettings } from '../settings/SettingsContext'
import { clearProgress } from '../game/profile'
import './menu.css'

export function Settings() {
  const { settings, set } = useSettings()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  function reset() {
    clearProgress()
    setConfirming(false)
    setDone(true)
  }

  return (
    <ScreenShell title="Settings" sub="Tune the cabinet. Everything saves on this device." back={{ to: '/menu', label: '◀ Menu' }}>
      <section className="panel">
        <h2 className="panel-h">Display</h2>
        <Toggle
          label="CRT scanlines"
          hint="The scanline and vignette overlay."
          checked={settings.scanlines}
          onChange={(v) => set('scanlines', v)}
        />
        <Toggle
          label="Screen flicker"
          hint="The subtle CRT flicker animation."
          checked={settings.flicker}
          onChange={(v) => set('flicker', v)}
        />
        <Toggle
          label="Reduce motion"
          hint="Stop deal-ins, slams, and pulses. Your system setting is always respected too."
          checked={settings.reduceMotion}
          onChange={(v) => set('reduceMotion', v)}
        />
      </section>

      <section className="panel">
        <h2 className="panel-h">Audio</h2>
        <Toggle
          label="Music"
          hint="Chiptune theme, a different loop per screen."
          checked={settings.music}
          onChange={(v) => set('music', v)}
        />
        <Toggle
          label="Sound effects"
          hint="Arcade blips on scan, reveal, and verdict."
          checked={settings.sound}
          onChange={(v) => set('sound', v)}
        />
      </section>

      <section className="panel">
        <h2 className="panel-h">Progress</h2>
        <div className="danger-row">
          <span className="dr-text">
            {done
              ? 'Progress cleared. Your next case starts from rank 1000.'
              : 'Wipe your score, rank, record, and case history on this device.'}
          </span>
          {!done &&
            (confirming ? (
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-danger" onClick={reset}>
                  Yes, wipe it
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button className="btn-danger" onClick={() => setConfirming(true)}>
                Reset progress
              </button>
            ))}
        </div>
      </section>
    </ScreenShell>
  )
}
