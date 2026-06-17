import { useState } from 'react'

const SUS = [
  { nm: '0xMaya', jb: 'Doctor', mug: 'M' },
  { nm: 'NodeRun', jb: 'Technician', mug: 'N' },
  { nm: 'priya', jb: 'Lawyer', mug: 'P' },
  { nm: 'glitch', jb: 'DevRel', mug: 'G' },
  { nm: 'dao.ren', jb: 'Community', mug: 'R' },
]

const randThief = () => Math.floor(Math.random() * SUS.length)

/* The hero's interactive police lineup. Tap a suspect to break every seal and
   reveal CLEAR or RUGGED, then reset. A two second taste of the full game. */
export function Lineup() {
  const [thiefIdx, setThiefIdx] = useState(randThief)
  const [revealed, setRevealed] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)

  function accuse(i: number) {
    if (revealed) return
    setRevealed(true)
    setCorrect(i === thiefIdx)
  }
  function reset() {
    setThiefIdx(randThief())
    setRevealed(false)
    setCorrect(null)
  }

  const status = !revealed ? 'TAP A SUSPECT' : correct ? 'CASE CLOSED' : 'WRONG CALL'
  const statusColor = !revealed ? 'var(--dim)' : correct ? 'var(--lime)' : 'var(--alarm)'

  return (
    <div className="lineup">
      <div className="wallhdr">
        <span>PRECINCT 0G · LINEUP</span>
        <span style={{ color: statusColor }}>{status}</span>
      </div>
      <div className="wall">
        {SUS.map((s, i) => {
          const cls = [
            'susp',
            i === thiefIdx ? 'tagged' : '',
            revealed ? 'shown' : '',
            revealed ? (i === thiefIdx ? 'thief' : 'clear') : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={s.nm}
              type="button"
              className={cls}
              aria-label={`Accuse ${s.nm}, ${s.jb}`}
              onClick={() => accuse(i)}
            >
              <div className="mug">{s.mug}</div>
              <div className="nm">{s.nm}</div>
              <div className="jb">{s.jb}</div>
              <span className="flag">RUGGED?</span>
              <div className="seal">SEALED</div>
              <div className="verdict">{i === thiefIdx ? '✗' : '✓'}</div>
            </button>
          )
        })}
      </div>
      {!revealed ? (
        <p className="hint">
          One of them rugged the vault. Make a call. <b>The reveal is verifiable.</b>
        </p>
      ) : (
        <button type="button" className="hint reset" onClick={reset}>
          {correct ? (
            <>
              You got them. <b>Verified on-chain</b>, no trust required. Tap to run it back.
            </>
          ) : (
            <>
              They walk, and they sue. <b>The reveal is still provable</b>, nobody faked it. Tap to
              reset.
            </>
          )}
        </button>
      )}
    </div>
  )
}
