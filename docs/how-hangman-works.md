# How the hangman code works

The bot is a small Node.js program. Discord sends it "events" (someone joined,
someone typed a message, someone used a slash command), and each file in
`src/events/` handles one kind of event. The template loads every file in that
folder automatically, so adding a file there is all it takes to handle a new event.

## The four files

| File | What it does |
| --- | --- |
| `src/games/hangman.js` | The rules: pick a word, check a guess, draw the picture. No Discord code. |
| `src/events/ready.js` | Runs once when the bot logs in. Adds `/hangman` to every server the bot is in. |
| `src/events/interactionCreate.js` | Runs when someone uses `/hangman`. Starts a game in that channel. |
| `src/events/messageCreate.js` | Runs on every message. If a game is running and the message is one letter, it counts as a guess. |

## What happens during one game

1. Someone types `/hangman`.
2. `interactionCreate.js` calls `createGame()`, which picks a random word.
   It saves the game in `games`, keyed by the channel.
3. The bot replies with the empty gallows and blanks, like `_ _ _ _ _`.
4. Someone types `e`.
5. `messageCreate.js` finds the game for that channel and calls `guess(game, "e")`.
6. `guess` answers `"hit"`, `"miss"`, `"repeat"`, `"won"` or `"lost"`, and the bot replies to match.
7. On `"won"` or `"lost"` the game is deleted, so the channel can start a new one.

## Try it

- `npm test` runs the checks in `tests/hangman.spec.js`.
- `npm start` runs the bot. Type `/hangman` in your server.
- To add words, edit the `WORDS` list at the top of `src/games/hangman.js`.
