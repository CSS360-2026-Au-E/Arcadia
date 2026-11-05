/*
  SNAIL RACE: THE DISCORD SIDE

  This file:
    1. Notices when someone types /snailrace and posts the race with bet buttons
    2. Saves a bet when someone clicks a snail's button
    3. When betting closes, edits the same message over and over with a new
       picture each time, so the snails look like they're crawling
    4. Shows the winner with a crown and @mentions everyone who bet on it
  The rules (how snails move, who wins) live in src/games/snailrace.js.
  The picture is drawn in src/games/snailracePicture.js.
*/

import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import {
  BET_SECONDS,
  SNAILS,
  STEP_SECONDS,
  betCounts,
  createGame,
  finishers,
  moveSnails,
  pickWinner,
  placeBet,
  winningBettors,
} from "../games/snailrace";
import { drawRace } from "../games/snailracePicture";

// Every race running right now, keyed by channel ID, so each channel
// can only have one race at a time. Races live in memory, so they
// disappear if the bot restarts.
const games = new Map();

// ---------------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------------

// Discord turns <@123456> into a clickable @name.
const mention = (userId) => `<@${userId}>`;

// setTimeout counts in milliseconds. 1 second = 1000 milliseconds.
const toMs = (seconds) => seconds * 1000;

/*
  Turn the race into a picture Discord can show. "files" sends the new
  picture, and "attachments: []" removes the old one, so the message only
  ever has one picture. Pass in the winner's number once there is one.
*/
function racePicture(game, winner = null) {
  const file = new AttachmentBuilder(drawRace(game, winner), { name: "snail-race.png" });
  return { files: [file], attachments: [] };
}

// One button per snail. The custom ID "snail:2" tells us which snail
// was clicked when the button press comes back to the bot.
function betButtons() {
  const row = new ActionRowBuilder();
  SNAILS.forEach((snail, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`snail:${i}`)
        .setLabel(snail.name)
        .setEmoji(snail.lane)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  return [row]; // Discord wants a list of rows
}

// The text shown while people are betting: how many bets each snail has.
function bettingText(game) {
  const counts = betCounts(game);
  const betLines = SNAILS.map((snail, i) => `${snail.lane} ${snail.name}: ${counts[i]} bet(s)`);
  return (
    `🐌 **Snail Race!** Click a snail to bet on it. The race starts in ${BET_SECONDS} seconds.\n\n` +
    betLines.join("\n")
  );
}

// ---------------------------------------------------------------------------
// THE RACE
// ---------------------------------------------------------------------------

/*
  Move the snails one step, redraw the track, and wait for the next step.
  runStep calling itself (after a short wait) is what makes the race keep going.
*/
async function runStep(channelId, message, game) {
  // Safety check: stop if this race was removed while we were waiting.
  if (games.get(channelId) !== game) return;

  moveSnails(game);

  // Nobody has crossed the finish line yet: redraw and go again.
  if (finishers(game).length === 0) {
    try {
      await message.edit({ content: "🐌 **And they're off!**", ...racePicture(game) });
    } catch {
      // The message was deleted, so there's nothing to show the race on.
      games.delete(channelId);
      return;
    }
    setTimeout(() => runStep(channelId, message, game), toMs(STEP_SECONDS));
    return;
  }

  // Someone finished! Pick the winner and announce it.
  games.delete(channelId);
  const photoFinish = finishers(game).length > 1;
  const winner = pickWinner(game);
  const winners = winningBettors(game, winner);

  let result = `🏆 **${SNAILS[winner].lane} ${SNAILS[winner].name} wins!**`;
  if (photoFinish) result += " (photo finish!)";
  if (winners.length > 0) {
    result += `\nWinning bets: ${winners.map(mention).join(", ")}`;
  } else {
    result += "\nNobody bet on that snail. The house wins this time.";
  }

  try {
    await message.edit({ content: result, ...racePicture(game, winner) });
  } catch {
    // The message was deleted. Nothing more to do.
  }
}

// Called when betting time is up. Takes the buttons away and starts racing.
async function startRace(channelId, message, game) {
  if (games.get(channelId) !== game) return;
  try {
    // components: [] removes the buttons so nobody can bet anymore.
    await message.edit({ content: "🐌 **Betting is closed!** On your marks...", components: [] });
  } catch {
    games.delete(channelId);
    return;
  }
  setTimeout(() => runStep(channelId, message, game), toMs(STEP_SECONDS));
}

// ---------------------------------------------------------------------------
// WHAT HAPPENS WHEN SOMEONE TYPES /snailrace OR CLICKS A SNAIL
// ---------------------------------------------------------------------------

async function startGame(interaction) {
  // Only one race per channel at a time.
  if (games.has(interaction.channelId)) {
    await interaction.reply({
      content: "A snail race is already running in this channel.",
      ephemeral: true, // only the person who typed the command sees this
    });
    return;
  }

  const game = createGame();
  games.set(interaction.channelId, game);

  // The "..." copies the picture's files into this message.
  await interaction.reply({ content: bettingText(game), components: betButtons(), ...racePicture(game) });

  // Remember the race message so we can edit it, and so bet clicks on
  // an old race message don't count for this one.
  const message = await interaction.fetchReply();
  game.messageId = message.id;

  setTimeout(() => startRace(interaction.channelId, message, game), toMs(BET_SECONDS));
}

async function handleBet(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.messageId !== interaction.message.id) {
    await interaction.reply({ content: "That race is over. Start a new one with /snailrace.", ephemeral: true });
    return;
  }

  // "snail:2" -> split at ":" -> ["snail", "2"] -> take "2" -> turn it into the number 2
  const snail = Number(interaction.customId.split(":")[1]);
  const status = placeBet(game, interaction.user.id, snail);
  if (status === "closed") {
    await interaction.reply({ content: "Too late, the race already started!", ephemeral: true });
    return;
  }

  // update() redraws the race message with the new bet counts.
  // followUp() then sends a private note that only the clicker sees.
  await interaction.update({ content: bettingText(game), components: betButtons() });
  const word = status === "changed" ? "switched your bet to" : "bet on";
  await interaction.followUp({ content: `You ${word} **${SNAILS[snail].name}**.`, ephemeral: true });
}

/*
  Every file in src/events/ is loaded automatically when the bot starts.
  "interactionCreate" fires for every slash command and every button click,
  so the first job is to ignore anything that isn't part of the snail race.
*/
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "snailrace") {
        await startGame(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith("snail:")) {
        await handleBet(interaction);
      }
    } catch (error) {
      console.error("Snail race error:", error);
    }
  },
};

export default event;
