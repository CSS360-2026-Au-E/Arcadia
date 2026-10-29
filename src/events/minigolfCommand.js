import { DEFAULT_HOLES, addPlayer, createGame, games } from "../games/minigolf";
import { lobbyMessage } from "../games/minigolfRound";

// Runs when someone uses a slash command. This file only handles /minigolf.
// It opens a lobby; the buttons are handled in minigolfControls.js.
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "minigolf") return;

    // Only one minigolf game per channel at a time.
    if (games.has(interaction.channelId)) {
      await interaction.reply({
        content: "A minigolf game is already running in this channel.",
        ephemeral: true,
      });
      return;
    }

    const mode = interaction.options.getString("mode") || "sabotage";
    const holes = interaction.options.getInteger("holes") || DEFAULT_HOLES;

    const game = createGame({ hostId: interaction.user.id, mode, holes });
    addPlayer(game, interaction.user.id, displayName(interaction)); // the host plays too
    games.set(interaction.channelId, game);

    await interaction.reply(lobbyMessage(game));
  },
};

// The name people see in the server, falling back to their username.
export function displayName(interaction) {
  return interaction.member?.displayName || interaction.user.globalName || interaction.user.username;
}

export default event;
