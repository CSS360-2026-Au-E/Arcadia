var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var snailrace_exports = {};
__export(snailrace_exports, {
  BET_SECONDS: () => BET_SECONDS,
  SNAILS: () => SNAILS,
  STEP_SECONDS: () => STEP_SECONDS,
  TRACK_LENGTH: () => TRACK_LENGTH,
  betCounts: () => betCounts,
  createGame: () => createGame,
  finishers: () => finishers,
  moveSnails: () => moveSnails,
  pickWinner: () => pickWinner,
  placeBet: () => placeBet,
  randomStep: () => randomStep,
  winningBettors: () => winningBettors
});
module.exports = __toCommonJS(snailrace_exports);
const SNAILS = [
  { name: "Turbo", lane: "\u{1F534}" },
  { name: "Slimeball", lane: "\u{1F7E2}" },
  { name: "Sir Shellington", lane: "\u{1F535}" },
  { name: "Goo Lightning", lane: "\u{1F7E1}" }
];
const TRACK_LENGTH = 12;
const BET_SECONDS = 20;
const STEP_SECONDS = 2;
function createGame() {
  return {
    stage: "betting",
    positions: SNAILS.map(() => 0),
    lastSteps: SNAILS.map(() => 0),
    bets: {}
  };
}
function placeBet(game, userId, snail) {
  if (game.stage !== "betting")
    return "closed";
  const hadBet = userId in game.bets;
  game.bets[userId] = snail;
  return hadBet ? "changed" : "placed";
}
function betCounts(game) {
  const counts = SNAILS.map(() => 0);
  for (const snail of Object.values(game.bets))
    counts[snail] += 1;
  return counts;
}
function randomStep() {
  return Math.floor(Math.random() * 3);
}
function moveSnails(game, roll = randomStep) {
  game.stage = "racing";
  game.lastSteps = game.positions.map(() => roll());
  game.positions = game.positions.map(
    (position, i) => Math.min(position + game.lastSteps[i], TRACK_LENGTH)
  );
}
function finishers(game) {
  const done = [];
  game.positions.forEach((position, snail) => {
    if (position === TRACK_LENGTH)
      done.push(snail);
  });
  return done;
}
function pickWinner(game, pick = (count) => Math.floor(Math.random() * count)) {
  const done = finishers(game);
  game.stage = "done";
  return done[pick(done.length)];
}
function winningBettors(game, winner) {
  return Object.entries(game.bets).filter(([, snail]) => snail === winner).map(([userId]) => userId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BET_SECONDS,
  SNAILS,
  STEP_SECONDS,
  TRACK_LENGTH,
  betCounts,
  createGame,
  finishers,
  moveSnails,
  pickWinner,
  placeBet,
  randomStep,
  winningBettors
});
