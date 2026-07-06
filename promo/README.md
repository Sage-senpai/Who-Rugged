# WHO SOLD? — promo film

A ~32s vertical (1080×1920, 9:16) promo for the **WHO SOLD?** side of WHO RUGGED? —
the Airdrop Betrayal Market. Fully code-animated in [Remotion](https://remotion.dev);
narration is generated with ElevenLabs (voice **Chris**) and drives each scene's length.

## The idea

The base brief was: *pings of an airdrop → character checks, confirms, hurries to sell →
fade into the promo.* That's a strong cold open but on its own only shows *a guy dumping*.

The product's actual hook is **dramatic irony**: his wallet is public, and CT already made a
market out of his betrayal before he clicked sell. So the film keeps the greed hook and adds
the twist that sells the product — *the bet isn't on a price, it's on a person.*

### Beats

| # | Scene | Beat | Source |
|---|-------|------|--------|
| 1 | `Pings` | 3 A.M. wallet buzzes, X notifs stack: *received 250,000 $ANSEM* | `src/scenes/Pings.tsx` |
| 2 | `Rush` | Balance confirmed, finger lunges for the red **SELL ALL** | `src/scenes/Rush.tsx` |
| 3 | `Watched` | Pull back — his wallet is a row on the Betrayal Register. Odds fill to **62% DUMPS** | `src/scenes/Watched.tsx` |
| 4 | `Oracle` | Sell lands, balance drains to 0, **DUMPED** stamp, oracle reads chain, predictors get paid | `src/scenes/Oracle.tsx` |
| 5 | `Promo` | Fade to the WHO SOLD? lockup + CTA | `src/scenes/Promo.tsx` |

Palette and lore pulled from [`src/sold/SoldLanding.tsx`](../src/sold/SoldLanding.tsx)
and `src/sold/sold-landing.css` (alarm `#ff4560`, gold `#ffd700`, lime `#39ff14`).

## Setup

`node_modules` is a junction to the sibling elfgents Remotion install (Remotion CLI +
headless Chrome already downloaded). If that folder moves, run `npm install` here instead.

Create `.env` (gitignored):

```
ELEVENLABS_API_KEY=sk_...
ELEVEN_VOICE_ID=iP95p4xoKVk53GoZ742B   # Chris
ELEVEN_MODEL_ID=eleven_multilingual_v2
```

## Commands

```bash
npm run vo       # regenerate voiceover -> public/vo/*.wav + src/audio/vo-durations.json
npm start        # open Remotion Studio to preview/scrub
npm run render   # render -> out/who-sold.mp4
npm run build    # vo + render in one shot
```

Edit the narration in `scripts/vo-lines.json`, re-run `npm run vo`, and scene lengths
re-derive automatically (see `TAIL`/`len()` in `src/WhoSold.tsx`).
