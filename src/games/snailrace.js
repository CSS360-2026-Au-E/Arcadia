/*
  SNAIL RACE GAME RULES

  This file only knows the rules of the snail race. It does not talk to Discord.
  Keeping the rules separate makes them easy to read and easy to test
  (see tests/snailrace.spec.js). The Discord side is in
  src/events/snailraceInteraction.js, and the race picture is drawn by
  src/games/snailracePicture.js.

  How a game goes:
    1. Someone types /snailrace. For a few seconds, players click a button
       to bet on one of the four snails.
    2. Betting closes and the race starts. Every second or so, each snail
       crawls forward a random amount (0, 1 or 2 steps).
    3. The first snail to reach the finish line wins. If two snails cross on
       the same step, it's a photo finish and one of them is picked at random.
    4. Everyone who bet on the winning snail wins.

  A "game" is just a plain object (a bundle of named values) that looks like this:
    {
      stage: "betting",           // "betting" first, then "racing", then "done"
      positions: [0, 0, 0, 0],    // how far each snail has crawled
      lastSteps: [0, 0, 0, 0],    // how far each snail moved on the last step
      bets: { "111": 2 },         // Discord user ID -> which snail they picked
    }
*/

// ---------------------------------------------------------------------------
// SETTINGS
// Change these numbers to change how the race feels.
// ---------------------------------------------------------------------------

// The four snails. "lane" is the emoji on each snail's bet button. It matches
// the shell color in the race picture (see snailracePicture.js).
export const SNAILS = [
  { name: "Turbo", lane: "🔴" },
  { name: "Slimeball", lane: "🟢" },
  { name: "Sir Shellington", lane: "🔵" },
  { name: "Goo Lightning", lane: "🟡" },
];

// How many steps long the track is. Longer track = longer race.
export const TRACK_LENGTH = 12;

// How long players have to place a bet, in seconds.
export const BET_SECONDS = 20;

// How long the bot waits between each step of the race, in seconds.
// Each step uploads a new picture, and Discord only lets a bot edit a
// message about 5 times every 5 seconds, so don't make this smaller than 1.
export const STEP_SECONDS = 2;

// ---------------------------------------------------------------------------
// STARTING A GAME AND BETTING
// ---------------------------------------------------------------------------

// Make a brand new race. Every snail starts at 0 and nobody has bet yet.
export function createGame() {
  return {
    stage: "betting",
    positions: SNAILS.map(() => 0), // one 0 for each snail
    lastSteps: SNAILS.map(() => 0), // nobody has moved yet
    bets: {},                       // empty: nobody has bet yet
  };
}

/*
  Save a player's bet on one snail (0 is the first snail, 3 is the last).
  Players can change their mind while betting is open.
  Gives back "placed" for a first bet, "changed" for a new pick,
  or "closed" if the race already started.
*/
export function placeBet(game, userId, snail) {
  if (game.stage !== "betting") return "closed";

  // "in" checks whether this user already has a bet saved.
  const hadBet = userId in game.bets;
  game.bets[userId] = snail;
  return hadBet ? "changed" : "placed";
}

// How many people bet on each snail, like [2, 0, 1, 0].
export function betCounts(game) {
  const counts = SNAILS.map(() => 0);
  // Object.values() gives just the picked snails, like [2, 0, 2].
  for (const snail of Object.values(game.bets)) counts[snail] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// RACING
// ---------------------------------------------------------------------------

// Pick how far one snail crawls this step: 0, 1 or 2.
// Math.random() gives a number from 0 up to (not including) 1,
// so Math.random() * 3 is 0 to 2.99, and Math.floor chops off the decimal.
export function randomStep() {
  return Math.floor(Math.random() * 3);
}

/*
  Move every snail forward once. "roll" is the function that decides how far
  each snail moves. Normally it's randomStep, but the tests pass in their own
  so they know exactly what will happen.
*/
export function moveSnails(game, roll = randomStep) {
  game.stage = "racing";
  // Roll once for each snail and remember the rolls, so the picture can
  // draw speed lines behind snails that zoomed 2 steps.
  game.lastSteps = game.positions.map(() => roll());
  game.positions = game.positions.map((position, i) =>
    // Math.min stops a snail from going past the finish line.
    Math.min(position + game.lastSteps[i], TRACK_LENGTH)
  );
}

// Which snails have reached the finish line, like [1, 3]. Empty if none yet.
export function finishers(game) {
  const done = [];
  game.positions.forEach((position, snail) => {
    if (position === TRACK_LENGTH) done.push(snail);
  });
  return done;
}

/*
  Pick the winner out of the snails that finished on the same step.
  "pick" chooses a random spot in the list. The tests pass in their own.
  Marks the game as done and gives back the winning snail's number.
*/
export function pickWinner(game, pick = (count) => Math.floor(Math.random() * count)) {
  const done = finishers(game);
  game.stage = "done";
  return done[pick(done.length)];
}

// The user IDs of everyone who bet on the winning snail.
export function winningBettors(game, winner) {
  // Object.entries() gives pairs like ["111", 2], one for each bet.
  return Object.entries(game.bets)
    .filter(([, snail]) => snail === winner)
    .map(([userId]) => userId);
}
