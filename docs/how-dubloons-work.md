# How dubloons work

Dubloons are Arcadia's money. You earn points by playing the normal games, turn them into dubloons with `/convert`, and then bet them on `/blackjack`, `/slots`, `/poker` and `/horserace`. `/leaderboard` ranks everyone in the server by dubloons.

## The commands

| Command | What it does |
|---|---|
| `/points` | Shows you (only you) your dubloons and the points you have in each game. |
| `/convert` | Turns all your game points into dubloons. Pick a game to convert only that one. |
| `/leaderboard` | The top 10 dubloon holders in this server, plus your own rank. |

New players start with 100 dubloons, so they can try the gambling games right away.

## How points become dubloons

Every game keeps its **own** points. Winning hangman gives you hangman points, finishing minigolf gives you minigolf points, and so on. They stay separate until you type `/convert`.

Each game has an exchange rate, like "100 hangman points are worth 10 dubloons." If you have 250 hangman points, `/convert` gives you 25 dubloons. Points that don't make a whole dubloon stay in the game for next time. With a rate of 100 points for 5 dubloons, 250 points become 12 dubloons and 10 points are left over.

## Set your game's exchange rate

**Each game's owner sets their own rate in one file: `src/economy/rates.js`.** Your game has one line there:

```js
hangman: { name: "Hangman", points: 100, dubloons: 10 },
```

Read it as a sentence: "100 Hangman points are worth 10 dubloons."

1. Open `src/economy/rates.js` and find your game's line.
2. Change the two numbers. Both must be whole numbers above 0.
3. Run `npm test`. A test checks every rate and fails if one is broken.
4. Open a pull request.

A rate of `points: 100, dubloons: 20` makes your points worth twice as much. Pick a rate that makes one normal win worth roughly the same as a win in the other games, so no game is the "best" way to get rich.

## How many points each game gives

The points for each game are set in `src/economy/earnings.js`. Each game has one small function you can change.

| Game | Points |
|---|---|
| Hangman | Win: 100, plus 10 for every life you had left. |
| Song Guesser | Name the song: 300 on the first clip, then 250, 200, 150, 100, 50 as the clip gets longer. |
| Minigolf | Each hole: 100 for a hole in one, 60 for 2 strokes, 40 for 3, 20 for 4, 10 for 5 to 7. At the end, 300 for 1st, 150 for 2nd, 75 for 3rd (not in a solo game, and never for last place). |
| Hot Potato | 20 for every round you survived. The winner gets 200 more. |
| Tic Tac Toe | Win: 50 on easy, 100 on medium, 300 on hard. Draw: 30. |

## The files

| File | What it does |
|---|---|
| `src/economy/rates.js` | The exchange rate for each game. Teammates edit this. |
| `src/economy/earnings.js` | How many points each game hands out. |
| `src/economy/wallet.js` | The rules: adding points, spending dubloons, converting, ranking. No Discord and no files, so it's easy to test. |
| `src/economy/bank.js` | Saves everyone's dubloons and points to `data/dubloons.json`, so they survive a restart. Games call `awardPoints()` from here. |
| `src/economy/commands.js` | The `/points`, `/convert` and `/leaderboard` commands and their messages. |
| `src/events/dubloonsInteraction.js` | Sends those three commands to `commands.js`. |
| `tests/economy.spec.js` | Checks the rates, earnings, converting and the leaderboard. |

## Where the dubloons are saved

`bank.js` keeps everyone's account in `data/dubloons.json`. Each account looks like this:

```json
"111": { "dubloons": 140, "points": { "hangman": 30, "minigolf": 0 }, "servers": ["999"] }
```

`servers` is the list of servers the player has played in, so each server's `/leaderboard` only shows its own players. The file is saved whole every time something changes. It is written to a temporary file first and then renamed, so a crash can't leave half a file behind.

The `data/` folder is in `.gitignore`, so nobody's dubloons get pushed to GitHub. To start everyone over, stop the bot and delete `data/dubloons.json`. To keep the file somewhere else, set `DUBLOONS_FILE` in `.env`.

## Add points to a new game

1. Add a line for the game to `RATES` in `src/economy/rates.js`.
2. Add a function to `src/economy/earnings.js` that works out the points.
3. When someone wins, call `awardPoints(userId, "yourgame", points, interaction.guildId)` from `src/economy/bank.js`, and tell them in the message.
4. Add a test for the new function to `tests/economy.spec.js`.

`/convert` and `/points` pick up the new game on their own.
