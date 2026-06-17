import type { Suspect } from '../lib/types'
import { spriteFor, initialFor } from '../lib/avatar'
import { clamp } from '../lib/rng'

interface Props {
  suspect: Suspect
  index: number
  revealed: boolean
  scanning: boolean
  canScan: boolean
  canAccuse: boolean
  isAccused: boolean
  onScan: (id: string) => void
  onAccuse: (id: string) => void
}

export function SuspectCard({
  suspect,
  index,
  revealed,
  scanning,
  canScan,
  canAccuse,
  isAccused,
  onScan,
  onAccuse,
}: Props) {
  const hasRead = suspect.read !== null
  const pct = hasRead ? clamp(Math.round(suspect.read as number), 5, 95) : 0

  const meterClass = scanning ? 'meter scanning' : hasRead ? 'meter' : 'meter unread'
  const cardClass = [
    'card',
    revealed && suspect.isThief ? 'is-thief' : '',
    isAccused ? 'is-accused' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cardClass} style={{ animationDelay: `${index * 60}ms` }}>
      {!revealed && (
        <span className="seal" aria-label="Role sealed inside the TEE">
          SEALED · TEE
        </span>
      )}

      <div className="top">
        <div className="mugwrap">
          <span className="fb" aria-hidden="true">
            {initialFor(suspect.handle)}
          </span>
          <img
            alt=""
            src={spriteFor(suspect.handle)}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div className="who">
          <div className="nm">{suspect.handle}</div>
          <div className="jb">{suspect.profession}</div>
        </div>
      </div>

      <p className="stmt">{suspect.statement}</p>

      <div className="meter-lab">
        <span>SUSPICION READ</span>
        <span>{scanning ? 'SCANNING' : hasRead ? `${pct}%` : 'SEALED'}</span>
      </div>
      <div className={meterClass}>
        <i style={{ width: hasRead && !scanning ? `${pct}%` : undefined }} />
      </div>
      <div className="tell">{hasRead && !scanning ? suspect.tell : ''}</div>

      {revealed ? (
        <>
          <div className="reveal">
            <div
              className={`mk ${suspect.isThief ? 'thief' : 'clear'}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {suspect.isThief ? 'THIEF' : 'CLEAR'}
            </div>
          </div>
          <div className="attest">
            <b>verified</b> 0G TEE {suspect.attestation}
          </div>
        </>
      ) : (
        <div className="btns">
          <button
            className="gbtn scan"
            disabled={!canScan || hasRead || scanning}
            onClick={() => onScan(suspect.id)}
          >
            {scanning ? 'Scanning…' : hasRead ? 'Scanned' : 'Scan'}
          </button>
          <button
            className="gbtn accuse"
            disabled={!canAccuse}
            onClick={() => onAccuse(suspect.id)}
            aria-label={`Accuse ${suspect.handle}, the ${suspect.profession}`}
          >
            Accuse
          </button>
        </div>
      )}
    </article>
  )
}
