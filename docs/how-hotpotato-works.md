# How the hot potato code works

Players pass a potato around by @mentioning each other. A secret timer is
running, and whoever is holding the potato when it runs out is out. Rounds
repeat until one player is left.

## The files

| File | What it does |
| --- | --- |
| `src/games/hotpotato.js` | The rules: who joined, who has the potato, passing, exploding, the winner. No Discord code. |
| `src/events/ready.js` | Adds `/hotpotato` to every server, along with the other games. |
| `src/events/hotpotatoCommand.js` | Runs when someone uses `/hotpotato`. Opens joining, then runs the rounds and their secret timers. |
| `src/events/hotpotatoMessages.js` | Runs on every message. Handles people typing `join`, and the holder passing with an @mention. |

## What happens during one game

1. Someone types `/hotpotato`. They are in automatically.
2. Everyone else has 30 seconds to type `join`. The bot reacts with 🥔.
3. If fewer than 2 people joined, the game is cancelled.
4. `startRound()` hands the potato to a random player, and `fuseSeconds()`
   picks a secret timer between 10 and 30 seconds.
5. The holder passes by typing a message with an @mention, like `@Ben catch!`.
   `pass()` answers `"passed"`, `"not-holder"`, `"self"` or `"not-playing"`,
   and the bot replies to match.
6. When the timer runs out, `explode()` removes whoever is holding it.
7. If more than one player is left, a new round starts. Otherwise the last
   player wins and the game is deleted, so the channel can start a new one.

## Try it

- `npm test` runs the checks in `tests/hotpotato.spec.js`.
- `npm start` runs the bot. Type `/hotpotato` in your server. You need a friend
  (or a second Discord account) to play, since it takes 2 players.
- To change the timing, edit `JOIN_SECONDS`, `SHORTEST_FUSE` and `LONGEST_FUSE`
  at the top of `src/games/hotpotato.js`.
