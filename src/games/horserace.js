/*
  HORSE RACE GAME RULES

  This file only knows the rules of the horse race. It does not talk to Discord.
  Keeping the rules separate makes them easy to read and easy to test
  (see tests/horserace.spec.js). The Discord side is in
  src/events/horseraceInteraction.js, and the race picture is drawn by
  src/games/horseracePicture.js.

  How a game goes, like betting at a real racetrack:
    1. Someone types /horserace. The bot shows the five horses and their odds.
    2. For a few seconds, players click a horse's button to bet coins on it.
       Each click bets 10 more coins. You can bet on more than one horse.
    3. Betting closes and the race starts. Every couple of seconds, each horse
       gallops forward a random amount. Faster horses tend to go further.
    4. The first horse past the finish line wins. If two cross on the same
       step, it's a photo finish and one of them is picked at random.
    5. Bets on the winner pay out at that horse's odds. Bets on the other
       horses are lost.

  WHAT "ODDS" MEAN
    A horse with odds of 4 pays 4 times your bet if it wins.
    Bet 10 coins at odds of 4 and you get 40 coins back.
    The favorite (the fastest horse) has low odds, because it wins a lot.
    The long shot has high odds, because it hardly ever wins.

  A "game" is just a plain object (a bundle of named values) that looks like this:
    {
      stage: "betting",              // "betting" first, then "racing", then "done"
      positions: [0, 0, 0, 0, 0],    // how far each horse has run
      lastSteps: [0, 0, 0, 0, 0],    // how far each horse ran on the last step
      bets: { "111": [10, 0, 20, 0, 0] },  // user ID -> coins bet on each horse
    }

  "wallets" is a Map from user ID to how many coins that person has.
  The tests pass a plain Map. The bot passes dubloonWallets() from
  src/economy/bank.js, which works like a Map but uses each player's saved
  dubloons, so the "coins" here are dubloons in the real game.
*/

// ---------------------------------------------------------------------------
// SETTINGS
// Change these numbers to change how the race feels.
// ---------------------------------------------------------------------------

/*
  The horses.
    name:   what the horse is called
    button: the emoji on its bet button (matches the jockey's color in the picture)
    odds:   how many times your bet you get back if it wins
    speed:  the chance (0 to 1) of an extra burst of speed each step.
            Higher speed = wins more often. The odds were picked to match:
            Thunderbolt wins about 1 race in 3, Long Shot Larry about 1 in 13.
            (The odds pay a little less than that, just like a real racetrack.)
*/
export const HORSES = [
  { name: "Thunderbolt", button: "🔴", odds: 2, speed: 0.62 },
  { name: "Midnight Express", button: "🔵", odds: 3, speed: 0.54 },
  { name: "Lucky Clover", button: "🟢", odds: 4, speed: 0.48 },
  { name: "Dusty Boots", button: "🟡", odds: 6, speed: 0.42 },
  { name: "Long Shot Larry", button: "🟣", odds: 10, speed: 0.33 },
];

// How long the track is. Longer track = longer race.
export const TRACK_LENGTH = 20;

// How long players have to place bets, in seconds.
export const BET_SECONDS = 25;

// How long the bot waits between each step of the race, in seconds.
// Each step uploads a new picture, and Discord only lets a bot edit a
// message about 5 times every 5 seconds, so don't make this smaller than 1.
export const STEP_SECONDS = 2;

// How many dubloons one click of a horse's button bets.
export const BET_SIZE = 10;

// How many coins a brand new wallet starts with. The bot's real wallets are
// dubloons (see src/economy/bank.js), which start at STARTING_DUBLOONS.
export const STARTING_COINS = 100;

// ---------------------------------------------------------------------------
// COINS
// ---------------------------------------------------------------------------

// How many coins someone has. New players start with STARTING_COINS.
export function getCoins(wallets, userId) {
  if (!wallets.has(userId)) wallets.set(userId, STARTING_COINS);
  return wallets.get(userId);
}

// ---------------------------------------------------------------------------
// STARTING A GAME AND BETTING
// ---------------------------------------------------------------------------

// Make a brand new race. Every horse starts at 0 and nobody has bet yet.
export function createGame() {
  return {
    stage: "betting",
    positions: HORSES.map(() => 0), // one 0 for each horse
    lastSteps: HORSES.map(() => 0), // nobody has moved yet
    bets: {},                       // empty: nobody has bet yet
  };
}

/*
  Bet BET_SIZE coins on one horse (0 is the first horse, 4 is the last).
  The coins come out of the player's wallet right away.
  Gives back one of:
    "placed"   - the bet worked
    "broke"    - they don't have BET_SIZE coins, so nothing was bet
    "closed"   - too late, the race already started
*/
export function placeBet(game, wallets, userId, horse) {
  if (game.stage !== "betting") return "closed";
  if (getCoins(wallets, userId) < BET_SIZE) return "broke";

  // First bet from this person? Give them an empty bet slip: 0 on every horse.
  if (!game.bets[userId]) game.bets[userId] = HORSES.map(() => 0);

  game.bets[userId][horse] += BET_SIZE;
  wallets.set(userId, getCoins(wallets, userId) - BET_SIZE);
  return "placed";
}

// How many coins are bet on each horse in total, like [30, 0, 10, 0, 50].
export function betTotals(game) {
  const totals = HORSES.map(() => 0);
  // Object.values() gives every bet slip, like [[10, 0, ...], [0, 20, ...]].
  for (const slip of Object.values(game.bets)) {
    slip.forEach((coins, horse) => (totals[horse] += coins));
  }
  return totals;
}

// ---------------------------------------------------------------------------
// RACING
// ---------------------------------------------------------------------------

/*
  How far one horse gallops this step: 0 to 3.
  Every horse rolls 0, 1 or 2. Then it gets +1 more if it gets a burst of
  speed, which happens more often for faster horses.
  "random" is the function that makes random numbers. Normally it's
  Math.random, but the tests pass in their own so they know what happens.
*/
export function gallop(horse, random = Math.random) {
  const base = Math.floor(random() * 3); // 0, 1 or 2
  const burst = random() < horse.speed ? 1 : 0;
  return base + burst;
}

// Move every horse forward once, and remember how far each one went.
export function moveHorses(game, random = Math.random) {
  game.stage = "racing";
  game.lastSteps = HORSES.map((horse) => gallop(horse, random));
  game.positions = game.positions.map((position, i) =>
    // Math.min stops a horse from going past the finish line.
    Math.min(position + game.lastSteps[i], TRACK_LENGTH)
  );
}

// Which horses have reached the finish line, like [1, 3]. Empty if none yet.
export function finishers(game) {
  const done = [];
  game.positions.forEach((position, horse) => {
    if (position === TRACK_LENGTH) done.push(horse);
  });
  return done;
}

// Which horse is in front right now. If it's a tie, the first one listed.
export function leader(game) {
  const best = Math.max(...game.positions);
  return game.positions.indexOf(best);
}

/*
  Pick the winner out of the horses that finished on the same step.
  Marks the game as done and gives back the winning horse's number.
*/
export function pickWinner(game, random = Math.random) {
  const done = finishers(game);
  game.stage = "done";
  return done[Math.floor(random() * done.length)];
}

// ---------------------------------------------------------------------------
// PAYING OUT
// ---------------------------------------------------------------------------

/*
  Pay everyone who bet on the winner, and work out how each bettor did.
  Gives back one line per bettor, like:
    { userId: "111", bet: 30, won: 40, coins: 110 }
  "bet" is everything they bet, "won" is what they got back,
  and "coins" is how many coins they have now.
*/
export function payOut(game, wallets, winner) {
  return Object.entries(game.bets).map(([userId, slip]) => {
    const bet = slip.reduce((sum, coins) => sum + coins, 0); // add up the slip
    const won = slip[winner] * HORSES[winner].odds;
    wallets.set(userId, getCoins(wallets, userId) + won);
    return { userId, bet, won, coins: wallets.get(userId) };
  });
}
