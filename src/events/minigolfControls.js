import {
  MAX_STROKES,
  addPlayer,
  currentPlacer,
  currentPlayer,
  findPlayer,
  games,
  placeTrap,
  shoot,
  skipPlacer,
  skipTurn,
} from "../games/minigolf";
import { CARDS, playCard } from "../games/minigolfCards";
import {
  beginHole,
  cardHand,
  clearControls,
  endHole,
  lobbyMessage,
  revealTraps,
  sendTurn,
  shotReport,
  targetPicker,
  trapPicker,
  trapTimeText,
  turnControls,
  turnText,
} from "../games/minigolfRound";
import { displayName } from "./minigolfCommand";

// Runs when someone clicks a minigolf button or picks from a minigolf menu.
// Every minigolf id starts with "mg:", like "mg:shoot" or "mg:pow:3".
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;
    if (!interaction.customId.startsWith("mg:")) return;

    const game = games.get(interaction.channelId);
    if (!game) {
      await interaction.reply({ content: "This minigolf game is over.", ephemeral: true });
      return;
    }

    const [, action, extra] = interaction.customId.split(":");
    const handler = HANDLERS[action];
    if (!handler) return;

    try {
      await handler({
        interaction,
        game,
        extra,
        channel: interaction.channel,
        player: findPlayer(game, interaction.user.id),
        isHost: interaction.user.id === game.hostId,
      });
    } catch (error) {
      console.error("Minigolf error:", error);
      game.busy = false;
    }
  },
};

// Reply with a message only the clicker can see.
const tell = (interaction, content) => interaction.reply({ content, ephemeral: true });

const HANDLERS = {
  // ----- Lobby -----

  async join({ interaction, game }) {
    const problem = addPlayer(game, interaction.user.id, displayName(interaction));
    if (problem) return tell(interaction, problem);
    await interaction.update(lobbyMessage(game));
  },

  async start({ interaction, game, channel, isHost }) {
    if (!isHost) return tell(interaction, "Only the person who started the game can start it.");
    if (game.phase !== "lobby") return interaction.deferUpdate();
    const lobby = lobbyMessage(game);
    await interaction.update({ content: `${lobby.content}\n\n**Game on!**`, components: [] });
    await beginHole(channel, game);
  },

  async cancel({ interaction, game, isHost }) {
    if (!isHost) return tell(interaction, "Only the person who started the game can cancel it.");
    games.delete(interaction.channelId);
    game.phase = "over";
    await interaction.update({ content: "⛳ Minigolf cancelled.", components: [] });
  },

  // ----- Aiming and shooting -----

  async dir({ interaction, game, player }) {
    if (!isTurn(game, player)) return tell(interaction, "It's not your turn.");
    game.aim.direction = Number(interaction.values[0]);
    await interaction.update({ content: turnText(game), components: turnControls(game) });
  },

  async pow({ interaction, game, player, extra }) {
    if (!isTurn(game, player)) return tell(interaction, "It's not your turn.");
    game.aim.power = Number(extra);
    await interaction.update({ content: turnText(game), components: turnControls(game) });
  },

  async shoot({ interaction, game, player, channel }) {
    if (!isTurn(game, player)) return tell(interaction, "It's not your turn.");
    if (game.busy) return interaction.deferUpdate();
    game.busy = true;
    await interaction.update({ components: [] }); // no double shots

    const { direction, power } = game.aim;
    const shot = { ...shoot(game, direction, power), direction, power };
    const lines = shotReport(game, shot);
    if (shot.holeOver) await endHole(channel, game, lines);
    else await sendTurn(channel, game, lines, shot);
    game.busy = false;
  },

  async skipturn({ interaction, game, channel, isHost }) {
    if (!isHost) return tell(interaction, "Only the person who started the game can skip a turn.");
    if (game.busy || game.phase !== "playing") return interaction.deferUpdate();
    game.busy = true;
    await interaction.update({ components: [] });

    const { player, holeOver } = skipTurn(game);
    const lines = [`⏭️ Skipped ${player.name}, who takes ${MAX_STROKES} for this hole.`];
    if (holeOver) await endHole(channel, game, lines);
    else await sendTurn(channel, game, lines);
    game.busy = false;
  },

  // ----- Chaos Cards -----

  async cards({ interaction, game, player }) {
    if (!player) return tell(interaction, "You're not in this game.");
    await interaction.reply({ ...cardHand(game, player), ephemeral: true });
  },

  async card({ interaction, game, player, extra, channel }) {
    if (!player) return tell(interaction, "You're not in this game.");
    const index = Number(extra);
    const key = player && player.hand[index];
    if (key && CARDS[key].who === "someone") {
      if (!isTurn(game, player)) return interaction.update(cardHand(game, player, "Wait for your turn."));
      if (game.players.length < 2) return interaction.update(cardHand(game, player, "That card needs another player."));
      return interaction.update(targetPicker(game, player, index));
    }
    await useCard(interaction, game, player, index, null, channel);
  },

  async target({ interaction, game, player, extra, channel }) {
    if (!player) return tell(interaction, "You're not in this game.");
    const target = findPlayer(game, interaction.values[0]);
    await useCard(interaction, game, player, Number(extra), target, channel);
  },

  // ----- Sabotage: placing traps -----

  async trap({ interaction, game, player }) {
    if (!player) return tell(interaction, "You're not in this game.");
    if (currentPlacer(game) !== player) return tell(interaction, "Wait for your turn to place a trap.");
    game.placing.drafts = game.placing.drafts || new Map();
    const draft = game.placing.drafts.get(player.id) || {};
    game.placing.drafts.set(player.id, draft);
    await interaction.reply({ ...trapPicker(game, player, draft), ephemeral: true });
  },

  async tkind(context) {
    await updateDraft(context, (draft, value) => (draft.kind = value));
  },

  async tcol(context) {
    await updateDraft(context, (draft, value) => (draft.col = Number(value)));
  },

  async trow(context) {
    await updateDraft(context, (draft, value) => (draft.row = Number(value)));
  },

  async tplace({ interaction, game, player, channel }) {
    const draft = draftFor(game, player);
    if (!draft) return interaction.update({ content: "It's not your turn to place a trap anymore.", components: [] });
    const problem = placeTrap(game, player, draft.kind, draft.col, draft.row);
    if (problem) return interaction.update(trapPicker(game, player, draft, problem));

    await interaction.update({ content: "🪤 Trap placed! It stays hidden until everyone has placed theirs.", components: [] });
    await afterTrap(channel, game);
  },

  async skiptrap({ interaction, game, channel, isHost }) {
    if (!isHost) return tell(interaction, "Only the person who started the game can skip someone.");
    if (game.phase !== "traps") return interaction.deferUpdate();
    skipPlacer(game);
    await interaction.deferUpdate();
    await afterTrap(channel, game);
  },
};

function isTurn(game, player) {
  return player && currentPlayer(game) === player;
}

async function useCard(interaction, game, player, index, target, channel) {
  if (!isTurn(game, player) || game.busy) return interaction.update(cardHand(game, player, "Wait for your turn."));
  const played = playCard(game, player, index, target);
  if (played.error) return interaction.update(cardHand(game, player, played.error));

  await interaction.update({ content: "🃏 Card played!", components: [] });
  game.busy = true;
  await clearControls(game.turnMessage);
  await sendTurn(channel, game, [`🃏 ${played.text}`]); // fresh picture, since balls may have moved
  game.busy = false;
}

function draftFor(game, player) {
  if (!player || currentPlacer(game) !== player || !game.placing.drafts) return null;
  return game.placing.drafts.get(player.id) || null;
}

async function updateDraft({ interaction, game, player }, change) {
  const draft = draftFor(game, player);
  if (!draft) return interaction.update({ content: "It's not your turn to place a trap anymore.", components: [] });
  change(draft, interaction.values[0]);
  await interaction.update(trapPicker(game, player, draft));
}

// After a trap goes down: next player places, or show all the traps and start.
async function afterTrap(channel, game) {
  if (game.phase === "playing") await revealTraps(channel, game);
  else await game.trapMessage.edit({ content: trapTimeText(game) });
}

export default event;
