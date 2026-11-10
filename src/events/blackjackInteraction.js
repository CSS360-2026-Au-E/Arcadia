/*
  BLACKJACK: THE DISCORD SIDE

  This file:
    1. Notices /blackjack, takes the bet in dubloons, and deals the cards
    2. Handles the Hit, Stand and Double buttons
    3. Pays out when the hand is over
  The rules live in src/games/blackjack.js. Dubloons live in src/economy/bank.js.
*/
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import {
  MIN_BET,
  canDouble,
  createGame,
  double,
  handValue,
  hit,
  isOver,
  payout,
  showDealer,
  showHand,
  stand,
} from "../games/blackjack";
import { dubloonText, getDubloons, payDubloons, spend } from "../economy/bank";

// The /blackjack command as Discord shows it. ready.js registers it.
export const blackjackCommand = new SlashCommandBuilder()
  .setName("blackjack")
  .setDescription("Bet dubloons on a hand of blackjack against the dealer")
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription(`How many dubloons to bet (at least ${MIN_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
  );

// Every hand being played right now, keyed by the hand's message ID.
const games = new Map();

// If nobody clicks for this long, the hand stands on its own.
const TIMEOUT_MS = 3 * 60 * 1000;

const quiet = { allowedMentions: { parse: [] } };
const mention = (userId) => `<@${userId}>`;

const RESULT_TEXT = {
  blackjack: "🎉 **Blackjack!** Pays 3 to 2.",
  win: "🎉 **You win!**",
  push: "🤝 **Push.** It's a tie, so you get your bet back.",
  lose: "😬 **Dealer wins.**",
  bust: "💥 **Bust!** You went over 21.",
};

function buttons(game, userId) {
  const over = isOver(game);
  const affordDouble = getDubloons(userId) >= game.bet;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bj:hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(over),
      new ButtonBuilder().setCustomId("bj:stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(over),
      new ButtonBuilder()
        .setCustomId("bj:double")
        .setLabel("Double")
        .setStyle(ButtonStyle.Success)
        .setDisabled(over || !canDouble(game) || !affordDouble)
    ),
  ];
}

// The message for the hand. When it's over, pay out and say how it went.
function handText(game) {
  const lines = [
    `🃏 **Blackjack**: ${mention(game.playerId)} bet ${dubloonText(game.bet)}`,
    `**Dealer:** ${showDealer(game)}`,
    `**You:** ${showHand(game.player)} (${handValue(game.player)})`,
  ];
  if (isOver(game)) {
    const back = game.paid;
    const balance = getDubloons(game.playerId);
    const money = back > 0 ? `You get back ${dubloonText(back)}.` : `You lose ${dubloonText(game.bet)}.`;
    lines.push("", `${RESULT_TEXT[game.result]} ${money} You have ${dubloonText(balance)} now.`);
  } else {
    lines.push("", "Hit, Stand or Double?");
  }
  return lines.join("\n");
}

// Pay out once, the moment the hand ends.
function finish(game, serverId) {
  if (game.paid !== undefined) return;
  game.paid = payout(game);
  if (game.paid > 0) payDubloons(game.playerId, game.paid, serverId);
}

async function startGame(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger("bet");

  if (!spend(userId, bet, interaction.guildId)) {
    await interaction.reply({
      content: `You only have ${dubloonText(getDubloons(userId))}. Play games and use \`/convert\` to get more.`,
      ephemeral: true,
    });
    return;
  }

  const game = createGame(userId, bet);
  if (isOver(game)) finish(game, interaction.guildId); // blackjack on the deal

  await interaction.reply({ content: handText(game), components: buttons(game, userId), ...quiet });
  if (isOver(game)) return;

  const message = await interaction.fetchReply();
  games.set(message.id, game);

  // Nobody clicked in time: stand for them so their bet isn't stuck.
  setTimeout(async () => {
    if (games.get(message.id) !== game) return;
    games.delete(message.id);
    stand(game);
    finish(game, interaction.guildId);
    try {
      await message.edit({ content: handText(game), components: buttons(game, userId), ...quiet });
    } catch {
      // The message was deleted. The payout already happened.
    }
  }, TIMEOUT_MS);
}

async function handleButton(interaction) {
  const game = games.get(interaction.message.id);
  if (!game) {
    await interaction.reply({ content: "That hand is over. Start a new one with /blackjack.", ephemeral: true });
    return;
  }
  if (interaction.user.id !== game.playerId) {
    await interaction.reply({ content: "That's not your hand. Start your own with /blackjack!", ephemeral: true });
    return;
  }

  const action = interaction.customId.split(":")[1];
  if (action === "hit") hit(game);
  if (action === "stand") stand(game);
  if (action === "double") {
    // Doubling costs the same bet again.
    if (!canDouble(game) || !spend(game.playerId, game.bet, interaction.guildId)) {
      await interaction.reply({ content: "You can't double right now.", ephemeral: true });
      return;
    }
    double(game);
  }

  if (isOver(game)) {
    games.delete(interaction.message.id);
    finish(game, interaction.guildId);
  }
  await interaction.update({ content: handText(game), components: buttons(game, game.playerId), ...quiet });
}

const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "blackjack") {
        await startGame(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith("bj:")) {
        await handleButton(interaction);
      }
    } catch (error) {
      console.error("Blackjack error:", error);
    }
  },
};

export default event;
