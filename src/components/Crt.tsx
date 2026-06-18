import { useSettings } from '../settings/SettingsContext'

/* The CRT scanline + vignette overlay. Fixed, non-interactive, decorative.
   Hidden when the player turns scanlines off; flicker is governed by the
   no-flicker class and prefers-reduced-motion, both handled in tokens.css. */
export function Crt() {
  const { settings } = useSettings()
  if (!settings.scanlines) return null
  return <div className="crt" aria-hidden="true" />
}
