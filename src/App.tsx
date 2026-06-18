import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Crt } from './components/Crt'
import { RouteFallback } from './components/RouteFallback'
import { SettingsProvider } from './settings/SettingsContext'

// Route-level code splitting: the landing no longer ships the game engine and
// DiceBear, and each screen loads on demand.
const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const Menu = lazy(() => import('./menu/Menu').then((m) => ({ default: m.Menu })))
const HowToPlay = lazy(() => import('./menu/HowToPlay').then((m) => ({ default: m.HowToPlay })))
const Settings = lazy(() => import('./menu/Settings').then((m) => ({ default: m.Settings })))
const Stats = lazy(() => import('./menu/Stats').then((m) => ({ default: m.Stats })))
const Game = lazy(() => import('./game/Game').then((m) => ({ default: m.Game })))

export default function App() {
  return (
    <SettingsProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Crt />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/how" element={<HowToPlay />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/play" element={<Game />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </SettingsProvider>
  )
}
