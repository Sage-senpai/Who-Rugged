/* The CRT scanline + vignette overlay. Fixed, non-interactive, decorative.
   Flicker is disabled under prefers-reduced-motion via tokens.css. */
export function Crt() {
  return <div className="crt" aria-hidden="true" />
}
