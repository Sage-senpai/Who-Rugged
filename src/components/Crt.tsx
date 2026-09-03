import { useLocation } from 'react-router-dom'
import { useSettings } from '../settings/SettingsContext'

/* The CRT scanline + vignette overlay. Fixed, non-interactive, decorative.
   Hidden when the player turns scanlines off; flicker is governed by the
   no-flicker class and prefers-reduced-motion, both handled in tokens.css.
   Also hidden on /arena — that flow deliberately uses a different, modern-
   dashboard design language (see src/sold/arena/arena.css). */
export function Crt() {
  const { settings } = useSettings()
  const { pathname } = useLocation()
  if (!settings.scanlines || pathname.startsWith('/arena')) return null
  return <div className="crt" aria-hidden="true" />
}
