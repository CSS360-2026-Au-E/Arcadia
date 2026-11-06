/*
  HORSE RACE: THE DISCORD SIDE

  This file:
    1. Notices when someone types /horserace and posts the odds board with bet buttons
    2. Takes 10 coins from a player each time they click a horse's button
    3. When betting closes, edits the same message over and over with a new
       picture each time, so the horses look like they're galloping
    4. Shows the winner and pays out everyone who bet on it
  The rules (odds, coins, who wins) live in src/games/horserace.js.
  The picture is drawn in src/games/horseracePicture.js.
*/

import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import {
  BET_SECONDS,
  BET_SIZE,
  HORSES,
  STARTING_COINS,
  STEP_SECONDS,
  betTotals,
  createGame,
  finishers,
  getCoins,
  leader,
  moveHorses,
  payOut,
  pickWinner,
  placeBet,
} from "../games/horserace";
import { drawRace } from "../games/horseracePicture";

// Every race running right now, keyed by channel ID, so each channel
// can only have one race at a time.
const games = new Map();

// Everyone's coins: user ID -> how many coins they have. This is shared by
// every race in every channel, so your coins carry over between races.
// It lives in memory, so everyone goes back to the start if the bot restarts.
const wallets = new Map();

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
  ever has one picture.
*/
function racePicture(game, winner = null) {
  const png = drawRace(game, game.frame || 0, winner);
  const file = new AttachmentBuilder(png, { name: "horse-race.png" });
  return { files: [file], attachments: [] };
}

// One button per horse, plus a button to check your coins.
// The custom ID "horse:2" tells us which horse was clicked.
function betButtons() {
  const horseRow = new ActionRowBuilder();
  HORSES.forEach((horse, i) => {
    horseRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`horse:${i}`)
        .setLabel(`${horse.name} (${horse.odds}x)`)
        .setEmoji(horse.button)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  const coinsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("horse:coins").setLabel("My coins").setEmoji("🪙").setStyle(ButtonStyle.Primary)
  );
  return [horseRow, coinsRow]; // Discord wants a list of rows
}

// The odds board shown while people are betting.
function bettingText(game) {
  const totals = betTotals(game);
  const lines = HORSES.map(
    (horse, i) => `${horse.button} **${horse.name}**: pays ${horse.odds}x, ${totals[i]} coins bet`
  );
  return (
    `🏇 **Horse Race!** Betting closes in ${BET_SECONDS} seconds.\n` +
    `Click a horse to bet ${BET_SIZE} coins on it. Click again to bet more. ` +
    `Everyone starts with ${STARTING_COINS} coins.\n\n` +
    lines.join("\n")
  );
}

// A private note for one player: their bets and how many coins they have left.
function slipText(game, userId) {
  const slip = game.bets[userId] || [];
  const bets = HORSES.map((horse, i) => (slip[i] ? `${slip[i]} on ${horse.name}` : null)).filter(Boolean);
  const betLine = bets.length ? `Your bets: ${bets.join(", ")}.` : "You haven't bet yet.";
  return `${betLine} You have **${getCoins(wallets, userId)}** coins left.`;
}

// ---------------------------------------------------------------------------
// THE RACE
// ---------------------------------------------------------------------------

/*
  Move the horses one step, redraw the picture, and wait for the next step.
  runStep calling itself (after a short wait) is what makes the race keep going.
*/
async function runStep(channelId, message, game) {
  // Safety check: stop if this race was removed while we were waiting.
  if (games.get(channelId) !== game) return;

  const oldLeader = leader(game);
  moveHorses(game);
  game.frame = (game.frame || 0) + 1;

  // Nobody has crossed the finish line yet: redraw and go again.
  if (finishers(game).length === 0) {
    const front = HORSES[leader(game)].name;
    const call = leader(game) !== oldLeader ? `**${front}** takes the lead!` : `**${front}** is out in front.`;
    try {
      await message.edit({ content: `🏇 And they're off! ${call}`, ...racePicture(game) });
    } catch {
      // The message was deleted, so there's nothing to show the race on.
      games.delete(channelId);
      return;
    }
    setTimeout(() => runStep(channelId, message, game), toMs(STEP_SECONDS));
    return;
  }

  // Someone crossed the line! Pick the winner and pay out.
  games.delete(channelId);
  const photoFinish = finishers(game).length > 1;
  const winner = pickWinner(game);
  const results = payOut(game, wallets, winner);

  let text = `🏆 **${HORSES[winner].button} ${HORSES[winner].name} wins!**`;
  if (photoFinish) text += " (photo finish!)";
  text += ` Bets on it pay ${HORSES[winner].odds}x.\n\n`;

  if (results.length === 0) {
    text += "Nobody bet on this race.";
  } else {
    // Biggest winners first. .sort() puts the list in order.
    results.sort((a, b) => b.won - a.won);
    text += results
      .map((r) => {
        const result = r.won > 0 ? `won **${r.won}**` : "lost it all";
        return `${mention(r.userId)} bet ${r.bet}, ${result}. Now has ${r.coins} coins.`;
      })
      .join("\n");
  }

  try {
    await message.edit({ content: text, ...racePicture(game, winner) });
  } catch {
    // The message was deleted. Nothing more to do.
  }
}

// Called when betting time is up. Takes the buttons away and starts racing.
async function startRace(channelId, message, game) {
  if (games.get(channelId) !== game) return;
  try {
    // components: [] removes the buttons so nobody can bet anymore.
    await message.edit({ content: "🏇 **Betting is closed!** The horses are in the gate...", components: [] });
  } catch {
    games.delete(channelId);
    return;
  }
  setTimeout(() => runStep(channelId, message, game), toMs(STEP_SECONDS));
}

// ---------------------------------------------------------------------------
// WHAT HAPPENS WHEN SOMEONE TYPES /horserace OR CLICKS A BUTTON
// ---------------------------------------------------------------------------

async function startGame(interaction) {
  // Only one race per channel at a time.
  if (games.has(interaction.channelId)) {
    await interaction.reply({
      content: "A horse race is already running in this channel.",
      ephemeral: true, // only the person who typed the command sees this
    });
    return;
  }

  const game = createGame();
  games.set(interaction.channelId, game);

  // The "..." copies the picture's files into this message.
  await interaction.reply({ content: bettingText(game), components: betButtons(), ...racePicture(game) });

  // Remember the race message so we can edit it, and so clicks on
  // an old race message don't count for this one.
  const message = await interaction.fetchReply();
  game.messageId = message.id;

  setTimeout(() => startRace(interaction.channelId, message, game), toMs(BET_SECONDS));
}

async function handleButton(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.messageId !== interaction.message.id) {
    await interaction.reply({ content: "That race is over. Start a new one with /horserace.", ephemeral: true });
    return;
  }

  // "My coins" just shows the player their own bets and coins, privately.
  if (interaction.customId === "horse:coins") {
    await interaction.reply({ content: slipText(game, interaction.user.id), ephemeral: true });
    return;
  }

  // "horse:2" -> split at ":" -> ["horse", "2"] -> take "2" -> turn it into the number 2
  const horse = Number(interaction.customId.split(":")[1]);
  const status = placeBet(game, wallets, interaction.user.id, horse);
  if (status === "closed") {
    await interaction.reply({ content: "Too late, the race already started!", ephemeral: true });
    return;
  }

  // update() redraws the odds board with the new totals.
  // followUp() then sends a private note that only the clicker sees.
  await interaction.update({ content: bettingText(game), components: betButtons() });
  const bailout = status === "bailout" ? `You were out of coins, so here's ${STARTING_COINS} more on the house. ` : "";
  await interaction.followUp({
    content: `${bailout}You bet ${BET_SIZE} on **${HORSES[horse].name}**. ${slipText(game, interaction.user.id)}`,
    ephemeral: true,
  });
}

/*
  Every file in src/events/ is loaded automatically when the bot starts.
  "interactionCreate" fires for every slash command and every button click,
  so the first job is to ignore anything that isn't part of the horse race.
*/
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "horserace") {
        await startGame(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith("horse:")) {
        await handleButton(interaction);
      }
    } catch (error) {
      console.error("Horse race error:", error);
    }
  },
};

export default event;
