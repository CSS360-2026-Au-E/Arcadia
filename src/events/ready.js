import { SlashCommandBuilder } from "discord.js";
import { ERAS, GENRES } from "../games/songguess";
import { HOLE_CHOICES, MODES } from "../games/minigolf";

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

// /minigolf makes the host pick a mode, and optionally how many holes.
const minigolfCommand = new SlashCommandBuilder()
  .setName("minigolf")
  .setDescription("Turn-based minigolf for up to 8 players")
  .addStringOption((option) =>
    option
      .setName("mode")
      .setDescription("Sabotage: everyone drops traps. Chaos Cards: everyone plays rule-bending cards.")
      .setRequired(true)
      .addChoices(...menu(MODES))
  )
  .addIntegerOption((option) =>
    option
      .setName("holes")
      .setDescription("How many holes (6 if you skip this)")
      .addChoices(...HOLE_CHOICES.map((n) => ({ name: `${n} holes`, value: n })))
  );

// /hotpotato has no options. Players join by typing "join".
const hotpotatoCommand = new SlashCommandBuilder()
  .setName("hotpotato")
  .setDescription("Pass the potato before it explodes! Last player standing wins");

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

    // Tell every server the bot is in that /hangman, /songguess, /minigolf and /hotpotato exist.
    // Doing it per server makes the command show up right away.
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set([
          hangmanCommand.toJSON(),
          songguessCommand.toJSON(),
          minigolfCommand.toJSON(),
          hotpotatoCommand.toJSON(),
        ]);
        console.log(`Added /hangman, /songguess, /minigolf and /hotpotato to ${guild.name}`);
      } catch (error) {
        console.error(`Could not add commands to ${guild.name}:`, error.message);
      }
    }
  },
};

export default event;
