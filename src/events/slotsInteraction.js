/*
  SLOT MACHINE: THE DISCORD SIDE

  /slots takes the bet, spins, and stops the reels one at a time by editing
  the same message. The "Spin again" button bets the same amount again.
  The rules live in src/games/slots.js. Dubloons live in src/economy/bank.js.
*/
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { MIN_BET, multiplier, spin, winnings } from "../games/slots";
import { dubloonText, getDubloons, payDubloons, spend } from "../economy/bank";

export const slotsCommand = new SlashCommandBuilder()
  .setName("slots")
  .setDescription("Bet dubloons on a spin of the slot machine")
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription(`How many dubloons to bet (at least ${MIN_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
  );

const quiet = { allowedMentions: { parse: [] } };
const mention = (userId) => `<@${userId}>`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// How long between each reel stopping.
const REEL_DELAY_MS = 700;

// One "Spin again" button. The bet rides along in the button's ID: slots:again:50
function againButton(bet, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`slots:again:${bet}`)
        .setLabel(`Spin again (${bet})`)
        .setEmoji("🎰")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    ),
  ];
}

// The machine with some reels stopped and the rest still spinning.
function machine(userId, bet, reels, stopped) {
  const shown = reels.map((s, i) => (i < stopped ? s.emoji : "🔄")).join(" | ");
  return `🎰 ${mention(userId)} bet ${dubloonText(bet)}\n## ${shown}`;
}

// Take the bet, then spin. "send" posts the first message and gives it back.
async function play(userId, bet, serverId, send) {
  if (!spend(userId, bet, serverId)) {
    return { error: `You only have ${dubloonText(getDubloons(userId))}. Play games and use \`/convert\` to get more.` };
  }

  const reels = spin();
  const message = await send({ content: machine(userId, bet, reels, 0), components: [], ...quiet });

  for (let stopped = 1; stopped <= 3; stopped++) {
    await wait(REEL_DELAY_MS);
    await message.edit({ content: machine(userId, bet, reels, stopped), ...quiet });
  }

  const won = winnings(reels, bet);
  if (won > 0) payDubloons(userId, won, serverId);
  const balance = getDubloons(userId);
  const times = multiplier(reels);
  const result =
    won > 0
      ? `🎉 **${times}x! You win ${dubloonText(won)}!**`
      : "No luck this time.";

  await message.edit({
    content: `${machine(userId, bet, reels, 3)}\n${result} You have ${dubloonText(balance)} now.`,
    components: againButton(bet, balance < bet),
    ...quiet,
  });
  return { ok: true };
}

const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "slots") {
        const bet = interaction.options.getInteger("bet");
        const result = await play(interaction.user.id, bet, interaction.guildId, async (msg) => {
          await interaction.reply(msg);
          return interaction.fetchReply();
        });
        if (result.error) await interaction.reply({ content: result.error, ephemeral: true });
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith("slots:again:")) {
        const bet = Number(interaction.customId.split(":")[2]);
        // Anyone can press it, and it bets their own dubloons.
        const result = await play(interaction.user.id, bet, interaction.guildId, async (msg) => {
          await interaction.reply(msg);
          return interaction.fetchReply();
        });
        if (result.error) await interaction.reply({ content: result.error, ephemeral: true });
      }
    } catch (error) {
      console.error("Slots error:", error);
    }
  },
};

export default event;
