import { createGame, downloadPreview, games, getRandomSong } from "../games/songguess";
import { endGame, playClip } from "../games/songguessRound";

// Runs when someone uses a slash command. This file only handles /songguess.
// (/hangman is handled in interactionCreate.js.)
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "songguess") return;

    // Only one song game per channel at a time.
    if (games.has(interaction.channelId)) {
      await interaction.reply({
        content: "A song guesser game is already running in this channel.",
        ephemeral: true,
      });
      return;
    }

    // Getting a song takes a moment, so tell Discord we're working on it.
    await interaction.deferReply();

    const game = createGame(null);
    games.set(interaction.channelId, game); // claim the channel right away

    try {
      game.song = await getRandomSong();
      game.mp3 = await downloadPreview(game.song);
    } catch (error) {
      console.error("Could not get a song:", error.message);
      endGame(interaction.channel, game);
      await interaction.editReply("Sorry, I couldn't get a song right now. Try again in a bit.");
      return;
    }

    await interaction.editReply("**Song Guesser!** Name the song from the shortest clip you can.");
    await playClip(interaction.channel, game);
  },
};

export default event;
