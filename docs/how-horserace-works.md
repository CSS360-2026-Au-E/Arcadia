# How the horse race code works

Horse race is a betting game for any number of players, like betting at a real racetrack. Five horses race in a picture the bot draws. Each horse has odds, and bets on the winner pay out at those odds. Like the other games, the rules are kept separate from the Discord code.

## The files

| File                                 | What it does                                                                                        |
|--------------------------------------|-----------------------------------------------------------------------------------------------------|
| `src/games/horserace.js`             | The rules: the horses and their odds, coins, bets, moving the horses, and paying out.               |
| `src/games/horseracePicture.js`      | Draws the race as a PNG picture: the track, horses and jockeys, dust clouds and the winner's ribbon. |
| `src/events/horseraceInteraction.js` | The Discord side: the `/horserace` command, the bet buttons, and a new picture each step.           |
| `src/events/ready.js`                | Adds `/horserace` to every server the bot is in, along with the other commands.                     |
| `tests/horserace.spec.js`            | Checks coins, betting, the bailout, galloping, the finish line, payouts and the picture.            |

## What happens during one race

1. Someone types `/horserace`. The bot posts the odds board, a picture of the horses at the gate, and one button per horse. The race is saved in `games`, keyed by the channel ID, so each channel has one race at a time.
2. For 25 seconds, players click horses to bet. Each click calls `placeBet()`, which takes 10 coins from the player's wallet. You can click the same horse again to bet more, or bet on several horses. The **My coins** button shows your bets and coins privately.
3. When betting closes, the buttons are removed and the race starts.
4. Every 2 seconds, `moveHorses()` moves each horse forward. The bot edits the same message with a new picture from `drawRace()`, and a line saying who is in front.
5. When a horse crosses the finish line, `pickWinner()` picks the winner. If more than one horse crossed on the same step, it picks one of them at random (a photo finish).
6. `payOut()` pays everyone who bet on the winner: their bet times the horse's odds. The bot lists every bettor, what they won, and their new coin total.

## Odds and speed

Each horse in `HORSES` has an `odds` number and a `speed` number.

- **Odds** are how many times your bet you get back if that horse wins. Bet 10 coins on a horse that pays 4x and you get 40 back.
- **Speed** is the chance of an extra step each turn. Every step, `gallop()` rolls 0, 1 or 2, then adds 1 more if the horse gets a burst of speed. Faster horses get more bursts, so they win more often.

The odds were picked to match how often each horse really wins. Thunderbolt wins about 1 race in 3, and Long Shot Larry about 1 in 13. The odds pay a little less than that on purpose, just like a real racetrack, so the house wins over time.

## Coins

Everyone starts with 100 coins. The coins live in the `wallets` Map in `horseraceInteraction.js`, so they carry over from race to race, across every channel. If you run out, your next bet gives you 100 more for free (a "bailout"). The coins are only kept in memory, so everyone goes back to 100 when the bot restarts.

## How the picture works

`drawRace()` in `src/games/horseracePicture.js` colors the picture one dot at a time, then saves it as a PNG. It uses Node's built-in `zlib`, like the minigolf picture, so there is nothing extra to install.

Everything is made from five shapes: rectangles, circles, ovals, lines and triangles.

- **Track:** stripes of light and dark dirt, white rails between the lanes, and a checkered finish post.
- **Horse:** an oval body, a thick line for the neck, a small oval head with a triangle ear, lines for the legs and tail, and a white saddle cloth with the horse's number.
- **Running legs:** each step, `frame` goes up by 1, and the legs switch between stretched out and tucked under. That flip is what makes the horses look like they're galloping.
- **Jockey:** an oval shirt and a circle helmet in that horse's color, with an arm holding the reins.
- **Dust cloud:** see-through circles behind any horse that just got a burst of speed.
- **Winner:** a gold rosette with red ribbons.

Each step, the bot edits the message with a new picture and removes the old one. Discord only lets a bot edit a message about 5 times every 5 seconds, so `STEP_SECONDS` should stay at 1 or more.

## Change how it feels

The settings at the top of `src/games/horserace.js` control the game:

- `HORSES`: names, button emoji, odds and speed. Discord allows 5 buttons in a row, so keep it at 5 horses or fewer.
- `TRACK_LENGTH`: a longer track makes a longer race.
- `BET_SECONDS`: how long betting stays open.
- `BET_SIZE`: how many coins one click bets.
- `STARTING_COINS`: how many coins everyone starts with.

## Try it

- `npm test` runs the checks in `tests/horserace.spec.js`.
- `npm start` runs the bot. Type `/horserace` in your server.
