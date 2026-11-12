# Arcadia Code Analysis Report

Shared report for Bot Project Task 5. Each team member adds a section for the
two analysis jobs they picked. Add your section under its heading and put your
name next to it.

| Job | Topic | Who |
|---|---|---|
| 2 | Cyclomatic complexity | Abhi |
| 4 | Test coverage | (teammate) |
| 5 | Threat model | (teammate) |
| 7 | Unit tests | Abhi |

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
