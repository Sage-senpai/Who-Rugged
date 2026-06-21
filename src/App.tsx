import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Crt } from './components/Crt'
import { RouteFallback } from './components/RouteFallback'
import { MusicDirector } from './components/MusicDirector'
import { SettingsProvider } from './settings/SettingsContext'
import { WalletProvider } from './wallet/WalletContext'

// Route-level code splitting: the landing no longer ships the game engine and
// DiceBear, and each screen loads on demand.
const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const Menu = lazy(() => import('./menu/Menu').then((m) => ({ default: m.Menu })))
const HowToPlay = lazy(() => import('./menu/HowToPlay').then((m) => ({ default: m.HowToPlay })))
const Settings = lazy(() => import('./menu/Settings').then((m) => ({ default: m.Settings })))
const Stats = lazy(() => import('./menu/Stats').then((m) => ({ default: m.Stats })))
const Profile = lazy(() => import('./menu/Profile').then((m) => ({ default: m.Profile })))
const Game = lazy(() => import('./game/Game').then((m) => ({ default: m.Game })))
const Court = lazy(() => import('./court/Court').then((m) => ({ default: m.Court })))
const Lobby = lazy(() => import('./lobby/Lobby').then((m) => ({ default: m.Lobby })))

export default function App() {
  return (
    <SettingsProvider>
      <WalletProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Crt />
        <MusicDirector />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/how" element={<HowToPlay />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/play" element={<Game />} />
            <Route path="/court" element={<Court />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </WalletProvider>
    </SettingsProvider>
  )
}
