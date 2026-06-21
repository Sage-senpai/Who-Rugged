import type { CourtParticipant } from './types'
import type { Mood } from '../lib/types'
import { spriteFor, initialFor } from '../lib/avatar'
import { clamp } from '../lib/rng'

function moodFor(p: CourtParticipant, revealed: boolean, pressing: boolean): Mood {
  if (revealed) return p.isThief ? 'smug' : 'calm'
  if (p.mood) return p.mood
  if (pressing) return 'nervous'
  if (p.read === null) return 'calm'
  if (p.read >= 60) return 'rattled'
  if (p.read >= 42) return 'nervous'
  return 'calm'
}

interface Props {
  participant: CourtParticipant
  index: number
  revealed: boolean
  pressing: boolean
  phase: 'discuss' | 'vote' | 'other'
  canPress: boolean
  selected: boolean
  accusesHandle: string | null
  incoming: number
  votes: number | null
  convicted: boolean
  onPress: (id: string) => void
  onVote: (id: string) => void
}

export function ParticipantCard({
  participant: p,
  index,
  revealed,
  pressing,
  phase,
  canPress,
  selected,
  accusesHandle,
  incoming,
  votes,
  convicted,
  onPress,
  onVote,
}: Props) {
  const hasRead = p.read !== null
  const pct = hasRead ? clamp(Math.round(p.read as number), 5, 95) : 0
  const mood = moodFor(p, revealed, pressing)
  const meterClass = pressing ? 'meter scanning' : hasRead ? 'meter' : 'meter unread'

  const cls = [
    'pcard',
    revealed && p.isThief ? 'is-thief' : '',
    convicted ? 'is-convicted' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const selectable = phase === 'vote' && !revealed
  const clickProps = selectable
    ? { role: 'button' as const, tabIndex: 0, onClick: () => onVote(p.id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVote(p.id) } } }
    : {}

  return (
    <article className={cls} {...clickProps} aria-pressed={selectable ? selected : undefined}>
      {!revealed && <span className="seal">SEALED · TEE</span>}
      {incoming > 0 && !revealed && (
        <span className="fingers" title={`${incoming} pointing here`}>
          ◂ {incoming}
        </span>
      )}
      {revealed && votes !== null && <span className="votecount">{votes} votes</span>}

      <div className="ptop">
        <div className="pmug">
          <span className="fb" aria-hidden="true">{initialFor(p.handle)}</span>
          <img alt="" src={spriteFor(p.handle, mood)} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="pwho">
          <div className="pnm">{p.handle}</div>
          <div className="pjb">{p.profession}</div>
        </div>
      </div>

      <p className="pstmt">{p.statement}</p>
      {accusesHandle && !revealed && (
        <div className="paccuse">▸ points at <b>{accusesHandle}</b></div>
      )}

      {(hasRead || pressing) && (
        <>
          <div className="meter-lab"><span>SUSPICION</span><span>{pressing ? 'PRESSING' : `${pct}%`}</span></div>
          <div className={meterClass}><i style={{ width: hasRead && !pressing ? `${pct}%` : undefined }} /></div>
          {hasRead && !pressing && <div className="ptell">{p.tell}</div>}
        </>
      )}

      {revealed ? (
        <>
          <div className="reveal"><div className={`mk ${p.isThief ? 'thief' : 'clear'}`} style={{ animationDelay: `${index * 70}ms` }}>{p.isThief ? 'THIEF' : 'CLEAR'}</div></div>
          <div className="attest"><b>verified</b> 0G TEE {p.attestation}</div>
        </>
      ) : phase === 'discuss' ? (
        <div className="pbtns">
          <button className="gbtn scan" disabled={!canPress || hasRead || pressing} onClick={() => onPress(p.id)}>
            {pressing ? 'Pressing…' : hasRead ? 'Pressed' : 'Press'}
          </button>
        </div>
      ) : phase === 'vote' ? (
        <div className="pbtns">
          <span className={`votepick ${selected ? 'on' : ''}`}>{selected ? '✓ Your vote' : 'Tap to vote'}</span>
        </div>
      ) : null}
    </article>
  )
}
