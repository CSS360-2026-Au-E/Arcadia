# How the minigolf code works

`/minigolf` is turn-based minigolf for 1 to 8 players. The host picks a **mode**
and, if they want, how many **holes** (3, 6 or 9; 6 if they skip it). The bot
opens a lobby with **Join**, **Start** and **Cancel** buttons. Lowest total
strokes after the last hole wins.

## The two modes

**Sabotage.** Before each hole, every player secretly drops one trap on the
course for everyone else. Each player gets 3 random traps to choose from and
picks a square (A1 to L8, printed around the picture). The player in last place
places first. Nobody sees the traps until everyone is done, then the bot shows
them all with who placed them. Traps can't go on the tee, the cup, or the squares
right next to the cup.

| Trap | What it does |
| --- | --- |
| 🍌 Banana peel | Ball spins off in a random direction |
| 🌬️ Fan | Pushes the ball about 2 squares one way |
| 🟢 Sticky goo | Ball stops dead on this square |
| 🔴 Bumper | Bounces the ball back hard |
| 🧱 Moving wall | A wall that slides one square after every shot |
| 🕳️ Fake cup | Looks like the cup. A slow ball stops there, +1 stroke |
| 🟣 Teleporter | Sends the ball to a random empty square |
| 🏖️ Sand pit | Ball slows down a lot while crossing it |

**Chaos Cards.** Everyone holds 3 cards (click **My cards** to see them). On your
turn, before you shoot, you can play one card per hole. At the start of each hole
everyone draws back up to 3, and last place draws up to 4.

| Card | Who | What it does |
| --- | --- | --- |
| ↩️ Mulligan | You | Redo your last shot |
| 💪 Super putt | You | Your next shot rolls 60% further |
| 👻 Ghost ball | You | Your next shot goes through walls |
| 🧲 Magnet cup | You | The cup pulls your ball in from nearby this hole |
| 🪞 Mirror | Someone | Their next shot goes the opposite way they aim |
| 🤏 Tiny cup | Someone | Their ball must stop right on the cup this hole |
| 🧊 Ice rink | Someone | Their ball slides twice as far this hole |
| 🔄 Swap | Someone | Swap ball spots with them |
| 🙃 Gravity flip | Everyone | Slopes push the other way this hole |
| 💨 Wind gust | Everyone | Every shot drifts right this hole |
| 🪣 Big cup | Everyone | Every cup gets bigger this hole |
| 🔀 Shuffle | Everyone | Everyone passes their hand to the next player |

## Taking a shot

On your turn the bot posts the course with three rows of controls that only you
can use: a menu of 16 directions, **Power 1** to **Power 5**, and **Shoot**. Aim
starts pointed at the cup with power 3. After the shot, the bot posts a new
picture with the ball's path as a dotted line and says what happened ("Bounced off
a wall", "Hit Sam's banana peel!").

- Players take turns, worst score first. Balls don't hit each other.
- At most 8 strokes a hole. Water and the fake cup each add 1 stroke.
- There's no timer. If someone leaves, the host clicks **Skip turn**, and that
  player takes 8 for the hole. During trap time the host can **Skip** a player,
  and the bot drops a random trap for them.

## The physics

Each hole is a 12 by 8 grid. The ball moves in tiny steps:

- Power 1 to 5 rolls 1.5, 3, 5, 8 or 12 squares on flat grass. The ball slows
  down by the same amount every moment, so the same power always rolls the same
  distance.
- Walls bounce the ball like a mirror and take 20% of its speed.
- Slopes push the ball while it rolls over them.
- The ball drops in when it rolls over the cup slowly enough. Too fast and it
  skips right over, so smashing it at power 5 usually doesn't work.

The same shot always ends in the same place, unless it hits a random trap like the
banana peel. That keeps it fair and lets the tests check exact results.

## The holes

The holes are text maps in `src/games/minigolfCourses.js`. To add one, copy a map
and change the letters: `.` grass, `#` wall, `T` tee, `O` cup, `~` water, and
`>` `<` `^` `v` for slopes. A game uses the first 3, 6 or 9 holes, from the
easiest up.

## The pictures

`src/games/minigolfPicture.js` draws each picture pixel by pixel and saves it as a
PNG with Node's built-in `zlib`, so there's nothing extra to install. It draws the
grass, walls, water, slope arrows, the cup and flag, traps, each player's ball in
their color, and the last shot's path.

## The files

| File | What it does |
| --- | --- |
| `src/games/minigolf.js` | The game: players, turns, strokes, holes, placing traps. No Discord code. |
| `src/games/minigolfCourses.js` | The hole maps and square names (A1 to L8). |
| `src/games/minigolfPhysics.js` | Moves the ball for one shot and reports what it hit. |
| `src/games/minigolfTraps.js` | The trap list and where traps are allowed. |
| `src/games/minigolfCards.js` | The card list and what each card does. |
| `src/games/minigolfPicture.js` | Draws the course PNG. |
| `src/games/minigolfRound.js` | The Discord side: lobby, pictures, buttons, scoreboards, moving between holes. |
| `src/events/minigolfCommand.js` | Runs when someone uses `/minigolf` and opens the lobby. |
| `src/events/minigolfControls.js` | Runs when someone clicks a minigolf button or menu. Every id starts with `mg:`. |
| `src/events/ready.js` | Adds `/minigolf` (with its mode and holes options) to every server. |
| `tests/minigolf.spec.js` | Tests for the physics, every trap, every card, turns and scoring. |

## What happens during one game

1. The host types `/minigolf` and picks a mode. Players click **Join**, then the
   host clicks **Start**.
2. Each hole starts with trap time (Sabotage) or a fresh hand of cards (Chaos Cards).
3. Players take turns shooting until everyone has holed out or hit 8 strokes.
4. The bot posts the scoreboard and moves to the next hole.
5. After the last hole, the bot names the winner and posts everyone's strokes.
