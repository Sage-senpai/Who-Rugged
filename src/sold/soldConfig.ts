/** Central config for WHO SOLD? — swap these when Evil Ansem token launches. */

/** The betting currency displayed throughout the UI. */
export const BET_TOKEN = (import.meta.env.VITE_BET_TOKEN as string | undefined) ?? '$GG'

/** Whether the Evil Ansem token has launched (drives teaser vs live UI). */
export const EVIL_TOKEN_LIVE = import.meta.env.VITE_EVIL_TOKEN_LIVE === 'true'

/** Evil Ansem token ticker for display */
export const EVIL_TOKEN_TICKER = '$EVIL'

/** Minimum $ANSEM balance to register as a tracked holder. */
export const MIN_HOLDER_BALANCE = 100_000

/** Bet stake per prediction (in BET_TOKEN units). */
export const DEFAULT_STAKE = 50
