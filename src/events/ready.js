import { SlashCommandBuilder } from "discord.js";

// This is the /hangman command as Discord will show it in the "/" menu.
const hangmanCommand = new SlashCommandBuilder()
  .setName("hangman")
  .setDescription("Start a game of hangman in this channel");

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

    // Tell every server the bot is in that /hangman exists.
    // Doing it per server makes the command show up right away.
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set([hangmanCommand.toJSON()]);
        console.log(`Added /hangman to ${guild.name}`);
      } catch (error) {
        console.error(`Could not add /hangman to ${guild.name}:`, error.message);
      }
    }
  },
};

export default event;
