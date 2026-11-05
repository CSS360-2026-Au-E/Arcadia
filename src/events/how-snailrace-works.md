# How the snail race code works

Snail race is a betting game for any number of players. Four cartoon snails race across a grassy track in a picture the bot draws, and everyone who bet on the winner wins. Like the other games, the rules are kept separate from the Discord code.

## The files

| File                                 | What it does                                                                                          |
|--------------------------------------|-------------------------------------------------------------------------------------------------------|
| `src/games/snailrace.js`             | The rules: bets, moving the snails, and picking the winner.                                           |
| `src/games/snailracePicture.js`      | Draws the race as a PNG picture: lanes, snails, slime trails, speed lines and the winner's crown.     |
| `src/events/snailraceInteraction.js` | The Discord side: the `/snailrace` command, the bet buttons, and swapping in a new picture each step. |
| `src/events/ready.js`                | Adds `/snailrace` to every server the bot is in, along with the other commands.                       |
| `tests/snailrace.spec.js`            | Checks betting, moving, the finish line, photo finishes, and the picture.                             |

## What happens during one race

1. Someone types `/snailrace`. The bot posts a picture of the starting line with one button per snail. The race is saved in `games`, keyed by the channel ID, so each channel has one race at a time.
2. For 20 seconds, players click a snail to bet on it. `placeBet()` saves the bet. Clicking a different snail switches the bet. The message updates to show how many bets each snail has, and the clicker gets a private note.
3. When betting closes, the buttons are removed and the race starts.
4. Every 2 seconds, `moveSnails()` moves each snail forward 0, 1 or 2 steps at random. The bot edits the same message with a new picture from `drawRace()`, which is what makes the snails look like they're moving.
5. When a snail reaches the finish line, `pickWinner()` picks the winner. If more than one snail crossed on the same step, it picks one of them at random (a photo finish).
6. The last picture puts a gold crown on the winner. `winningBettors()` lists everyone who picked the winner, and the bot @mentions them.

## How the picture works

`drawRace()` in `src/games/snailracePicture.js` colors the picture one dot at a time, then saves it as a PNG. It uses Node's built-in `zlib`, like the minigolf picture, so there is nothing extra to install.

Everything is made from four shapes: rectangles, circles, lines and triangles.

- **Lanes:** stripes of light and dark green rectangles, with a checkered finish line made of small black and white squares.
- **Snails:** a row of overlapping circles for the body, a circle for the head, two lines with circles on top for the eye stalks, and circles of shrinking size for the swirly shell.
- **Slime trail:** a see-through light blue rectangle from the start line to the snail.
- **Speed lines:** three white lines behind any snail that moved 2 steps on the last turn.
- **Crown:** a rectangle and three triangles in gold, drawn above the winner.

Each step, the bot edits the message with a new picture and removes the old one. Discord only lets a bot edit a message about 5 times every 5 seconds, so `STEP_SECONDS` should stay at 1 or more.

## Change how it feels

The settings at the top of `src/games/snailrace.js` control the game:

- `SNAILS`: the names and button emoji. To add a fifth snail, add it here and add a shell color to `SHELL_COLORS` in `snailracePicture.js`.
- `TRACK_LENGTH`: a longer track makes a longer race.
- `BET_SECONDS`: how long betting stays open.
- `STEP_SECONDS`: how long the bot waits between steps.

## Try it

- `npm test` runs the checks in `tests/snailrace.spec.js`.
- `npm start` runs the bot. Type `/snailrace` in your server.
