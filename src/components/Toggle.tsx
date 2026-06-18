/* Accessible on/off switch in the arcade style. Used by Settings and the
   in-game pause panel. Renders a real switch role with keyboard support. */
interface Props {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}

export function Toggle({ label, hint, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-knob" />
        <span className="toggle-state">{checked ? 'ON' : 'OFF'}</span>
      </span>
    </button>
  )
}
