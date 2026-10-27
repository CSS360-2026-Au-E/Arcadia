/*
  MINIGOLF GAME RULES

  Turn-based minigolf for 1 to 8 players, with two modes the host picks:
  - Sabotage: before each hole, everyone secretly drops a trap on the course.
  - Chaos Cards: everyone holds cards that bend the rules.
  Lowest total strokes after all the holes wins.

  This file keeps track of the game: players, turns, strokes, holes.
  It does not talk to Discord (that's minigolfRound.js). Tested in
  tests/minigolf.spec.js.

  A game is a plain object:
    {
      mode: "sabotage" | "chaos",
      holeCount: 6,
      hostId,
      players: [ player, ... ],
      phase: "lobby" | "traps" | "playing" | "over",
      holeIndex,          // which hole we're on, 0 is the first
      course,             // the current hole, from parseHole
      traps: [],          // Sabotage traps on this hole
      holeEffects: {},    // Chaos cards that change the hole for everyone
      order: [player],    // who shoots in what order this hole
      turn,               // index into order: whose turn it is
      placing,            // Sabotage only: who is placing a trap right now
      random,             // like Math.random (tests pass a fixed one)
    }

  A player:
    {
      id, name, color,    // color is an index into COLORS
      ball: { x, y },
      strokes: [3, 5, ...] // one number per hole
      done,               // finished this hole
      effects: {},        // cards played on them, see minigolfCards.js
      hand: [],           // Chaos Cards mode only
      playedCard,         // already played a card this hole
      lastShot,           // so the Mulligan card can undo it
    }
*/
import { HOLES, parseHole } from "./minigolfCourses";
import { simulateShot } from "./minigolfPhysics";
import { HAND_SIZE, refillHand } from "./minigolfCards";
import { makeTrap, moveWalls, offerTraps, placementProblem, randomTrap } from "./minigolfTraps";

export const MAX_PLAYERS = 8;
export const MAX_STROKES = 8;
export const HOLE_CHOICES = [3, 6, 9];
export const DEFAULT_HOLES = 6;

export const MODES = {
  sabotage: { name: "Sabotage", text: "Before each hole, everyone secretly drops a trap for the others." },
  chaos: { name: "Chaos Cards", text: "Everyone holds cards that bend the rules. Play one per hole." },
};

// Ball colors, in the order players join.
export const COLORS = [
  { name: "red", emoji: "🔴", rgb: [230, 57, 70] },
  { name: "blue", emoji: "🔵", rgb: [58, 134, 255] },
  { name: "yellow", emoji: "🟡", rgb: [255, 214, 10] },
  { name: "purple", emoji: "🟣", rgb: [155, 93, 229] },
  { name: "orange", emoji: "🟠", rgb: [251, 133, 0] },
  { name: "brown", emoji: "🟤", rgb: [141, 94, 60] },
  { name: "white", emoji: "⚪", rgb: [250, 250, 250] },
  { name: "black", emoji: "⚫", rgb: [30, 30, 30] },
];

// One game per channel: channel id -> game.
export const games = new Map();

export function createGame({ hostId, mode = "sabotage", holes = DEFAULT_HOLES, random = Math.random }) {
  return {
    mode,
    holeCount: Math.min(holes, HOLES.length),
    hostId,
    players: [],
    phase: "lobby",
    holeIndex: -1,
    course: null,
    traps: [],
    holeEffects: {},
    order: [],
    turn: 0,
    placing: null,
    random,
  };
}

// Returns a reason they can't join, or null if they joined.
export function addPlayer(game, id, name) {
  if (game.phase !== "lobby") return "The game already started.";
  if (findPlayer(game, id)) return "You're already in.";
  if (game.players.length >= MAX_PLAYERS) return `The game is full (${MAX_PLAYERS} players).`;
  game.players.push({
    id,
    name,
    color: game.players.length,
    ball: null,
    strokes: [],
    done: false,
    effects: {},
    hand: [],
    playedCard: false,
    lastShot: null,
  });
  return null;
}

export function findPlayer(game, id) {
  return game.players.find((p) => p.id === id) || null;
}

export function total(player) {
  return player.strokes.reduce((sum, n) => sum + n, 0);
}

// Everyone, best score first.
export function standings(game) {
  return [...game.players].sort((a, b) => total(a) - total(b));
}

// Worst score goes first, so whoever is behind gets first pick.
function worstFirst(game) {
  return [...game.players].sort((a, b) => total(b) - total(a));
}

// Move on to the next hole. Returns false if there are no holes left.
export function startHole(game) {
  if (game.holeIndex + 1 >= game.holeCount) {
    game.phase = "over";
    return false;
  }
  game.holeIndex += 1;
  game.course = parseHole(HOLES[game.holeIndex]);
  game.traps = [];
  game.holeEffects = {};
  game.order = worstFirst(game);
  game.turn = 0;

  for (const player of game.players) {
    player.ball = { ...game.course.tee };
    player.strokes[game.holeIndex] = 0;
    player.done = false;
    player.effects = {};
    player.playedCard = false;
    player.lastShot = null;
  }

  if (game.mode === "chaos") {
    // Last place draws one extra card to help them catch up.
    const last = game.order[0];
    for (const player of game.players) {
      const behind = game.players.length > 1 && player === last && total(player) > 0;
      refillHand(player, behind ? HAND_SIZE + 1 : HAND_SIZE, game.random);
    }
  }

  if (game.mode === "sabotage") {
    game.phase = "traps";
    game.placing = { index: 0, offers: new Map() };
    for (const player of game.players) game.placing.offers.set(player.id, offerTraps(game.random));
  } else {
    game.phase = "playing";
  }
  return true;
}

// Sabotage: the player whose turn it is to place a trap.
export function currentPlacer(game) {
  if (game.phase !== "traps") return null;
  return game.order[game.placing.index] || null;
}

// Sabotage: place a trap. Returns a reason it can't go there, or null.
export function placeTrap(game, player, kind, col, row) {
  if (currentPlacer(game) !== player) return "It's not your turn to place a trap.";
  if (!game.placing.offers.get(player.id).includes(kind)) return "That trap wasn't one of your choices.";
  const problem = placementProblem(game.course, game.traps, col, row);
  if (problem) return problem;
  game.traps.push(makeTrap(kind, col, row, player.id, game.random));
  nextPlacer(game);
  return null;
}

// Sabotage: the host skips a player, so the bot drops a random trap for them.
export function skipPlacer(game) {
  const player = currentPlacer(game);
  if (!player) return;
  const trap = randomTrap(game.course, game.traps, player.id, game.random);
  if (trap) game.traps.push(trap);
  nextPlacer(game);
}

function nextPlacer(game) {
  game.placing.index += 1;
  if (game.placing.index >= game.order.length) game.phase = "playing";
}

// Whose turn it is to shoot.
export function currentPlayer(game) {
  if (game.phase !== "playing") return null;
  return game.order[game.turn] || null;
}

// Everything the physics needs to know about the cards in play.
export function effectsFor(game, player) {
  return { ...player.effects, ...game.holeEffects };
}

/*
  The current player shoots. Returns:
    { player, result, holeOver }
  `result` is what simulateShot returned.
*/
export function shoot(game, direction, power) {
  const player = currentPlayer(game);
  const hole = game.holeIndex;
  const result = simulateShot({
    course: game.course,
    start: player.ball,
    direction,
    power,
    traps: game.traps,
    effects: effectsFor(game, player),
    random: game.random,
  });

  player.lastShot = { hole, from: { ...player.ball }, strokesBefore: player.strokes[hole] };
  player.ball = result.end;
  player.strokes[hole] = Math.min(MAX_STROKES, player.strokes[hole] + 1 + result.penalty);
  if (result.holed || player.strokes[hole] >= MAX_STROKES) player.done = true;

  // "Next shot" cards are used up now.
  delete player.effects.ghost;
  delete player.effects.superPutt;
  delete player.effects.mirror;

  const balls = game.players.filter((p) => !p.done).map((p) => p.ball);
  moveWalls(game.course, game.traps, balls);

  const holeOver = nextTurn(game);
  return { player, result, holeOver };
}

// The host skips whoever's turn it is (they left, or went AFK).
// They take the most strokes for this hole.
export function skipTurn(game) {
  const player = currentPlayer(game);
  if (!player) return { player: null, holeOver: false };
  player.strokes[game.holeIndex] = MAX_STROKES;
  player.done = true;
  return { player, holeOver: nextTurn(game) };
}

// Pass the turn to the next player who hasn't finished.
// Returns true when everyone is done with the hole.
function nextTurn(game) {
  const count = game.order.length;
  for (let step = 1; step <= count; step++) {
    const index = (game.turn + step) % count;
    if (!game.order[index].done) {
      game.turn = index;
      return false;
    }
  }
  return true;
}

// Everyone tied for the lowest score.
export function winners(game) {
  const best = Math.min(...game.players.map(total));
  return game.players.filter((p) => total(p) === best);
}
