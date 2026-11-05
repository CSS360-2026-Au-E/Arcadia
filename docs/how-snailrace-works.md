# How the snail race code works

Snail race is a betting game for any number of players. Four snails race across an emoji track, and everyone who bet on the winner wins. Like the other games, the rules are kept separate from the Discord code.

## The files

| File                                 | What it does                                                                                          |
|--------------------------------------|-------------------------------------------------------------------------------------------------------|
| `src/games/snailrace.js`             | The rules: bets, moving the snails, picking the winner, and drawing the track as emoji text.          |
| `src/events/snailraceInteraction.js` | The Discord side: the `/snailrace` command, the bet buttons, and editing the message during the race. |
| `src/events/ready.js`                | Adds `/snailrace` to every server the bot is in, along with the other commands.                       |
| `tests/snailrace.spec.js`            | Checks betting, moving, the finish line, photo finishes, and the track drawing.                       |

## What happens during one race

1. Someone types `/snailrace`. The bot posts the starting line with one button per snail. The race is saved in `games`, keyed by the channel ID, so each channel has one race at a time.
2. For 20 seconds, players click a snail to bet on it. `placeBet()` saves the bet. Clicking a different snail switches the bet. The message updates to show how many bets each snail has, and the clicker gets a private note.
3. When betting closes, the buttons are removed and the race starts.
4. Every 1.5 seconds, `moveSnails()` moves each snail forward 0, 1 or 2 steps at random. The bot edits the same message with the new track from `drawTrack()`, which is what makes the snails look like they're moving.
5. When a snail reaches the finish line, `pickWinner()` picks the winner. If more than one snail crossed on the same step, it picks one of them at random (a photo finish).
6. `winningBettors()` lists everyone who picked the winner, and the bot @mentions them.

## How the "animation" works

There are no pictures. The track is plain text made of emoji, like this:

```
🔴 🏁▫️▫️▫️▫️▫️▫️▫️▫️🐌▫️▫️▫️▫️ Turbo
```

The snails race right to left, because Discord's snail emoji faces left. Each step, the bot edits the message with a new version of that text. Discord only lets a bot edit a message about 5 times every 5 seconds, so `STEP_SECONDS` should stay at 1 or more.

## Change how it feels

The settings at the top of `src/games/snailrace.js` control the game:

- `SNAILS`: the names and lane colors. Add a fifth snail here and it gets its own button and lane.
- `TRACK_LENGTH`: a longer track makes a longer race.
- `BET_SECONDS`: how long betting stays open.
- `STEP_SECONDS`: how long the bot waits between steps.

## Try it

- `npm test` runs the checks in `tests/snailrace.spec.js`.
- `npm start` runs the bot. Type `/snailrace` in your server.
