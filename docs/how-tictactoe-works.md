# How the tic tac toe code works

Tic tac toe is a one-player game against the bot. The player is X and the bot is O. Like hangman, the rules are kept separate from the Discord code.

## The files

| File                                 | What it does                                                                                          |
|--------------------------------------|-------------------------------------------------------------------------------------------------------|
| `src/games/tictactoe.js`             | The rules (board, win check, bot moves) and the Discord code (command, buttons, cleanup).             |
| `src/events/ready.js`                | Adds `/tictactoe` to every server the bot is in, along with the other commands.                       |
| `src/events/tictactoeInteraction.js` | Runs on every interaction. Handles `/tictactoe` and its board buttons, and ignores everything else.   |
| `tests/tictactoe.spec.js`            | Checks for the win, draw, and bot logic.                                                              |

## What happens during one game

1. Someone types `/tictactoe` and optionally picks a difficulty (easy, medium or hard).
2. `startGame()` creates an empty board and sends it as a 3x3 grid of buttons. The game is saved in `games`, keyed by the message ID.
3. The player clicks a square. `handleMove()` checks that the game exists and belongs to the person who clicked.
4. `playTurn()` places X, checks for a win or draw, then lets the bot place O and checks again. It returns `"won"`, `"lost"`, `"draw"`, `"continue"` or `"invalid"`.
5. The message is updated with the new board. When the game ends, the buttons are disabled and the game is deleted.
6. A game nobody finishes is cleaned up after 5 minutes.

## Difficulty

- **Easy:** the bot picks a random empty square.
- **Medium:** half the time it plays the best move, half the time a random one.
- **Hard:** it uses minimax to always play the best move, so you can only draw or lose.

## Try it

- `npm test` runs the checks in `tests/tictactoe.spec.js`.
- `npm start` runs the bot. Type `/tictactoe` in your server.