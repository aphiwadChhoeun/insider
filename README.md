# Insider

A pass-the-phone role dealer for the party game **Insider**. One phone, one group,
no accounts and no network. The app hands out roles and the secret word; the
actual game happens out loud, away from the screen.

## Running it

```bash
npm install
npm run dev
```

Vite prints a LAN address alongside `localhost` (`--host` is already in the
script) — open that one on the phone you'll be passing around.

```bash
npm test        # game logic unit tests
npm run build   # typecheck + production build into dist/
```

## The flow

1. **Setup** — pick a player count (4–12), choose how the round ends, and
   optionally type names; blanks become `Player N`.
   - **Time** (default, 5 minutes, 1–15) — the phone counts down while you play.
   - **Questions** (default 20, 5–50 in steps of 5) — tap once per question asked.
2. **Reveal** — for each player in turn: a "pass the phone to X" placard, then a
   tap to show their card. Master and Insider see the secret word; Commons
   don't. "Hide & pass on" moves to the next player.
3. **Play** — a live countdown (pausable), or a tally button showing questions
   left. When the limit runs out the screen says so and waits; it never
   navigates on its own. The limit is captured when the round starts, so
   editing setup later can't disturb a round in progress.

   Revealing mid-round asks first, via a sheet over the screen — a mis-tap
   shouldn't end everyone's game. Cancel takes focus on open, Escape and a
   backdrop tap both cancel, and the clock keeps running behind the sheet.
   Once the limit is spent, revealing is the obvious next tap, so it goes
   straight through with no prompt.
4. **Summary** — reveals the word and every player's role. From there, start a
   new round with the same players (fresh roles, different word) or go back to
   setup.

## Layout

| File | Purpose |
| --- | --- |
| `src/game.ts` | All game state: types, reducer, role assignment, word pick, round limits |
| `src/game.test.ts` | Unit tests for the above |
| `src/useClock.ts` | Reads the round's deadline on a tick; owns no time itself |
| `src/storage.ts` | localStorage load/save plus `parseState` validation |
| `src/words.ts` | Bundled secret-word list |
| `src/screens/` | One component per screen, presentational only |
| `src/components/ConfirmSheet.tsx` | Reusable yes/no sheet; knows nothing about the game |
| `src/App.tsx` | Holds the reducer and picks the screen |
| `src/styles.css` | Mobile-first stylesheet, no framework |

## Persistence

Every state change is written to `localStorage` under `insider:state:v1`, so an
accidental refresh — or a mobile browser quietly dropping the tab — doesn't cost
you the round. The version in the key means a future shape change retires old
saves instead of choking on them.

Two things are deliberate about how a save is restored:

- **The card comes back face down.** `revealed` is forced to `false` on load, so
  reloading while a role card is showing returns to the "pass the phone to X"
  placard for that same player. A reload can never flash a role at whoever
  happens to be holding the phone.
- **The clock is a deadline, not a countdown.** The round stores an absolute
  `endsAt` (or, while paused, the milliseconds banked), so time keeps running
  across a reload rather than resetting to full. `useClock` only reads it.

`parseState` treats storage as untrusted: anything malformed is rejected in
favour of a fresh game, and salvageable-but-wrong values (out-of-range counts, a
short names array, a turn pointing past the last player) are repaired. A save
whose screen needs a round it doesn't have falls back to setup rather than
rendering a blank page.

"Start over" at the bottom of the rules screen discards the saved game and
returns to setup — the way out of a restored round you don't want.
