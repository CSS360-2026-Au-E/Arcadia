# Release notes

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
