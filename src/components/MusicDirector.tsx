import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { music } from '../lib/music'
import { jazz } from '../lib/jazz'
import { useSettings } from '../settings/SettingsContext'

type TrackName = 'attract' | 'menu' | 'settings' | 'stats' | 'how' | 'play'

function trackFor(pathname: string): TrackName {
  if (pathname.startsWith('/menu')) return 'menu'
  if (pathname.startsWith('/how')) return 'how'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/stats')) return 'stats'
  if (pathname.startsWith('/play')) return 'play'
  if (pathname.startsWith('/court')) return 'play'
  return 'attract'
}

/* The 3D casino floor (landing and arena routes) gets the generative jazz
   engine; every other route keeps the chiptune tracks. */
function isFloorRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/arena' || pathname.startsWith('/arena')
}

/* Drives background music from the current route. Renders nothing. Browsers
   block audio until a gesture, so we resume on the first pointer or key. */
export function MusicDirector() {
  const { pathname } = useLocation()
  const { settings } = useSettings()
  const track = trackFor(pathname)
  const onFloor = isFloorRoute(pathname)

  useEffect(() => {
    if (!settings.music) {
      music.stop()
      jazz.stop()
    } else if (onFloor) {
      music.stop()
      jazz.play()
    } else {
      jazz.stop()
      music.play(track)
    }
  }, [track, onFloor, settings.music])

  useEffect(() => {
    const resume = () => {
      music.resume()
      jazz.resume()
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [])

  return null
}
