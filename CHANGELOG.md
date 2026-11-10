# Release notes

## v1.1 (dubloons)

Arcadia now has money. Win games to earn points, turn them into dubloons, and bet them.

### New

- **Dubloons.** Every game gives its own points for a win. `/convert` turns them into dubloons at each game's exchange rate, `/points` shows what you have, and `/leaderboard` ranks the server. New players start with 100 dubloons, and dubloons are saved to `data/dubloons.json` so they survive a restart. (abhip1008)
- `/blackjack`: bet dubloons against the dealer. Hit, stand or double. (abhip1008)
- `/slots`: a three-reel slot machine that bets dubloons. (abhip1008)

### Changes

- `/horserace` bets dubloons instead of its own coins. The free 100-coin refill when you run out is gone; play games and `/convert` instead.
- Each game owner sets their game's exchange rate in `src/economy/rates.js` (see [how dubloons work](docs/how-dubloons-work.md#set-your-games-exchange-rate)).
- New docs: how dubloons, blackjack and slots work.

## v1.0 (sprint 1)

The first full version of Arcadia: five games you can play in any Discord server the bot is in.

### Games

- `/hangman`: guess the secret word one letter at a time. (am-pngg)
- `/songguess`: pick a genre and an era, then name the song from a clip that gets longer each time you skip. (abhip1008)
- `/minigolf`: turn-based minigolf for 1 to 8 players with two modes, Sabotage (everyone hides a trap before each hole) and Chaos Cards (cards that bend the rules). 3, 6 or 9 holes. (abhip1008)
- `/hotpotato`: pass the potato by @mentioning someone before the secret timer runs out. (cpukarma)
- `/tictactoe`: play against the bot on easy, medium or hard. (ovjason)

### Other changes

- New members get a welcome message in `#general`.
- Each game has a "how the code works" page in `docs/`.
- The tic tac toe tests now use chai like the rest of the tests, so `npm test` passes (77 tests).

### Running it

See "Run the bot yourself" in the README. The bot needs the **Attach Files** permission for song clips and minigolf pictures.
