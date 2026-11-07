import { handleInteraction } from "../games/tictactoe";

// Runs on every interaction. handleInteraction() ignores anything that is
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      await handleInteraction(interaction);
    } catch (error) {
      console.error("Tic tac toe error:", error);
    }
  },
};

export default event;