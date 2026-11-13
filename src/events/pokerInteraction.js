/*
  VIDEO POKER: THE DISCORD SIDE

  This file:
    1. Notices /poker, takes the bet in dubloons, and deals 5 cards
    2. Handles the five Hold buttons and the Draw button
    3. Pays out after the draw
  The rules live in src/games/poker.js. Dubloons live in src/economy/bank.js.
*/
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import {
  HAND_NAMES,
  MIN_BET,
  createGame,
  draw,
  isOver,
  payTableText,
  payout,
  showHand,
  toggleHold,
} from "../games/poker";
import { dubloonText, getDubloons, payDubloons, spend } from "../economy/bank";

// The /poker command as Discord shows it. ready.js registers it.
export const pokerCommand = new SlashCommandBuilder()
  .setName("poker")
  .setDescription("Bet dubloons on a hand of video poker (Jacks or Better)")
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription(`How many dubloons to bet (at least ${MIN_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
  );

// Every hand being played right now, keyed by the hand's message ID.
const games = new Map();

// If nobody clicks for this long, the bot draws for them with what they held.
const TIMEOUT_MS = 3 * 60 * 1000;

const quiet = { allowedMentions: { parse: [] } };
const mention = (userId) => `<@${userId}>`;

// One button per card (green when held), then Draw and Play again.
function buttons(game) {
  const over = isOver(game);
  const cards = new ActionRowBuilder().addComponents(
    game.hand.map((card, i) =>
      new ButtonBuilder()
        .setCustomId(`poker:hold:${i}`)
        .setLabel(game.held[i] ? `${card.rank}${card.suit} HELD` : `${card.rank}${card.suit}`)
        .setStyle(game.held[i] ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(over)
    )
  );
  const actions = new ActionRowBuilder().addComponents(
    over
      ? new ButtonBuilder().setCustomId(`poker:again:${game.bet}`).setLabel("Play again").setStyle(ButtonStyle.Primary)
      : new ButtonBuilder().setCustomId("poker:draw").setLabel("Draw").setStyle(ButtonStyle.Primary)
  );
  return [cards, actions];
}

function handText(game) {
  const lines = [
    `🃏 **Video Poker**: ${mention(game.playerId)} bet ${dubloonText(game.bet)}`,
    `**Your hand:** ${showHand(game.hand)}`,
  ];
  if (isOver(game)) {
    const back = game.paid;
    const balance = getDubloons(game.playerId);
    const name = HAND_NAMES[game.result];
    const money =
      back > 0 ? `🎉 **${name}!** You get back ${dubloonText(back)}.` : `😬 **${name}.** You lose ${dubloonText(game.bet)}.`;
    lines.push("", `${money} You have ${dubloonText(balance)} now.`);
  } else {
    lines.push(
      "",
      "Click the cards you want to **hold**, then **Draw** to swap the rest.",
      `-# Pays: ${payTableText()}`
    );
  }
  return lines.join("\n");
}

// Pay out once, right after the draw.
function finish(game, serverId) {
  if (game.paid !== undefined) return;
  game.paid = payout(game);
  if (game.paid > 0) payDubloons(game.playerId, game.paid, serverId);
}

// Take the bet and deal. Used by /poker and by Play again.
async function deal(interaction, bet) {
  const userId = interaction.user.id;
  if (!spend(userId, bet, interaction.guildId)) {
    await interaction.reply({
      content: `You only have ${dubloonText(getDubloons(userId))}. Play games and use \`/convert\` to get more.`,
      ephemeral: true,
    });
    return;
  }

  const game = createGame(userId, bet);
  await interaction.reply({ content: handText(game), components: buttons(game), ...quiet });
  const message = await interaction.fetchReply();
  games.set(message.id, game);

  // Nobody clicked Draw in time: draw for them so their bet isn't stuck.
  setTimeout(async () => {
    if (games.get(message.id) !== game || isOver(game)) return;
    draw(game);
    finish(game, interaction.guildId);
    try {
      await message.edit({ content: handText(game), components: buttons(game), ...quiet });
    } catch {
      // The message was deleted. The payout already happened.
    }
  }, TIMEOUT_MS);
}

async function handleButton(interaction) {
  const [, action, value] = interaction.customId.split(":");

  if (action === "again") {
    await deal(interaction, Number(value));
    return;
  }

  const game = games.get(interaction.message.id);
  if (!game || isOver(game)) {
    await interaction.reply({ content: "That hand is over. Start a new one with /poker.", ephemeral: true });
    return;
  }
  if (interaction.user.id !== game.playerId) {
    await interaction.reply({ content: "That's not your hand. Start your own with /poker!", ephemeral: true });
    return;
  }

  if (action === "hold") toggleHold(game, Number(value));
  if (action === "draw") {
    draw(game);
    finish(game, interaction.guildId);
  }
  await interaction.update({ content: handText(game), components: buttons(game), ...quiet });
}

const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "poker") {
        await deal(interaction, interaction.options.getInteger("bet"));
      } else if (interaction.isButton() && interaction.customId.startsWith("poker:")) {
        await handleButton(interaction);
      }
    } catch (error) {
      console.error("Poker error:", error);
    }
  },
};

export default event;
