/* Shown while a lazily-loaded route chunk arrives. Kept in the arcade voice
   so a slow connection still reads as the same world, never a blank flash. */
export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="rf-coin">◉</span>
      <span className="rf-text">INSERT COIN</span>
    </div>
  )
}
