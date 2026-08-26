# Taboo Jr. — Project Guide

## What This Is

A kid-friendly version of the party game Taboo, for an 8-year-old and an
11-year-old. One player holds the screen and describes the big word on the
card; everyone else guesses. The five red words underneath are off limits.

Lives on the family website as a tile on the Cook Timer dashboard. The source
lives inside the `cook-timer` repo (this folder) so it's versioned and backed up
alongside the site that serves it.

## Stack

Single self-contained `index.html` — inline CSS and JS, no build tooling, no
framework, no network calls except the Baloo 2 webfont from Google Fonts.
Same shape as `alicia-board-game` and `alicia-restaurant-game`.

## The one wrinkle: there IS a build step

589 cards is too much to hand-edit inside a giant HTML file, so the source is
split and spliced:

```
src/deck.js      — the 589 cards, one per line
src/shell.html   — everything else, with a /* __DECK__ */ marker
build.py         — validates the deck, splices it into the shell
index.html       — GENERATED. Never edit this by hand.
```

```bash
python3 build.py        # → rewrites index.html
```

`build.py` refuses to write `index.html` if a card is malformed, an answer is
duplicated, a card doesn't have exactly 5 taboo words, or a taboo word repeats
within its card. It warns (but still builds) when a taboo word overlaps its own
answer — that's legal but wastes a slot, since you can't say any part of the
answer anyway.

## Deploying to the website

`index.html` is copied verbatim into the Flask app:

```bash
cp index.html ../templates/taboo_jr.html
```

The route (`/taboo-jr`) already exists in `../app.py`, and the dashboard tile
is in `../templates/dashboard.html`. Nothing else to
do — Vercel serves it from there. There is deliberately no "back to dashboard"
link, matching the other games (browser back button).

## Card Format

```js
["PENGUIN",  "bird",  "ice",  "black",  "swim",  "waddle"],
//  answer    ─────────── the five taboo words ───────────
```

Answers UPPERCASE, taboo words lowercase. Aim the answers at what an 8-year-old
knows; the taboo words should be the five words you'd most want to say, or they
aren't doing any work. No brand names, and nothing that needs specific
TV/movie knowledge — the deck should still make sense in five years.

16 loose sections (animals, food, school, sports, places, nature, body,
clothes, vehicles, jobs, holidays, actions, imagination, screens/music,
space/science). The sections are only for keeping the file navigable — the game
shuffles all 589 together, with no difficulty tiers.

## Game Rules As Implemented

- **Teams mode**: 2–4 teams, 45/60/90-second turns, first to 10/15/20/25 points.
- **Just Us (co-op)**: one team, one timer, beat your saved best score.
- GOT IT = +1. SKIP = free, no penalty. BUZZ = card discarded, no penalty.
- Whatever card is on screen when time expires is shown in the round summary
  marked ⏱, so everybody finds out what it was.
- **A win requires a complete round-robin.** Every team gets the same number of
  turns, and a tie at the top forces another full round. See `findWinner()`.

## Saved State (localStorage)

| Key | What |
|---|---|
| `taboojr.deck.v1` | `{order, pos, size}` — the shuffled running order and how far in we are |
| `taboojr.coopBest.v1` | best co-op score, keyed by turn length |
| `taboojr.setup.v1` | last-used team names, team count, turn length, target |

**The no-repeats guarantee** is the deck key: a shuffled order of all 589
indices plus a pointer. Cards don't repeat until the whole deck is used, and
that survives closing the browser — it can take weeks to get through. On
exhaustion it reshuffles automatically and says so. "Shuffle a fresh deck" on
the menu resets it, behind a confirm.

If `size` doesn't match `DECK.length`, the saved order is thrown away and
rebuilt — so **adding or removing cards resets everyone's progress.** That's
the intended trade-off; the alternative is remembering cards by name forever.

Every storage read/write is wrapped in try/catch: in private mode the game
still plays, it just forgets between sessions.

## Testing

There's no test file checked in, but the game is straightforward to drive with
Playwright against `index.html` as a `file://` URL. The things worth re-testing
after any change: draw all 589 cards and assert uniqueness; reload mid-deck and
assert the pointer survived; a full teams game to a win; and the tie rule.

## Notes

- Sounds are Web Audio beeps generated in JS — no audio files. The
  AudioContext is created on the "I'm ready — START" tap, which mobile
  browsers require.
- Screen Wake Lock keeps the display on during a turn.
- Keyboard shortcuts on a laptop: space/→ = got it, ↓/← = skip, b = buzz.
