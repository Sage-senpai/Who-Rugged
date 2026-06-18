/* Global game settings, persisted and applied as classes on <html> so plain
   CSS can react. Covers the visual layer (CRT scanlines, screen flicker, an
   explicit reduce-motion override on top of the system pref) and audio. */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Difficulty } from '../lib/types'
import { sfx } from '../lib/sfx'
import { music } from '../lib/music'

export interface Settings {
  scanlines: boolean
  flicker: boolean
  sound: boolean
  music: boolean
  reduceMotion: boolean
  difficulty: Difficulty
}

const DEFAULTS: Settings = {
  scanlines: true,
  flicker: true,
  sound: true,
  music: true,
  reduceMotion: false,
  difficulty: 'detective',
}

const KEY = 'who-rugged:settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

interface Ctx {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  toggle: (key: keyof Settings) => void
}

const SettingsCtx = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* non-fatal */
    }
    const root = document.documentElement
    root.classList.toggle('no-flicker', !settings.flicker)
    root.classList.toggle('force-reduce', settings.reduceMotion)
    sfx.setEnabled(settings.sound)
    music.setEnabled(settings.music)
  }, [settings])

  const value = useMemo<Ctx>(
    () => ({
      settings,
      set: (key, val) => setSettings((s) => ({ ...s, [key]: val })),
      toggle: (key) => setSettings((s) => ({ ...s, [key]: !s[key] })),
    }),
    [settings],
  )

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
