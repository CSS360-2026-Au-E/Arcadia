/*
  MINIGOLF, THE DISCORD SIDE

  Builds the messages, pictures and buttons, and moves the game from
  hole to hole. The rules live in minigolf.js. Buttons and menus are
  handled in src/events/minigolfControls.js.

  Every button and menu id starts with "mg:" so the event file knows
  it belongs to minigolf.
*/
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SelectMenuBuilder,
} from "discord.js";
import {
  COLORS,
  MAX_PLAYERS,
  MAX_STROKES,
  MODES,
  currentPlacer,
  currentPlayer,
  games,
  standings,
  startHole,
  total,
  winners,
} from "./minigolf";
import { CARDS } from "./minigolfCards";
import { squareName } from "./minigolfCourses";
import { DIRECTIONS, suggestAim } from "./minigolfPhysics";
import { drawCourse } from "./minigolfPicture";
import { TRAPS } from "./minigolfTraps";

// How each direction shows up in the aim menu.
const ARROWS = ["↑", "↑↗", "↗", "→↗", "→", "→↘", "↘", "↓↘", "↓", "↓↙", "↙", "←↙", "←", "←↖", "↖", "↑↖"];

const playerTag = (player) => `${COLORS[player.color].emoji} **${player.name}**`;

// ---------- Lobby ----------

export function lobbyMessage(game) {
  const mode = MODES[game.mode];
  const list = game.players.map(playerTag).join(", ") || "nobody yet";
  return {
    content:
      `⛳ **Minigolf: ${mode.name}** · ${game.holeCount} holes\n${mode.text}\n\n` +
      `Players (${game.players.length}/${MAX_PLAYERS}): ${list}\n\n` +
      `Click **Join** to play. <@${game.hostId}> clicks **Start** when everyone's in.`,
    components: [
      row(
        button("mg:join", "Join", ButtonStyle.Primary),
        button("mg:start", "Start", ButtonStyle.Success),
        button("mg:cancel", "Cancel", ButtonStyle.Danger)
      ),
    ],
  };
}

// ---------- Moving from hole to hole ----------

// Start the next hole, or end the game if that was the last one.
export async function beginHole(channel, game) {
  if (!startHole(game)) {
    await finishGame(channel, game);
    return;
  }
  if (game.phase === "traps") await sendTrapTime(channel, game);
  else await sendTurn(channel, game, []);
}

// Everyone finished the hole: show the scores and go to the next one.
export async function endHole(channel, game, lines) {
  lines.push("", `🏁 **Hole ${game.holeIndex + 1} done!**`, scoreboard(game));
  await channel.send({ content: lines.join("\n") });
  await beginHole(channel, game);
}

export async function finishGame(channel, game) {
  game.phase = "over";
  games.delete(channel.id);
  const best = winners(game);
  const names = best.map((p) => p.name).join(" and ");
  const headline =
    best.length > 1
      ? `🏆 **It's a tie! ${names} with ${total(best[0])} strokes!**`
      : `🏆 **${names} wins with ${total(best[0])} strokes!**`;
  await channel.send(`${headline}\n${scoreboard(game)}`);
}

// "1. 🔴 Abhi: 9 (3, 2, 4)"
export function scoreboard(game) {
  return standings(game)
    .map((p, i) => `${i + 1}. ${playerTag(p)}: ${total(p)} (${p.strokes.join(", ")})`)
    .join("\n");
}

function holeTitle(game) {
  return `**Hole ${game.holeIndex + 1}/${game.holeCount}: ${game.course.name}**`;
}

function picture(game, options = {}) {
  const balls = game.players
    .filter((p) => !p.done)
    .map((p) => ({ ...p.ball, rgb: COLORS[p.color].rgb }));
  const png = drawCourse(game.course, game.traps, { balls, ...options });
  return new AttachmentBuilder(png, { name: `hole-${game.holeIndex + 1}.png` });
}

// ---------- Shooting ----------

// Post the course and the aim controls for whoever's turn it is.
// `lines` is what just happened (the last shot, a card played), shown on top.
export async function sendTurn(channel, game, lines, shot = null) {
  const player = currentPlayer(game);
  game.header = lines;
  // Start aimed straight at the cup with medium power. Finding the right power is up to them.
  game.aim = { direction: suggestAim(game.course, player.ball).direction, power: 3 };

  const options = shot ? { path: shot.result.path, pathColor: COLORS[shot.player.color].rgb } : {};
  game.turnMessage = await channel.send({
    content: turnText(game),
    files: [picture(game, options)],
    components: turnControls(game),
  });
}

export function turnText(game) {
  const player = currentPlayer(game);
  const stroke = player.strokes[game.holeIndex] + 1;
  const lines = [...game.header];
  if (lines.length) lines.push("");
  lines.push(
    `⛳ ${holeTitle(game)}`,
    `${playerTag(player)} (<@${player.id}>), your turn! Stroke ${stroke} of ${MAX_STROKES}.`,
    `Aim: **${DIRECTIONS[game.aim.direction]}** ${ARROWS[game.aim.direction]}, power **${game.aim.power}**. Change them below, then **Shoot**.`
  );
  return lines.join("\n");
}

export function turnControls(game) {
  const directions = new SelectMenuBuilder()
    .setCustomId("mg:dir")
    .setPlaceholder("Pick a direction")
    .addOptions(
      DIRECTIONS.map((name, i) => ({
        label: `${ARROWS[i]} ${name}`,
        value: String(i),
        default: i === game.aim.direction,
      }))
    );

  const powers = [1, 2, 3, 4, 5].map((power) =>
    button(
      `mg:pow:${power}`,
      `Power ${power}`,
      power === game.aim.power ? ButtonStyle.Primary : ButtonStyle.Secondary
    )
  );

  const actions = [button("mg:shoot", "Shoot ⛳", ButtonStyle.Success)];
  if (game.mode === "chaos") actions.push(button("mg:cards", "My cards 🃏", ButtonStyle.Primary));
  actions.push(button("mg:skipturn", "Skip turn (host)", ButtonStyle.Secondary));

  return [row(directions), row(...powers), row(...actions)];
}

// Describe a shot in a few lines: what it hit and where it ended up.
export function shotReport(game, shot) {
  const { player, result } = shot;
  const name = (id) => (id === player.id ? "their own" : `${game.players.find((p) => p.id === id).name}'s`);
  const lines = [`${playerTag(player)} shot **${DIRECTIONS[shot.direction]}** with power ${shot.power}.`];

  if (result.bounces) lines.push(`Bounced off ${result.bounces === 1 ? "a wall" : `${result.bounces} walls`}.`);
  for (const trap of result.hits) {
    const info = TRAPS[trap.kind];
    lines.push(`${info.emoji} Hit ${name(trap.owner)} ${info.name.toLowerCase()}!`);
  }
  if (result.water) lines.push("💦 Splash! Back to where they shot from (+1 stroke).");
  if (result.hits.some((t) => t.kind === "fakeCup") && result.penalty && !result.water) {
    lines.push("Fooled by the fake cup (+1 stroke)!");
  }

  const strokes = player.strokes[game.holeIndex];
  if (result.holed) lines.push(`⛳ **In the cup!** Hole done in ${strokes}.`);
  else if (player.done) lines.push(`Out of strokes, takes ${MAX_STROKES} for this hole.`);
  return lines;
}

// Take the buttons off an old message so nobody clicks them.
export async function clearControls(message) {
  if (message) await message.edit({ components: [] }).catch(() => {});
}

// ---------- Sabotage: placing traps ----------

export async function sendTrapTime(channel, game) {
  game.trapMessage = await channel.send({
    content: trapTimeText(game),
    files: [picture(game, { showTraps: false })],
    components: [
      row(
        button("mg:trap", "Place my trap 🪤", ButtonStyle.Primary),
        button("mg:skiptrap", "Skip (host)", ButtonStyle.Secondary)
      ),
    ],
  });
}

export function trapTimeText(game) {
  const placer = currentPlacer(game);
  const order = game.order.map((p, i) => (i < game.placing.index ? `~~${p.name}~~` : p.name)).join(" → ");
  return (
    `🪤 ${holeTitle(game)}\nTrap time! Everyone secretly drops one trap for the others. ` +
    `Worst score places first.\nOrder: ${order}\n\n` +
    `${playerTag(placer)} (<@${placer.id}>), click **Place my trap**.`
  );
}

// The private message where a player picks their trap and square.
export function trapPicker(game, player, draft = {}, note = "") {
  const offer = game.placing.offers.get(player.id);
  const kinds = new SelectMenuBuilder()
    .setCustomId("mg:tkind")
    .setPlaceholder("Pick a trap")
    .addOptions(
      offer.map((kind) => ({
        label: TRAPS[kind].name,
        description: TRAPS[kind].text,
        emoji: { name: TRAPS[kind].emoji },
        value: kind,
        default: kind === draft.kind,
      }))
    );
  const cols = new SelectMenuBuilder()
    .setCustomId("mg:tcol")
    .setPlaceholder("Column (A to L)")
    .addOptions(
      Array.from({ length: 12 }, (_, c) => ({
        label: `Column ${String.fromCharCode(65 + c)}`,
        value: String(c),
        default: c === draft.col,
      }))
    );
  const rows = new SelectMenuBuilder()
    .setCustomId("mg:trow")
    .setPlaceholder("Row (1 to 8)")
    .addOptions(
      Array.from({ length: 8 }, (_, r) => ({ label: `Row ${r + 1}`, value: String(r), default: r === draft.row }))
    );

  const ready = draft.kind && draft.col !== undefined && draft.row !== undefined;
  const choice = ready ? `\nYou picked: ${TRAPS[draft.kind].emoji} ${TRAPS[draft.kind].name} on **${squareName(draft.col, draft.row)}**.` : "";
  return {
    content:
      `Pick a trap and a square for it. Nobody sees it until everyone has placed theirs.\n` +
      `No traps on the tee, the cup, or right next to the cup.${choice}${note ? `\n⚠️ ${note}` : ""}`,
    components: [
      row(kinds),
      row(cols),
      row(rows),
      row(button("mg:tplace", "Place it", ButtonStyle.Success).setDisabled(!ready)),
    ],
  };
}

// Everyone placed a trap: show them all, then start shooting.
export async function revealTraps(channel, game) {
  await clearControls(game.trapMessage);
  const lines = [`🪤 **All traps are down!**`];
  for (const trap of game.traps) {
    const owner = game.players.find((p) => p.id === trap.owner);
    lines.push(`${TRAPS[trap.kind].emoji} ${TRAPS[trap.kind].name} on ${squareName(trap.col, trap.row)} (${owner.name})`);
  }
  await sendTurn(channel, game, lines);
}

// ---------- Chaos Cards ----------

// The private message showing a player's hand.
export function cardHand(game, player, note = "") {
  const myTurn = currentPlayer(game) === player;
  const canPlay = myTurn && !player.playedCard;
  const lines = player.hand.map((key) => {
    const card = CARDS[key];
    return `${card.emoji} **${card.name}** (${card.who}): ${card.text}`;
  });

  let status = "Play one on your turn, before you shoot. One card per hole.";
  if (player.playedCard) status = "You already played a card this hole.";
  else if (!myTurn) status = "You can play a card when it's your turn.";

  const buttons = player.hand.map((key, i) =>
    button(`mg:card:${i}`, CARDS[key].name, ButtonStyle.Primary).setEmoji({ name: CARDS[key].emoji }).setDisabled(!canPlay)
  );
  return {
    content: `🃏 **Your cards**\n${lines.join("\n") || "No cards."}\n\n${status}${note ? `\n⚠️ ${note}` : ""}`,
    components: buttons.length ? [row(...buttons)] : [],
  };
}

// Pick who a "someone" card goes on.
export function targetPicker(game, player, index) {
  const card = CARDS[player.hand[index]];
  const menu = new SelectMenuBuilder()
    .setCustomId(`mg:target:${index}`)
    .setPlaceholder("Pick a player")
    .addOptions(
      game.players
        .filter((p) => p !== player)
        .map((p) => ({ label: p.name, emoji: { name: COLORS[p.color].emoji }, value: p.id }))
    );
  return { content: `${card.emoji} **${card.name}**: who gets it?`, components: [row(menu)] };
}

// ---------- Small helpers ----------

function row(...items) {
  return new ActionRowBuilder().addComponents(...items);
}

function button(id, label, style) {
  return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
}
