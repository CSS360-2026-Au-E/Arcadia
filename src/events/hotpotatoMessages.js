/*
  HOT POTATO: CHAT MESSAGES

  This file reads every chat message while a hot potato game is running.
  It handles two things:
    1. BEFORE the game: people typing "join"
    2. DURING the game: the holder passing the potato with an @mention
  Everything else people type is ignored, so they can still chat normally.
*/

// Pull in the list of running games and the join/pass rules.
import { games, join, pass } from "../games/hotpotato";

// Builds a clickable @mention from a user's ID (same helper as the command file).
const mention = (userId) => `<@${userId}>`;

/*
  "messageCreate" fires for EVERY message the bot can see, in every channel.
  So this code is mostly a series of "is this message for me? if not, stop"
  checks. Each "return" means "not my business, stop reading this message."
*/
const event = {
  name: "messageCreate",
  async execute(message) {
    // Ignore messages from bots, including our own. Otherwise the bot could
    // end up reacting to its own announcements.
    if (message.author.bot) return;

    // Is there a hot potato game in this channel? If not, do nothing.
    // (Other files handle hangman and the other games.)
    const game = games.get(message.channelId);
    if (!game) return;

    // Clean up the message so " JOIN " and "join" count the same:
    // .trim() removes extra spaces, .toLowerCase() makes it all lowercase.
    const text = message.content.trim().toLowerCase();

    // -----------------------------------------------------------------------
    // PART 1: BEFORE the game starts, people type "join" to get in.
    // -----------------------------------------------------------------------
    if (game.stage === "joining") {
      if (text !== "join") return; // any other message is just chatting

      // Ask the rules file to add them, then respond based on what it says.
      const result = join(game, message.author.id);
      if (result === "joined") await message.react("🥔"); // potato emoji on their message
      if (result === "already") await message.reply("You're already in!");
      return;
    }

    // -----------------------------------------------------------------------
    // PART 2: DURING the game, the holder passes by @mentioning someone.
    // -----------------------------------------------------------------------

    // Find the first person @mentioned in the message.
    // If nobody was mentioned, it's just chatting, so stop.
    const target = message.mentions.users.first();
    if (!target) return;

    // Ask the rules file whether this pass is allowed.
    const result = pass(game, message.author.id, target.id);

    // Send a message that matches what happened.
    if (result === "passed") {
      await message.channel.send(`🥔 ${mention(target.id)} has the potato! Quick, pass it!`);
    } else if (result === "self") {
      await message.reply("Nice try, but you can't pass it to yourself!");
    } else if (result === "not-playing") {
      await message.reply(`${mention(target.id)} isn't in this game. Pick someone who is!`);
    }
    // "not-holder" means someone WITHOUT the potato mentioned a player.
    // We stay quiet, since they might just be chatting.
  },
};

// Hand this event to the bot's loader (src/helpers/loadEvents.js).
export default event;
