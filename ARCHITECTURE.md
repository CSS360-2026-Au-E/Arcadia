# Arcadia Architecture Guide

Arcadia is a Discord bot that turns a server into a small arcade. Players type a slash command such as `/hangman` and play the game right in the channel. This guide explains how the bot is built, for three readers: a teammate adding a new game, a player curious how it works, and anyone reviewing our code.

## Contents

1. [Overview and system context](#1-overview-and-system-context) (Amrit)
2. [Code design: minigolf modules, and how to add a new game](#2-code-design-minigolf-modules-and-how-to-add-a-new-game) (Abhi)
3. [Game flow: one Hot Potato round](#3-game-flow-one-hot-potato-round) (Jennifer)
4. [Network and tooling: how the bot connects and runs](#4-network-and-tooling-how-the-bot-connects-and-runs) (Jason)

---

## 1. Overview and system context

### What talks to what

Arcadia never runs inside Discord. It is a Node.js program that runs somewhere else (for us, a GitHub Codespace) and keeps a live connection open to Discord. Players only ever see Discord. Discord passes their messages and slash commands to the bot, and the bot sends its replies back through Discord.

```mermaid
flowchart LR
    Player([Player in a Discord server])
    Discord[Discord servers]
    Bot["Arcadia bot<br/>(Node.js + discord.js)"]
    Codespace[GitHub Codespace]
    GitHub[(GitHub repo<br/>CSS360-2026-Au-E/Arcadia)]
    Dev([Team developer])

    Player -- "types /hangman or a letter" --> Discord
    Discord -- "events: messages, slash commands, button clicks" --> Bot
    Bot -- "replies, edited messages, buttons" --> Discord
    Discord -- "shows the game" --> Player
    Codespace -- "runs npm start" --> Bot
    Dev -- "push / pull requests" --> GitHub
    GitHub -- "code is cloned into" --> Codespace
```

| Part | What it does |
|---|---|
| Player | Types commands and guesses in a Discord channel. Needs nothing installed. |
| Discord | Hosts the server and channels. Sends every event the bot asked for to the bot, and shows what the bot sends back. |
| Arcadia bot | Our code. Decides what each event means and what to reply. |
| GitHub Codespace | The cloud computer where the bot actually runs while we develop and demo. |
| GitHub repo | Where the code lives. Every change goes in through a pull request. |

### How the code is organized

The code has two kinds of files, kept in two folders on purpose:

- **`src/games/`** holds the **rules** of each game. These files never talk to Discord. For example, `hangman.js` only knows how to pick a word, check a guess and draw the gallows. Because the rules are plain functions, we can test them with Mocha (`tests/hangman.spec.js`) without a Discord server.
- **`src/events/`** holds the **Discord glue**. Each file listens for one kind of Discord event, reads what the player did, calls the rules in `src/games/`, and sends the answer back.

This split means a bug in "how hangman works" lives in one place, and a bug in "how we talk to Discord" lives in another.

### How the bot starts

1. `npm start` builds the code with esbuild and runs `build/app.js`. The secret bot token comes from the `.env` file.
2. `src/app.js` creates the discord.js `Client`. It asks Discord for four kinds of events (called intents): servers, server members, messages, and the text inside messages.
3. `loadEvents()` in `src/helpers/loadEvents.js` reads **every** `.js` file in `src/events/`. Each file exports an object with a `name` (which Discord event), an `execute` function, and an optional `once`. The loader hooks each one up with `client.on(name, execute)`.
4. The bot logs in. Discord fires the `ready` event once, and `src/events/ready.js` registers the five slash commands (`/hangman`, `/songguess`, `/minigolf`, `/hotpotato`, `/tictactoe`) in every server the bot is in.

The loader in step 3 is the key pattern in this bot. Nobody has to edit `app.js` to add a feature. You drop a new file in `src/events/` and it is picked up the next time the bot starts. Several files can listen to the same event. For example, `messageCreate.js`, `hotpotatoMessages.js` and `songguessMessages.js` all run on every message, and each one ignores messages that are not meant for its game.

### Data flow: one hangman guess

This diagram follows a single typed letter through the system. It uses data flow diagram notation: rounded boxes are things outside our code, plain boxes are steps our code does, and the cylinder is stored data.

```mermaid
flowchart TD
    P([Player]) -- "types the letter e" --> D([Discord])
    D -- "messageCreate event<br/>(author, channelId, content)" --> M["1. messageCreate.js<br/>filter the message"]
    M -- "author is a bot,<br/>or not 1 character" --> X[[ignored]]
    M -- "channelId" --> S[("games Map<br/>one game per channel")]
    S -- "game object<br/>(word, guessed, wrong)" --> M
    M -- "game + letter" --> G["2. hangman.js guess()<br/>apply the rules"]
    G -- "updated game" --> S
    G -- "result: hit, miss, repeat,<br/>won, lost or invalid" --> R["3. messageCreate.js<br/>build the reply with showGame()"]
    R -- "won or lost: delete game" --> S
    R -- "reply text<br/>(gallows + hidden word)" --> D
    D -- "shows the reply" --> P
```

Step by step:

1. **Filter.** `messageCreate.js` drops messages from bots (so the bot never answers itself) and anything longer than one character, so people can still chat during a game. It looks up the channel's game in the `games` Map. If that channel has no game, it stops.
2. **Apply the rules.** `guess()` in `hangman.js` lowercases the letter and checks it against the word. It returns one word that says what happened: `invalid`, `repeat`, `hit`, `miss`, `won` or `lost`. It also updates the game object (adds the letter, counts a wrong guess).
3. **Reply.** `messageCreate.js` turns that result into a message. `showGame()` draws the gallows and the hidden word (`p _ x _ l`) inside a code block, so the picture lines up. When the game is won or lost, the game is deleted from the Map so the channel is free for a new one.

A game starts the same way from the other side. `/hangman` arrives as an `interactionCreate` event, and `interactionCreate.js` creates a game and stores it in the Map. If the channel already has a game, it replies only to that player (an ephemeral reply) and does not start a second one.

### Design choices and their limits

- **Games live in memory.** The `games` Map is just a variable. It is fast and simple, but every running game is lost when the bot restarts. A database would fix that, at the cost of more setup.
- **One game per channel.** Keying games by channel ID keeps guesses from different games apart without asking players to type a game ID.
- **Anyone in the channel can guess.** Hangman is a group game, so the bot does not track turns.

---

## 2. Code design: minigolf modules, and how to add a new game

Minigolf is the biggest game in Arcadia, with nine files. Like hangman (section 1), it keeps the game rules apart from the Discord code. The rules are split into small files, and each file has one job.

### What happens on one shot

This diagram follows one shot, from the player clicking **Shoot** to the new picture showing up in Discord. It uses the same shapes as the hangman diagram: rounded shapes are things outside our code, numbered boxes are our files in the order they run, and cylinders are stored data.

```mermaid
flowchart TD
    P([Player]) -- "clicks Shoot" --> D([Discord])
    D -- "button click event" --> C["1. minigolfControls.js<br/>is this a minigolf button?<br/>is it this player's turn?"]
    C -- "not minigolf,<br/>or not your turn" --> X[[ignored]]
    C -- "channel" --> S[("games Map<br/>one game per channel")]
    S -- "the game:<br/>players, balls, strokes" --> C
    C -- "game + aim + power" --> G["2. minigolf.js<br/>take the shot, add a stroke,<br/>pick who goes next"]
    G -- "ball, aim, power,<br/>traps and cards in play" --> PH["3. minigolfPhysics.js<br/>roll the ball across the course"]
    H[("minigolfCourses.js<br/>the hole maps")] -- "walls, water, slopes" --> PH
    PH -- "where the ball stopped,<br/>did it go in?" --> G
    G -- "updated game" --> S
    G -- "shot result" --> R["4. minigolfRound.js<br/>write the message"]
    R -- "course + ball path" --> PIC["5. minigolfPicture.js<br/>draw the course picture"]
    PIC -- "PNG image" --> R
    R -- "message + picture +<br/>next player's buttons" --> D
    D -- "shows the shot" --> P
```

In words:

1. **minigolfControls.js** gets every button click. It ignores clicks that aren't minigolf buttons (their ids start with `mg:`) or that come from someone whose turn it isn't. Then it looks up this channel's game.
2. **minigolf.js** takes the shot. It counts the stroke and picks who goes next.
3. **minigolfPhysics.js** rolls the ball. It reads the walls, water and slopes from the hole map in **minigolfCourses.js**, and it uses any traps or cards in play. It reports where the ball stopped and whether it went in.
4. **minigolfRound.js** writes the message about the shot.
5. **minigolfPicture.js** draws a new picture of the course with the ball's path on it. The message, the picture and the next player's buttons go back to Discord.

### What each file does

| File | Its job | Uses Discord? |
|---|---|---|
| `events/minigolfCommand.js` | Starts a game when someone types `/minigolf` | Yes |
| `events/minigolfControls.js` | Handles every minigolf button click | Yes |
| `games/minigolfRound.js` | Writes the messages and buttons, and moves the game from hole to hole | Yes |
| `games/minigolf.js` | Keeps track of the game: players, turns, strokes, scores | No |
| `games/minigolfPhysics.js` | Works out where the ball goes | No |
| `games/minigolfTraps.js` | The traps for Sabotage mode | No |
| `games/minigolfCards.js` | The cards for Chaos Cards mode | No |
| `games/minigolfCourses.js` | The 9 holes, drawn as text maps | No |
| `games/minigolfPicture.js` | Draws the course picture | No |

The six rules files never use Discord. That is why `tests/minigolf.spec.js` can test the physics, traps, cards and scoring without running the bot.

### Ideas worth copying

- **Keep the rules away from Discord.** The rules are plain functions that change a game object. The Discord files only turn clicks into function calls, and results into messages. You can test the rules without a bot, and you can change how messages look without breaking the game.
- **One list of buttons.** Every minigolf button id starts with `mg:`, like `mg:shoot` or `mg:pow:3`. `minigolfControls.js` has one table with one entry per button. A new button is one new entry, not another `if` statement.
- **One game per channel.** Games are kept in memory, one per channel. A restart ends every game.
- **Pass the randomness in.** Anything random (cards, traps, the banana peel's spin) uses a `random` function given to the game. Tests give it fixed numbers, so the results are the same every run.
- **Holes are data.** Each hole is a small text map (`T` tee, `O` cup, `#` wall, `~` water). Adding a hole means drawing a map, not writing code.
- **Ignore double clicks.** The game is marked busy while a shot is being worked out, so a double click can't shoot twice.

### How to add a new game

These are the steps we used for minigolf. Say the new game is `/trivia`.

```mermaid
flowchart TD
    A["1. Write the rules<br/>src/games/trivia.js"] --> B["2. Test the rules<br/>tests/trivia.spec.js"]
    B --> C["3. Connect it to Discord<br/>src/events/triviaCommand.js"]
    C --> D["4. Add /trivia to the command list<br/>src/events/ready.js"]
    D --> E["5. Play it in the test server"]
    E --> F["6. Write the docs"]
    F --> G["7. Open a pull request"]
```

1. **Write the rules** in `src/games/trivia.js`. Keep them as plain functions, like `createGame()`, `answer(game, player, text)` and `winners(game)`. Don't use `discord.js` in this file.
2. **Test the rules** in `tests/trivia.spec.js`, using Mocha and Chai like the other tests. `npm test` finds the new file on its own.
3. **Connect it to Discord** with a new file in `src/events/`. It exports `{ name: "interactionCreate", execute }` and returns right away if the command or button isn't for trivia. The bot loads every file in this folder on its own.
4. **Add `/trivia` to the command list** in `src/events/ready.js`, or it won't show up in Discord's menu.
5. **Play it** in the test server with `npm start`. Check what happens when two people click at once, and whether some messages should be seen by only one player.
6. **Write the docs**: a `docs/how-trivia-works.md` page and a row in the README's game list.
7. **Open a pull request** to `main`, and a teammate reviews and merges it.

## 3. Game flow: one Hot Potato round

This section shows what each person and part of the system can do in Hot Potato, then walks through one round. The use-case diagram shows the three actors: the **Host** (the player who types `/hotpotato`), any **Player**, and the bot's **Timer**, which triggers steps on its own. Each oval is something an actor can do. A dashed «include» arrow means one step always happens as part of another (starting a game always adds the host). A dashed «extend» arrow means a step only happens sometimes, under the condition in brackets (the winner is announced only when one player is left).

![Use-case diagram of one Hot Potato round](Host.png)

```mermaid
flowchart TD
    A([/hotpotato]) --> B{Game already in<br/>this channel?}
    B -- yes --> B1[Reply only to that player] --> Z([End])
    B -- no --> C[Create game, add host,<br/>open 30-second join window]
    C --> D[Players type join]
    D --> E{At least 2 players<br/>when time is up?}
    E -- no --> E1[Cancel game] --> Z
    E -- yes --> F[Give potato to a random player,<br/>start secret 10–30 s fuse]
    F --> G[Holder @mentions someone]
    G --> H{Valid pass?}
    H -- no --> G
    H -- yes --> I[Potato moves to new holder]
    I --> J{Fuse ran out?}
    J -- no --> G
    J -- yes --> K[Holder is out]
    K --> L{More than 1<br/>player left?}
    L -- yes --> F
    L -- no --> M[Announce winner,<br/>delete game] --> Z
```

Step by step:

1. **Start.** A player types `/hotpotato`. It arrives as an `interactionCreate` event, and `hotpotatoCommand.js` checks the `games` Map. If the channel already has a game, it replies only to that player (an ephemeral reply) and stops. Otherwise it creates a new game, adds the player who started it, and stores it in the Map.
2. **Join.** The bot opens a 30-second join window. `hotpotatoMessages.js` watches for messages that say `join` and calls `join()` in `hotpotato.js`, which adds the player and returns `joined`, `already` or `closed`. The bot reacts with 🥔 to each new player. Every other message is ignored, so people can still chat.
3. **Close joining.** When the 30 seconds are up, `canStart()` checks for at least 2 players. If there are fewer, the game is cancelled and deleted from the Map.
4. **Hand out the potato.** `startRound()` switches the game to `playing` and gives the potato to a random player. The bot then starts a secret fuse timer. `fuseSeconds()` picks a random length between 10 and 30 seconds, so nobody can predict when it will go off.
5. **Pass.** While the fuse runs, the player holding the potato passes it by @mentioning someone. `pass()` checks three rules in order: the sender must be holding the potato, they can't pass to themselves, and the target must still be in the game. It returns `passed`, `not-holder`, `self` or `not-playing`, and the bot replies to match. A pass from someone who isn't holding the potato gets no reply, so normal chatting doesn't cause spam.
6. **Explode.** When the fuse runs out, `explode()` removes whoever is holding the potato and adds them to the `out` list.
7. **Next round or winner.** If more than one player is left, a new round starts after a 3-second pause (back to step 4). If only one is left, `winner()` returns them, the bot announces the winner, and the game is deleted from the Map so the channel is free for a new one.

### Design choices and their limits

- **Rules and timers are kept apart.** `hotpotato.js` only holds the rules. The timers (`setTimeout`) live in `hotpotatoCommand.js`. That lets the tests call `explode()` directly instead of waiting up to 30 seconds.
- **Timers check that their game still exists.** Before acting, each timer checks the game is still in the Map, so an old timer can't post into a new game.
- **Players are stored by user ID.** IDs never change and are what @mentions contain, so passing works even if someone changes their name.
- **Games live in memory.** Like hangman, a game in progress is lost if the bot restarts.
- **Players who leave stay in the game.** A player who leaves the server mid-game stays in the player list until the potato explodes on them.

---

## 4. Network and tooling: how the bot connects and runs

_ovjason: network diagram (Codespace, token in `.env`, Discord gateway), plus how npm, esbuild and the Docker deploy workflow fit ## 3b. Game flow: one Tic Tac Toe game

This section shows what each person and part of the system can do in Tic Tac Toe, then walks through one game. The use-case diagram shows two actors: the **Player** (the person who runs the command) and the **Bot**, which plays the other side. Each oval is something an actor can do. A dashed «include» arrow means one step always happens as part of another (running the command always shows the board prompt). A dashed «extend» arrow means a step only happens sometimes, under a condition (the final result is shown only when someone wins or the board fills up).

![Use-case diagram of one Tic Tac Toe game](TicTacToe.png)

```mermaid
flowchart TD
    A([Player runs the<br/>tic tac toe command]) --> B[Create game with<br/>empty 3x3 board]
    B --> C[Show board prompt]
    C --> D[Player picks a square]
    D --> E{Square empty?}
    E -- no --> C
    E -- yes --> F[Place player's mark]
    F --> G{Three in a row<br/>or board full?}
    G -- yes --> M[Show final result,<br/>delete game]
    G -- no --> H[Bot picks an empty square<br/>and places its mark]
    H --> I{Three in a row<br/>or board full?}
    I -- yes --> M
    I -- no --> C
    M --> Z([End])
```

Step by step:

1. **Start.** A player runs the tic tac toe command. The bot creates a new game with an empty 3x3 board and stores it. This is player vs the bot only, so nobody else joins and there is no waiting period.
2. **Show the board.** The bot replies with a prompt that shows the current board. Every turn of the game uses this same prompt, updated with the latest marks.
3. **Player's move.** The player picks one square. The player always moves first.
4. **Validate the move.** If the square is already taken, the move is rejected, the board stays the same, and the bot does not take a turn. The prompt stays up so the player can pick again.
5. **Check for a result.** After a mark is placed, the game checks for three matching marks in any row, column or diagonal. If there are none and every square is full, the game is a tie. Either outcome ends the game.
6. **Bot's move.** If the game is still going, the bot places its mark in one of the empty squares. Then the same result check from step 5 runs again.
7. **Repeat or finish.** If nobody has won and squares are left, the bot shows the updated board and the game goes back to step 3. Otherwise the bot shows the final result (player wins, bot wins, or tie) and the game is deleted, so the next command starts a fresh board.

### Design choices and their limits

- **Player vs bot only.** There is no player vs player mode. That keeps the turn order simple: the player and the bot alternate, with no joining or waiting for a second person.
- **One file holds the game.** All tic tac toe code lives in `src/games/tictactoe.js`, so it doesn't interfere with hangman or guess the song.
- **The board is checked after every mark.** The same result check runs after the player's move and after the bot's move, so there is one place that decides wins and ties.
- **Invalid moves are free.** A rejected move doesn't pass the turn to the bot, so a misclick can't cost the player a turn.
- **Games live in memory.** Like the other minigames, a game in progress is lost if the bot restarts.
- **The bot's strategy is simple.** The bot only needs to choose some empty square, so it may not play perfectly and the player can win.
