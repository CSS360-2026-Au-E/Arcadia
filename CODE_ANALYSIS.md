# Arcadia Code Analysis Report

Shared report for Bot Project Task 5. Each team member adds a section for the
two analysis jobs they picked. Add your section under its heading and put your
name next to it.

| Job | Topic | Who |
|---|---|---|
| 2 | Cyclomatic complexity | Abhi |
| 4 | Test coverage | (teammate) |
| 5 | Threat model | (teammate) |
| 6 | Fuzzer | Ami |
| 7 | Unit tests | Abhi |
| 8 | Smoke test | Ami |

---

## 2. Cyclomatic complexity (Abhi)

### What it measures

Cyclomatic complexity counts the independent paths through a function: one
for the function itself plus one for every `if`, `else if`, loop, `case`,
`&&`, `||`, `??` and `?:`. A higher number means more paths to understand
and more test cases needed to cover every branch. A common rule of thumb is
1 to 10 is fine, 11 to 20 is getting hard to follow, and over 20 should be
split up.

### How it was measured

ESLint's built-in `complexity` rule, run over every file in `src/` with the
threshold set to 1 so that every function gets reported:

```bash
npx eslint --no-config-lookup --rule '{"complexity":["warn",1]}' -f json src
```

The JSON output was then sorted by score. This was run on `main` at commit
`0e72a1d`.

### Results

161 functions were measured. The average complexity is **4.25**.

| Complexity | Functions | Share |
|---|---|---|
| 1 to 5 (simple) | 130 | 81% |
| 6 to 10 (moderate) | 25 | 16% |
| 11 to 20 (complex) | 4 | 2% |
| 21 or more (very complex) | 2 | 1% |

The 10 most complex functions:

| Score | Function | File | Has unit tests? |
|---|---|---|---|
| 46 | `simulateShot` | `src/games/minigolfPhysics.js` | Yes |
| 24 | `playCard` | `src/games/minigolfCards.js` | Yes |
| 19 | `drawCourse` | `src/games/minigolfPicture.js` | Yes |
| 12 | `drawTrap` | `src/games/minigolfPicture.js` | No (not exported) |
| 11 | `execute` | `src/events/hotpotatoMessages.js` | No |
| 11 | `placementProblem` | `src/games/minigolfTraps.js` | Yes |
| 10 | `startHole` | `src/games/minigolf.js` | Yes |
| 10 | `shotReport` | `src/games/minigolfRound.js` | No |
| 10 | `moveWalls` | `src/games/minigolfTraps.js` | Yes |
| 9 | `runStep` | `src/events/horseraceInteraction.js` | No (not exported) |

### Findings

1. **Most of the code is simple.** 81% of functions score 5 or less, so the
   codebase is easy to read overall. The game logic is mostly kept apart from
   the Discord code, which keeps those functions small.
2. **Mini golf holds almost all of the complexity.** 8 of the top 10 functions
   are in the mini golf files. `simulateShot` (46) is more than four times the
   recommended limit of 10. It handles movement, wall bounces, every trap type
   and stopping the ball in one loop.
3. **`playCard` (24) is a long chain of `if`/`else if` on the card type.** Each
   new card adds another branch, so it will keep growing.
4. **Some complex functions have no tests.** `shotReport` (10) and `cardHand`
   (8) in `minigolfRound.js` are exported but untested. `drawTrap` (12) and
   `runStep` (9) are not exported, so they can't be unit tested directly.
   `hotpotatoMessages.execute` (11) runs on every message and is untested.
5. **Event handlers are the next hot spot.** `messageCreate.execute` (9) and
   `hotpotatoMessages.execute` (11) mix checking the message, game state and
   replying in one function.

### Recommendations

- Split `simulateShot` into smaller helpers, for example `moveBall`,
  `bounceOffWalls`, `applyTrap` and `isStopped`. Each one is then easy to test
  on its own, and the loop becomes a few lines.
- Replace the `if`/`else if` chain in `playCard` with a lookup table that maps
  each card name to a small function. Adding a card then adds no branches.
- Add unit tests for `shotReport` and `cardHand` before refactoring them.
- Export `drawTrap` and `runStep` (or move their logic into a pure helper) so
  they can be tested.
- Add `"complexity": ["warn", 15]` to the ESLint config so new functions over
  15 get flagged in review.

---

## 7. Unit tests (Abhi)

### What was there

`tests/tictactoe.spec.js` had 6 tests. It checked a row win, a draw, an
unfinished game, a taken square, the player winning and the hard bot blocking.
It did not check column or diagonal wins, the bot winning, the easy bot, or
the `lost`, `continue` and last-square results of `playTurn`.

### What was added

`tests/tictactoeEdgeCases.spec.js` adds 10 unit tests for
`src/games/tictactoe.js`:

| Test | What it proves |
|---|---|
| starts a new game on hard with an empty board | `createGame` defaults are right |
| detects a column win | column lines in `WIN_LINES` work |
| detects both diagonal wins | both diagonals work |
| detects a win for the bot (O) | `checkWinner` works for O, not just X |
| easy bot always picks an open square | the random bot never picks a taken square |
| hard bot takes a winning square instead of blocking | minimax prefers winning over blocking |
| returns continue after a normal move | the bot answers with exactly one move |
| returns lost when the player does not block | `playTurn` reports a bot win |
| returns draw when the last square fills the board | `playTurn` reports a draw |
| counts a win on the last square as a win | a win is checked before a draw |

### How to run

```bash
npm test
```

All tests pass, including the existing suites.

### Why these tests

Tic tac toe's `checkWinner` and `playTurn` are pure functions (no Discord
calls), so they are the easiest code in the bot to test reliably. The new
tests cover every return value of `playTurn` and every kind of win line, which
gives full branch coverage of the game logic outside of `minimax`'s inner
loop.

---

## 4. Test coverage (teammate)

_To be added._

## 5. Threat model (teammate)

_To be added._

## 6. Fuzzer (Ami)

### What a fuzzer is

A normal unit test checks one example picked by hand. A fuzzer makes up
hundreds of random examples and checks that a rule holds for every one of
them. When a rule breaks, it shrinks the example down to the smallest one
that still breaks it, which makes the bug easy to see.

### What was fuzzed

`tests/horseraceFuzz.spec.js` uses [fast-check](https://fast-check.dev/) to
fuzz the horse race rules in `src/games/horserace.js`. Horse race was picked
because it moves real dubloons, so a bug there costs players money. Each rule
runs 100 random examples by default.

| Rule (property) | Random input | Result before fix |
|---|---|---|
| Betting never creates or destroys dubloons | 4 players with 0 to 200 dubloons, up to 40 clicks | Pass |
| Nobody's dubloons go below 0 | same | Pass |
| A horse gallops 0 to 3 steps | any `Math.random` value | Pass |
| A horse never moves backwards or past the line | 50 steps of random numbers | Pass |
| Payout = bets on the winner x its odds | up to 40 clicks, then a full race | Pass |
| A horse that doesn't exist never takes dubloons | horse numbers like 5, -1, 2.5 and NaN | **Fail** |
| A broken click doesn't change the next real bet | a bad click, then a good one | **Fail** |

### Findings

1. **`placeBet` trusted the horse number.** Given a horse number outside 0 to
   4 (fast-check shrank it to `placeBet(game, wallets, "ana", 5)`), it still
   took 10 dubloons, and the bet went on a horse that can't win, so the
   dubloons were gone for good. A `NaN` horse did the same and also turned the
   bet totals into `NaN`. The number comes from the button ID (`"horse:2"`),
   so today only a renamed or broken button would trigger it, but nothing
   stopped it.
2. **The money math is solid.** Across every random run, dubloons were never
   created or lost during betting, no wallet went negative, and payouts
   always matched the odds exactly.
3. **`pickWinner` returns `undefined` if no horse has finished.** The Discord
   code only calls it after someone crosses the line, so it doesn't crash
   today, but `payOut` would throw if it were ever called early.

### What was fixed

`placeBet` now returns `"invalid"` and takes nothing unless the horse is a
whole number from 0 to 4, and the button handler replies "That horse isn't
in this race." Both failing rules pass now.

## 8. Smoke test (Ami)

### What a smoke test is

A quick "does it turn on?" check. It doesn't test every rule; it runs the
main job of each part of the bot once and makes sure nothing crashes.

### What it covers

`tests/smoke.spec.js` has 10 checks and needs no Discord token or internet:

| Check | What it proves |
|---|---|
| Every file in `src/events/` loads with a `name` and `execute` | the bot can start (a typo in any event file would stop `npm start`) |
| Hangman to a win | guesses and winning work |
| Hot potato until one player is left | join, start, pass, explode and winner work |
| One turn of tic tac toe | the player moves and the bot answers |
| Slot machine spin | three reels and a payout |
| Poker deal, hold, draw and payout | a full hand works |
| Song guess check | title matching works (song is made up, no Deezer call) |
| A hole of minigolf | a player can join, shoot and finish a hole |
| Horse race from bet to payout | bets, racing, winner and payout work |
| Points to dubloons | `/convert` math works |

### Findings

1. **Every game's main flow works**, and every event file loads.
2. **Horse race bets are lost if the bot restarts mid-race.** Bets are taken
   out of the saved dubloons file right away, but the race itself only lives
   in memory. If the bot stops during the 25 seconds of betting or the race,
   nobody gets paid or refunded.
3. **Song guesser can't be smoke tested end to end without the internet**,
   because `getRandomSong` always calls Deezer. Passing in the song source
   would let a test use a fake one.

### How to run

```bash
npm install
npm test
```

### User stories from this work

- Refuse bets on horses that don't exist (fixed in this change)
- Refund horse race bets when the bot restarts mid-race
