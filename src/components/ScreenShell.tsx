/* Shared chrome for the non-game screens (menu, how to play, settings,
   stats): the sticky HUD, a pixel title, an optional back link, and a slot.
   Keeps every screen in one world without each rebuilding the frame. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { loadPlayer } from '../game/profile'

interface Props {
  /** Omit to render only the HUD and let children own the layout (the menu). */
  title?: string
  sub?: string
  back?: { to: string; label: string }
  children: ReactNode
  showStats?: boolean
}

const fmt = (n: number) => n.toLocaleString()

export function ScreenShell({ title, sub, back, children, showStats = true }: Props) {
  const p = showStats ? loadPlayer() : null
  return (
    <div className="screen-view">
      <header className="hud">
        <div className="wrap">
          {p ? (
            <>
              <span className="b gold">
                SCORE <i>{fmt(p.balance)}</i>
              </span>
              <span className="b">
                RANK <i>{p.elo}</i>
              </span>
              <span className="b lime">
                SOLVED <i>{p.wins}/{p.played}</i>
              </span>
            </>
          ) : (
            <span className="b">PRECINCT 0G</span>
          )}
          <Link className="home" to="/">
            ◀ SITE
          </Link>
          <span className="coin">◉ INSERT COIN</span>
        </div>
      </header>

      <main className="wrap screen-main" id="main">
        {title && (
          <div className="screen-head">
            <div>
              <h1 className="screen-title">{title}</h1>
              {sub && <p className="screen-sub">{sub}</p>}
            </div>
            {back && (
              <Link className="btn btn-ghost" to={back.to}>
                {back.label}
              </Link>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
