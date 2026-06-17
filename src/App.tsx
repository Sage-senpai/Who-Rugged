import { Route, Routes } from 'react-router-dom'
import { Crt } from './components/Crt'
import { Landing } from './landing/Landing'
import { Game } from './game/Game'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Crt />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/play" element={<Game />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  )
}
