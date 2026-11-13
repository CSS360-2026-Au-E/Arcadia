/*
  /points, /convert AND /leaderboard

  The Discord side of dubloons. src/events/dubloonsInteraction.js sends
  every slash command here, and these three are the ones this file answers.
*/
import { SlashCommandBuilder } from "discord.js";
import { bank, convertPoints, dubloonText } from "./bank";
import { GAME_KEYS, RATES } from "./rates";
import { account, exchange, leaderboard, rankOf } from "./wallet";

// ---------------------------------------------------------------------------
// The commands as Discord shows them in the "/" menu. ready.js registers them.
// ---------------------------------------------------------------------------

export const pointsCommand = new SlashCommandBuilder()
  .setName("points")
  .setDescription("See your dubloons and the game points you can convert");

export const convertCommand = new SlashCommandBuilder()
  .setName("convert")
  .setDescription("Turn your game points into dubloons")
  .addStringOption((option) =>
    option
      .setName("game")
      .setDescription("Only convert one game's points (all games if you skip this)")
      .addChoices(...GAME_KEYS.map((key) => ({ name: RATES[key].name, value: key })))
  );

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("The players in this server with the most dubloons");

export const DUBLOON_COMMANDS = [pointsCommand, convertCommand, leaderboardCommand];

// Mentions in these messages show a name but never ping anyone.
const quiet = { allowedMentions: { parse: [] } };
const mention = (userId) => `<@${userId}>`;

// "100 points = 10 dubloons"
const rateText = (rate) => `${rate.points} points = ${rate.dubloons} dubloons`;

// ---------------------------------------------------------------------------
// /points: your dubloons, plus what each game's points would convert to.
// ---------------------------------------------------------------------------
export function pointsText(userId) {
  const user = account(bank, userId);
  const lines = [`**You have ${dubloonText(user.dubloons)}.**`, ""];

  const games = GAME_KEYS.filter((key) => (user.points[key] || 0) > 0);
  if (games.length === 0) {
    lines.push("No game points yet. Play a game to earn some, then use `/convert`.");
  } else {
    lines.push("Game points you can turn into dubloons with `/convert`:");
    for (const key of games) {
      const points = user.points[key];
      const worth = exchange(points, RATES[key]).dubloons;
      lines.push(`- **${RATES[key].name}:** ${points} points, worth ${worth} dubloons (${rateText(RATES[key])})`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// /convert: game points in, dubloons out.
// ---------------------------------------------------------------------------
export function convertText(userId, game, serverId) {
  const results = convertPoints(userId, game, serverId);
  const total = results.reduce((sum, r) => sum + r.dubloons, 0);

  if (total === 0) {
    const which = game ? `${RATES[game].name} points` : "game points";
    const leftover = results.length > 0 ? " You don't have enough for a whole dubloon yet." : "";
    return `${mention(userId)}, you have no ${which} to convert.${leftover} Go play a game!`;
  }

  const lines = results
    .filter((r) => r.dubloons > 0)
    .map((r) => {
      const left = r.left > 0 ? ` (${r.left} left over)` : "";
      return `- ${RATES[r.game].name}: ${r.points} points → **${r.dubloons} dubloons**${left}`;
    });

  return (
    `💱 ${mention(userId)} converted their points into **${dubloonText(total)}**!\n` +
    lines.join("\n") +
    `\nThey now have ${dubloonText(account(bank, userId).dubloons)}.`
  );
}

// ---------------------------------------------------------------------------
// /leaderboard: the top 10 in this server.
// ---------------------------------------------------------------------------
const MEDALS = ["🥇", "🥈", "🥉"];

export function leaderboardText(serverId, userId) {
  const top = leaderboard(bank, serverId, 10);
  if (top.length === 0) {
    return "Nobody has any dubloons here yet. Play a game, then use `/convert`!";
  }

  const lines = top.map((row, i) => {
    const place = MEDALS[i] || `**${i + 1}.**`;
    return `${place} ${mention(row.id)}: ${dubloonText(row.dubloons)}`;
  });

  // If you're not in the top 10, show where you are.
  const rank = rankOf(bank, serverId, userId);
  if (rank > 10) {
    lines.push("", `You're **#${rank}** with ${dubloonText(account(bank, userId).dubloons)}.`);
  }

  return `🏆 **Dubloon Leaderboard**\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Answer the command. Gives back true if it was one of ours.
// ---------------------------------------------------------------------------
export async function handleDubloonCommand(interaction) {
  if (!interaction.isChatInputCommand()) return false;
  const userId = interaction.user.id;
  const serverId = interaction.guildId;

  if (interaction.commandName === "points") {
    account(bank, userId, serverId);
    await interaction.reply({ content: pointsText(userId), ephemeral: true });
    return true;
  }
  if (interaction.commandName === "convert") {
    const game = interaction.options.getString("game");
    await interaction.reply({ content: convertText(userId, game, serverId), ...quiet });
    return true;
  }
  if (interaction.commandName === "leaderboard") {
    await interaction.reply({ content: leaderboardText(serverId, userId), ...quiet });
    return true;
  }
  return false;
}
