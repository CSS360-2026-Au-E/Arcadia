import { SlashCommandBuilder } from "discord.js";
import { ERAS, GENRES } from "../games/songguess";
import { tictactoeCommand } from "../games/tictactoe";

// This is the /hangman command as Discord will show it in the "/" menu.
const hangmanCommand = new SlashCommandBuilder()
  .setName("hangman")
  .setDescription("Start a game of hangman in this channel");

// Turn { pop: { name: "Pop" }, ... } into the menu Discord shows.
const menu = (choices) =>
  Object.entries(choices).map(([value, choice]) => ({ name: choice.name, value }));

// /songguess makes the player pick a genre and an era first.
const songguessCommand = new SlashCommandBuilder()
  .setName("songguess")
  .setDescription("Guess the song from a clip that gets longer each round")
  .addStringOption((option) =>
    option
      .setName("genre")
      .setDescription("What kind of music")
      .setRequired(true)
      .addChoices(...menu(GENRES))
  )
  .addStringOption((option) =>
    option
      .setName("era")
      .setDescription("Which decade")
      .setRequired(true)
      .addChoices(...menu(ERAS))
  );

// "ready" runs once, when the bot has logged in to Discord.
const event = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`
    ############################################################
    #  Logged in as ${client.user.username}!
    #  Serving ${client.guilds.cache.size} servers.
    #  Serving ${client.users.cache.size} users.
    ############################################################
  `);

    // Tell every server the bot is in that /hangman and /songguess exist.
    // Doing it per server makes the command show up right away.
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set([hangmanCommand.toJSON(), songguessCommand.toJSON(), tictactoeCommand.toJSON()]);
        console.log(`Added /hangman, /songguess /tictactoe to ${guild.name}`);
      } catch (error) {
        console.error(`Could not add commands to ${guild.name}:`, error.message);
      }
    }
  },
};

export default event;
