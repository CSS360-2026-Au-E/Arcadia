# Arcadia Code Analysis Report

Shared report for Bot Project Task 5. Each team member adds a section for the
two analysis jobs they picked. Add your section under its heading and put your
name next to it.

| Job | Topic | Who |
|---|---|---|
| 2 | Cyclomatic complexity | Abhi |
| 4 | Test coverage | Jennifer |
| 5 | Threat model | Jennifer |
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

## 4. Test coverage (Jennifer)

### What it measures

Test coverage is the share of the code that actually runs while the tests run.
If a line never runs during `npm test`, no test can catch a bug in it. Coverage
is reported four ways:

- **Lines / statements:** how many lines ran at least once
- **Branches:** how many sides of each `if`, `?:`, `&&` and `||` were taken
- **Functions:** how many functions were called at least once

High coverage doesn't prove the code is correct (a test can run a line without
checking its result), but low coverage shows exactly where bugs could hide.

### How it was measured

[c8](https://github.com/bcoe/c8), which uses Node's built-in coverage, run over
every file in `src/` (including files no test imports, thanks to `--all`):

```bash
npm run coverage
```

That script runs:

```bash
c8 --all --include=src/** --reporter=text --reporter=html mocha -r esbuild-register ./tests/*.spec.js --exit
```

A table prints in the terminal, and a clickable report is saved to
`coverage/index.html`. This was run on `main` at commit `26f8754`, with all 129
tests passing.

**Setup problem found along the way:** running c8 with our normal `npm test`
reported **0% for every file**. Our test runner, `esbuild-runner`, converts the
code before running it but doesn't produce source maps, so c8 can't match the
results back to our files. Switching the coverage script to `esbuild-register`,
which does produce source maps, fixed it. `npm test` itself is unchanged.

### Results

Overall: **56% of lines**, **88% of branches**, **72% of functions**.

By folder:

| Folder | What's in it | Lines covered |
|---|---|---|
| `src/games/` | Game rules | **80.5%** (2,634 / 3,272) |
| `src/economy/` | Dubloons and points | **64.4%** (322 / 500) |
| `src/events/` | Discord handlers | **0%** (0 / 1,434) |
| `src/helpers/` | Loading event files | **0%** (0 / 38) |
| `src/app.js` | Starting the bot | **0%** (0 / 20) |

Files worth noting:

| File | Lines | Notes |
|---|---|---|
| `games/hotpotato.js` | 100% | Only one branch in `winner()` not taken |
| `games/horserace.js` | 100% | |
| `economy/rates.js` | 100% | |
| `economy/wallet.js` | 100% | |
| `games/minigolf.js` | 99% | |
| `games/hangman.js` | 92% | Lines 115-125 not reached |
| `games/poker.js` | 89% | Only 52% of functions called |
| `games/songguess.js` | 86% | Lines 177-209, the Deezer download code, not reached |
| `games/minigolfCards.js` | 84% | Several card types never played in a test |
| `games/tictactoe.js` | 61% | Lines 170-231, the Discord buttons, not reached |
| `economy/bank.js` | 59% | Only 1 of 18 helper functions called |
| `games/minigolfRound.js` | **0%** | 341 lines, no test imports it |
| `games/songguessRound.js` | **0%** | 64 lines, no test imports it |
| `economy/commands.js` | **0%** | `/points`, `/convert`, `/leaderboard` |

### Findings

1. **The game rules are well tested.** 80% of the lines in `src/games/` run
   during the tests, and four files reach 100%. Keeping the rules apart from
   Discord code (see ARCHITECTURE.md) is what makes this possible.
2. **Nothing that talks to Discord is tested.** Every file in `src/events/`
   is at 0%. That's 1,434 lines, about **27% of the whole bot**, including the
   code that reads players' messages and button clicks. A typo there would pass
   every test and only show up when someone plays.
3. **Two whole game files have no tests at all.** `minigolfRound.js` (341
   lines) and `songguessRound.js` (64 lines) are never imported by a test.
   This matches the complexity report: `shotReport` (complexity 10) lives in
   `minigolfRound.js`.
4. **The dubloon commands are untested.** `economy/commands.js` is at 0% and
   `bank.js` only has 1 of its 18 helpers called. These change players'
   balances and save them to disk, so a bug could cost people dubloons.
5. **Code that mixes rules and Discord is harder to cover.** `tictactoe.js`
   keeps its button handling in the same file as its rules, and its coverage
   (61%) is the lowest of the games that have tests.
6. **Our tooling hid the real numbers.** Until the source map fix, coverage
   looked like 0% everywhere, so nobody could have used it in code review.

### Recommendations

- Add unit tests for `minigolfRound.js` and `songguessRound.js` first, since
  they are pure rules code at 0% and should be easy to test.
- Test the dubloon commands in `economy/commands.js`, and the `bank.js`
  helpers, using a temporary file for `DUBLOONS_FILE` so real balances aren't
  touched.
- For `src/events/`, test with fake Discord objects (a plain object with a
  `reply` function that records what it was called with), starting with
  `hotpotatoMessages.js`, which also has the highest complexity of any event
  handler (11).
- Move tic tac toe's button code into `src/events/` so the rules file can be
  fully covered, like the other games.
- Run `npm run coverage` in GitHub Actions on every pull request so the
  numbers are visible in review.

---

## 5. Threat model (Jennifer)

### Method

This threat model follows the four questions from the Threat Modeling
Manifesto and uses **STRIDE** to answer "What can go wrong?":

| Letter | Threat | Property it breaks |
|---|---|---|
| S | Spoofing | Authentication (who you are) |
| T | Tampering | Integrity (data stays correct) |
| R | Repudiation | Proof of who did what |
| I | Information disclosure | Confidentiality |
| D | Denial of service | Availability |
| E | Elevation of privilege | Authorization (what you're allowed to do) |

### 1. What are we working on?

Arcadia runs as one Node.js program that connects to Discord over the gateway.

```mermaid
flowchart LR
    P[Players] --> D[Discord]
    D -- events --> B["Arcadia bot<br/>(token in .env)"]
    B -- replies --> D
    B -- reads/writes --> F[("data/dubloons.json<br/>balances and points")]
    B -- downloads song clips --> Z[Deezer API]
    G[GitHub repo] -- release branch --> A[GitHub Actions] --> H[Docker image]
```

**What's worth protecting:**

- The **bot token**. Anyone who has it can run a bot as Arcadia.
- **Players' dubloons and game points** in `data/dubloons.json`.
- The bot **staying online** and games working.
- The **code** in our repo and the Docker image built from it.

**Trust boundaries** (where data comes from someone we don't control):
players' messages and button clicks, the Deezer API, and anyone who can push
to the repo.

### 2. What can go wrong?

| # | STRIDE | Threat | Already in place | Risk |
|---|---|---|---|---|
| 1 | Spoofing | The bot token leaks, for example by being pasted into a commit or a chat, and someone runs a fake Arcadia | `.env` is in `.gitignore`; `.env-sample` has no real token | High impact, low chance |
| 2 | Spoofing | One person joins hot potato, horse race or poker with **alt accounts** to farm points, then converts them to dubloons and climbs `/leaderboard` | Hot potato needs 2+ players, but doesn't check they're different people | Medium |
| 3 | Tampering | `data/dubloons.json` is unreadable (bad edit, disk problem). `bank.js` logs an error, starts an **empty bank**, and the next save **overwrites the old file**, wiping everyone's balances | Saves use a temp file and rename, so a crash mid-save can't corrupt it | Medium |
| 4 | Tampering | Someone pushes harmful code straight to `main` | Pull requests and review are our habit, but nothing forces them | Medium |
| 5 | Repudiation | A player says "I bet 500 and lost it unfairly" and there's no record to check | Only the final balance is saved, no history | Low |
| 6 | Information disclosure | `/points` is private, but `/leaderboard` shows everyone's balance in the channel | `/points` replies are ephemeral | Low (game money only) |
| 7 | Denial of service | One user spams commands in many channels. "One game per channel" only limits each channel, and there's no per-user cooldown | One game per channel; bot messages ignored | Medium |
| 8 | Denial of service | **Redeploying wipes all dubloons.** The Docker image doesn't keep `data/` anywhere outside the container, so every new container starts with an empty bank | `data/` is kept out of git | High |
| 9 | Denial of service | The Deezer API is down or changes, and `/songguess` stops working | Depends on Deezer; error handling not covered by tests (see section 4) | Low |
| 10 | Elevation of privilege | A player clicks buttons or sends messages for a game or hand that isn't theirs | Poker checks "that's not your hand"; hot potato's `pass()` checks the holder | Low |
| 11 | Elevation of privilege | The bot is invited with more Discord permissions than it needs | The README invite link asks only for the permissions the games use | Low |
| 12 | Bets | A negative or fractional bet adds dubloons | `spendDubloons` rejects anything that isn't a whole number above 0 | Low, already handled |

### 3. What are we going to do about it?

In order of priority:

1. **Keep dubloons across redeploys (#8).** Mount a volume for `/app/data` in
   the deployment, or move the bank to a hosted database.
2. **Don't wipe balances when the file can't be read (#3).** If loading fails
   for any reason other than "file doesn't exist," copy the bad file to
   `dubloons.json.broken` before saving anything, or stop the bot with a clear
   error.
3. **Add a per-user cooldown (#7)**, for example one new game every 30 seconds
   per user, across all channels.
4. **Turn on branch protection for `main` (#4)**, requiring one approving
   review, and turn on GitHub **secret scanning** (#1).
5. **Limit point farming (#2)** by capping points per user per hour, or only
   giving points when players have been in the server for a while.
6. **Keep a simple log of bets and payouts (#5)** so disputes can be checked.

### 4. Did we do a good enough job?

This model covers the main parts of the bot, but it was done by one person
from reading the code. It should be **revisited whenever a feature is added**
("continuous refinement over a single delivery"), especially features that
touch dubloons. Threats #3 and #8 should get tests or a deployment check
before more economy features are added.
