/* Community theme context. Reads ?community=X from the URL (or localStorage)
   and injects CSS custom properties onto <html> so any screen can be re-skinned
   without forking the codebase. */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { COMMUNITIES, DEFAULT_THEME } from './communities'
import type { CommunityTheme } from './communities'

const STORAGE_KEY = 'who-rugged:community'

function resolveCommunity(): CommunityTheme {
  const urlParam = new URLSearchParams(window.location.search).get('community')
  const stored = localStorage.getItem(STORAGE_KEY)
  const id = urlParam ?? stored ?? 'default'
  if (urlParam) {
    try { localStorage.setItem(STORAGE_KEY, urlParam) } catch { /* non-fatal */ }
  }
  return COMMUNITIES[id] ?? DEFAULT_THEME
}

function applyCssVars(colors: CommunityTheme['colors']): void {
  const root = document.documentElement
  const entries: [string, string | undefined][] = [
    ['--sky',   colors.sky],
    ['--gold',  colors.gold],
    ['--alarm', colors.alarm],
    ['--lime',  colors.lime],
    ['--void',  colors.void],
    ['--panel', colors.panel],
  ]
  for (const [prop, val] of entries) {
    if (val) root.style.setProperty(prop, val)
    else root.style.removeProperty(prop)
  }
}

interface ThemeCtx {
  theme: CommunityTheme
  setCommunity: (id: string) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<CommunityTheme>(resolveCommunity)

  useEffect(() => {
    applyCssVars(theme.colors)
  }, [theme])

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setCommunity: (id: string) => {
        const next = COMMUNITIES[id] ?? DEFAULT_THEME
        try { localStorage.setItem(STORAGE_KEY, next.id) } catch { /* non-fatal */ }
        setTheme(next)
      },
    }),
    [theme],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
