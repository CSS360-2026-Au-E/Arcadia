import { handleDubloonCommand } from "../economy/commands";

// Runs on every interaction. handleDubloonCommand() ignores anything that
// isn't /points, /convert or /leaderboard.
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      await handleDubloonCommand(interaction);
    } catch (error) {
      console.error("Dubloons error:", error);
    }
  },
};

export default event;
