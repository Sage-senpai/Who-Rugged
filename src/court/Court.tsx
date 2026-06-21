import { useState } from 'react'
import { useCourt } from './useCourt'
import { ParticipantCard } from './ParticipantCard'
import { VerdictModal } from '../game/VerdictModal'
import { CourtroomOverlay } from '../game/CourtroomOverlay'
import { PauseOverlay } from '../game/PauseOverlay'
import { DIFFICULTY } from '../game/difficulty'
import { useSettings } from '../settings/SettingsContext'
import { sfx } from '../lib/sfx'
import './court.css'

const fmt = (n: number) => n.toLocaleString()
const caseLabel = (n: number) => '#' + String(n).padStart(4, '0')

export function Court() {
  const { settings } = useSettings()
  const [paused, setPaused] = useState(false)
  const c = useCourt(undefined, settings.difficulty, paused)
  const { player, courtCase, phase, round, pressLeft, busyPressId, humanVote, tally, verdict, revealed, overlay } = c

  const handleOf = (id: string | null) => courtCase?.participants.find((p) => p.id === id)?.handle ?? null
  const incomingFor = (id: string) =>
    courtCase ? courtCase.participants.filter((p) => p.accusesId === id).length : 0

  const canPress = phase === 'discuss' && pressLeft > 0 && !busyPressId
  const isLast = courtCase ? round >= courtCase.rounds : false

  return (
    <div className="court-view">
      <header className="hud">
        <div className="wrap">
          <span className="b gold">SCORE <i>{fmt(player.balance)}</i></span>
          <span className="b">RANK <i>{player.elo}</i></span>
          <span className="b lime">SOLVED <i>{player.wins}/{player.played}</i></span>
          <button className="home pausebtn" onClick={() => { sfx.play('select'); setPaused(true) }}>❚❚ MENU</button>
          <span className="coin">◉ CROWDFUND</span>
        </div>
      </header>

      <main className="wrap" id="main">
        <div className="titlebar">
          <h1>THE <span className="q">TABLE</span></h1>
          <div className="sub">CASE {caseLabel(player.caseNo)} · CROWDFUNDING COURTROOM</div>
        </div>

        <section className="brief">
          <div className="siren">THE CROWDFUND WAS RUGGED</div>
          <p>
            Backers pooled a vault. One at the table drained it. The room speaks, points fingers, and
            <b> votes</b>. The most accused goes on trial. Convict the thief to make the pot whole. Convict
            an innocent and they sue the fund.
          </p>
          <div className="vault">
            <span>POT <b>{courtCase ? `${fmt(courtCase.pot)} $GG` : '...'}</b></span>
            <span>YOUR PLEDGE <b>{courtCase ? `${courtCase.yourStake} $GG` : '...'}</b></span>
            <span>PRESSES <b>{courtCase ? pressLeft : '...'}</b></span>
            <span>MODE <b>{DIFFICULTY[courtCase ? courtCase.difficulty : settings.difficulty].label}</b></span>
            <span>ROUND <b>{courtCase ? `${round}/${courtCase.rounds}` : '...'}</b></span>
          </div>
        </section>

        {phase === 'error' ? (
          <div className="errbox" role="alert">
            <p>{c.error}</p>
            <button className="bigbtn" onClick={c.retry}>Reseal the table ▶</button>
          </div>
        ) : phase === 'sealing' || !courtCase ? (
          <div className="grid" aria-busy="true" aria-label="Sealing roles">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skel" key={i}><span className="seal-lab">SEATING THE TABLE · 0G COMPUTE</span></div>
            ))}
          </div>
        ) : (
          <div className="grid">
            {courtCase.participants.map((p, i) => (
              <ParticipantCard
                key={p.id}
                participant={p}
                index={i}
                revealed={revealed}
                pressing={busyPressId === p.id}
                phase={phase === 'discuss' ? 'discuss' : phase === 'vote' ? 'vote' : 'other'}
                canPress={canPress}
                selected={humanVote === p.id}
                accusesHandle={handleOf(p.accusesId)}
                incoming={incomingFor(p.id)}
                votes={revealed && tally ? tally.tally[p.id] ?? 0 : null}
                convicted={revealed && tally?.convictedId === p.id}
                onPress={c.press}
                onVote={c.setHumanVote}
              />
            ))}
          </div>
        )}

        {c.error && phase !== 'error' && <div className="errbox" role="alert"><p>{c.error}</p></div>}

        <div className="bar">
          {phase === 'discuss' && (
            <>
              <p className="note">Read the room. <b>Press</b> a suspect for an attested read, or move the discussion on. A high meter is not proof.</p>
              <button className="bigbtn" onClick={() => void c.nextRound()}>{isLast ? 'Call the vote ▶' : `Next round (${round}/${courtCase?.rounds}) ▶`}</button>
            </>
          )}
          {phase === 'vote' && (
            <>
              <p className="note">{humanVote ? <>You vote <b>{handleOf(humanVote)}</b>. The room votes with you.</> : 'Tap a suspect to cast your vote, or skip and let the room decide.'}</p>
              <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => { c.setHumanVote(null); void c.castVote() }}>Skip</button>
                <button className="bigbtn" disabled={!humanVote} onClick={() => void c.castVote()}>Cast vote ▶</button>
              </span>
            </>
          )}
          {phase === 'resolving' && <p className="note">The room is voting. Tallying on chain.</p>}
          {phase === 'resolved' && (
            <>
              <p className="note">The seals are open and the vote is on the record.</p>
              <button className="bigbtn" onClick={c.newCase}>Next case ▶</button>
            </>
          )}
        </div>

        <p className="foot">ROLES <b>SEALED ON 0G COMPUTE</b> · POOL ON <b>0G CHAIN</b> · REPLAYS ON <b>0G STORAGE</b> · AI FILLS EMPTY SEATS</p>
      </main>

      {overlay === 'trial' && verdict && <CourtroomOverlay verdict={verdict} onProceed={c.showVerdict} />}
      {overlay === 'verdict' && verdict && <VerdictModal verdict={verdict} onContinue={c.continueGame} />}
      {paused && <PauseOverlay onResume={() => setPaused(false)} />}
    </div>
  )
}
