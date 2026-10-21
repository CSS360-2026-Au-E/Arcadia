import { createGame, games, showGame } from "../games/hangman";

// "interactionCreate" runs every time someone uses a slash command.
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    // We only care about the /hangman command.
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "hangman") return;

    // Only one game per channel at a time.
    if (games.has(interaction.channelId)) {
      await interaction.reply({
        content: "A hangman game is already running in this channel.",
        ephemeral: true, // only the person who asked sees this
      });
      return;
    }

    // Start a new game and remember it for this channel.
    const game = createGame();
    games.set(interaction.channelId, game);

    await interaction.reply(
      "**Hangman!** Type a single letter in this channel to guess.\n" +
        showGame(game)
    );
  },
};

export default event;
