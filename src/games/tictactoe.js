import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";

/*
  TIC TAC TOE (player vs bot)

  The top half knows only the rules and the bot's brain. The bottom half
  talks to Discord. The player is X and the bot is O.

  A "game" is a plain object:
    {
      board: [" ", " ", " ", " ", " ", " ", " ", " ", " "],  // 9 squares
      playerId: "123...",   // the Discord user who owns this game
      difficulty: "hard",   // "easy", "medium" or "hard"
    }
*/

// ---------- Game logic ----------

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function createGame(playerId, difficulty = "hard") {
  return { board: Array(9).fill(" "), playerId, difficulty };
}

// Returns "X", "O", "draw", or null if the game is still going.
export function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== " " && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.includes(" ") ? null : "draw";
}

// Bot is "O" (maximizing). +1 bot wins, -1 player wins, 0 draw.
function minimax(board, botTurn) {
  const result = checkWinner(board);
  if (result === "O") return 1;
  if (result === "X") return -1;
  if (result === "draw") return 0;

  const scores = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === " ") {
      board[i] = botTurn ? "O" : "X";
      scores.push(minimax(board, !botTurn));
      board[i] = " ";
    }
  }
  return botTurn ? Math.max(...scores) : Math.min(...scores);
}

// Pick the bot's square (0 to 8).
export function botMove({ board, difficulty }) {
  const open = board.map((c, i) => (c === " " ? i : null)).filter((i) => i !== null);
  const smart = difficulty === "hard" || (difficulty === "medium" && Math.random() < 0.5);
  if (!smart) return open[Math.floor(Math.random() * open.length)];

  let best = -2;
  let bestMove = open[0];
  for (const i of open) {
    board[i] = "O";
    const score = minimax(board, false);
    board[i] = " ";
    if (score > best) {
      best = score;
      bestMove = i;
    }
  }
  return bestMove;
}

/*
  The player (X) moves, then the bot (O) replies.
  Returns "invalid" | "won" | "lost" | "draw" | "continue"
*/
export function playTurn(game, index) {
  const { board } = game;
  if (board[index] !== " ") return "invalid";

  board[index] = "X";
  let result = checkWinner(board);
  if (result === "X") return "won";
  if (result === "draw") return "draw";

  board[botMove(game)] = "O";
  result = checkWinner(board);
  if (result === "O") return "lost";
  if (result === "draw") return "draw";
  return "continue";
}

// ---------- Discord side ----------

// Every game running right now, keyed by the board message's ID.
// Games live in memory, so they disappear when the bot restarts.
const games = new Map();
const TIMEOUT_MS = 5 * 60 * 1000;

const MESSAGES = {
  continue: "Your turn! You're X, I'm O.",
  won: "You win!",
  lost: "I win! Better luck next time.",
  draw: "It's a draw!",
};

// The /tictactoe command as Discord shows it in the "/" menu.
// ready.js adds this to the list of commands it registers.
export const tictactoeCommand = new SlashCommandBuilder()
  .setName("tictactoe")
  .setDescription("Play tic tac toe against the bot")
  .addStringOption((option) =>
    option
      .setName("difficulty")
      .setDescription("How smart the bot is")
      .setRequired(false)
      .addChoices(
        { name: "Easy", value: "easy" },
        { name: "Medium", value: "medium" },
        { name: "Hard (unbeatable)", value: "hard" }
      )
  );

// Turn a game into a 3x3 grid of buttons.
function buildBoard(game, disabled = false) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const cell = game.board[i];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${i}`)
          .setLabel(cell === " " ? "\u200b" : cell)
          .setStyle(
            cell === "X" ? ButtonStyle.Primary
            : cell === "O" ? ButtonStyle.Danger
            : ButtonStyle.Secondary
          )
          .setDisabled(disabled || cell !== " ")
      );
    }
    rows.push(row);
  }
  return rows;
}

// Called 5 minutes after a game starts. Cleans up games nobody finished.
async function expire(message) {
  const game = games.get(message.id);
  if (!game) return;
  games.delete(message.id);
  try {
    await message.edit({ content: "Game timed out.", components: buildBoard(game, true) });
  } catch {
    // The message was deleted or we can't edit it. Nothing more to do.
  }
}

async function startGame(interaction) {
  const difficulty = interaction.options.getString("difficulty") ?? "hard";
  const game = createGame(interaction.user.id, difficulty);

  await interaction.reply({
    content: `Tic tac toe vs the bot (${difficulty})! You're X, I'm O. Your move.`,
    components: buildBoard(game),
  });
  const message = await interaction.fetchReply();
  games.set(message.id, game);
  setTimeout(() => expire(message), TIMEOUT_MS);
}

async function handleMove(interaction) {
  const game = games.get(interaction.message.id);
  if (!game) {
    return interaction.reply({
      content: "That game is over. Start a new one with /tictactoe.",
      ephemeral: true,
    });
  }
  if (interaction.user.id !== game.playerId) {
    return interaction.reply({
      content: "That's not your game. Start your own with /tictactoe!",
      ephemeral: true,
    });
  }

  const index = Number(interaction.customId.split(":")[1]);
  const status = playTurn(game, index);
  if (status === "invalid") {
    return interaction.reply({ content: "That square is taken.", ephemeral: true });
  }

  const over = status !== "continue";
  if (over) games.delete(interaction.message.id);
  await interaction.update({ content: MESSAGES[status], components: buildBoard(game, over) });
}

// Called for every interaction. Does nothing unless it belongs to tic tac toe.
// Returns true if it handled the interaction.
export async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === "tictactoe") {
    await startGame(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId.startsWith("ttt:")) {
    await handleMove(interaction);
    return true;
  }
  return false;
}