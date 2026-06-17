import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Crt } from './components/Crt'
import { RouteFallback } from './components/RouteFallback'

// Route-level code splitting: the landing no longer ships the game engine and
// DiceBear, and the game route loads on demand when the player presses start.
const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const Game = lazy(() => import('./game/Game').then((m) => ({ default: m.Game })))

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Crt />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/play" element={<Game />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </>
  )
}
