/*
  HORSE RACE FUZZER

  A normal test checks one example we picked by hand.
  A fuzzer lets fast-check make up hundreds of random examples for us
  (random players, random clicks, random races) and checks that some rule
  is ALWAYS true. If it finds an example that breaks the rule, the test
  fails and prints the smallest example that breaks it.

  The rules we check here:
    1. Betting never creates or destroys dubloons.
    2. Nobody's dubloons ever go below 0.
    3. A horse always gallops 0 to 3 and never runs past the finish line.
    4. The payout is exactly "bets on the winner x the winner's odds".
    5. Clicking a horse that doesn't exist never takes your dubloons.

  Run it with: npm test
*/
import { expect } from "chai";
import fc from "fast-check";
import {
  BET_SIZE,
  HORSES,
  STARTING_COINS,
  TRACK_LENGTH,
  betTotals,
  createGame,
  finishers,
  gallop,
  getCoins,
  moveHorses,
  payOut,
  pickWinner,
  placeBet,
} from "../src/games/horserace";

// ---------------------------------------------------------------------------
// RANDOM INPUTS ("arbitraries")
// These tell fast-check what kind of random values to make up.
// ---------------------------------------------------------------------------

// A player is one of a few made-up user IDs, so the same player clicks more than once.
const player = fc.constantFrom("ana", "ben", "cat", "dev");

// A real horse: 0 to 4.
const realHorse = fc.integer({ min: 0, max: HORSES.length - 1 });

// One click on a horse's button.
const click = fc.record({ userId: player, horse: realHorse });

// A list of 0 to 40 clicks.
const clicks = fc.array(click, { maxLength: 40 });

// A random number like Math.random gives: 0 up to (but not including) 1.
const randomNumber = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

// A "horse number" that might be broken: too big, negative, a decimal, or not a number at all.
// (Number("abc") is NaN, which is what a broken button ID would turn into.)
const badHorse = fc.oneof(
  fc.integer({ min: HORSES.length, max: 1000 }),
  fc.integer({ min: -1000, max: -1 }),
  fc.double({ min: 0.1, max: 3.9, noNaN: true }).filter((n) => !Number.isInteger(n)),
  fc.constant(NaN)
);

// ---------------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------------

// Every player starts with STARTING_COINS. Each one gets a starting amount from 0 to 200
// so the fuzzer also tries players who are almost broke.
const startingWallets = fc.record({
  ana: fc.integer({ min: 0, max: 200 }),
  ben: fc.integer({ min: 0, max: 200 }),
  cat: fc.integer({ min: 0, max: 200 }),
  dev: fc.integer({ min: 0, max: 200 }),
});

// Add up every number in a list.
const sum = (list) => list.reduce((total, n) => total + n, 0);

// Add up every wallet in the Map.
const walletTotal = (wallets) => sum([...wallets.values()]);

// Run a race to the end with a fake Math.random that always gives the same number.
// 0.1 is under every horse's speed, so every horse moves at least 1 step each time
// and the race always ends.
function finishRace(game) {
  while (finishers(game).length === 0) moveHorses(game, () => 0.1);
  return pickWinner(game, () => 0);
}

// ---------------------------------------------------------------------------
// THE FUZZ TESTS
// ---------------------------------------------------------------------------

describe("horse race fuzzer", () => {
  it("never creates or destroys dubloons while betting", () => {
    fc.assert(
      fc.property(startingWallets, clicks, (start, clickList) => {
        const wallets = new Map(Object.entries(start));
        const before = walletTotal(wallets);
        const game = createGame();

        for (const { userId, horse } of clickList) placeBet(game, wallets, userId, horse);

        // Every dubloon is either still in a wallet or sitting on a horse.
        const onHorses = sum(betTotals(game));
        expect(walletTotal(wallets) + onHorses).to.equal(before);
      })
    );
  });

  it("never lets anyone's dubloons go below 0", () => {
    fc.assert(
      fc.property(startingWallets, clicks, (start, clickList) => {
        const wallets = new Map(Object.entries(start));
        const game = createGame();

        for (const { userId, horse } of clickList) {
          placeBet(game, wallets, userId, horse);
          expect(getCoins(wallets, userId)).to.be.at.least(0);
        }
      })
    );
  });

  it("always gallops 0 to 3 steps, whatever Math.random gives", () => {
    fc.assert(
      fc.property(realHorse, randomNumber, randomNumber, (horse, first, second) => {
        const numbers = [first, second];
        const steps = gallop(HORSES[horse], () => numbers.shift());
        expect(steps).to.be.within(0, 3);
        expect(Number.isInteger(steps)).to.equal(true);
      })
    );
  });

  it("never moves a horse backwards or past the finish line", () => {
    fc.assert(
      fc.property(fc.array(randomNumber, { minLength: 10, maxLength: 200 }), (numbers) => {
        const game = createGame();
        // Loop through the made-up numbers over and over as a fake Math.random.
        let i = 0;
        const random = () => numbers[i++ % numbers.length];

        for (let step = 0; step < 50; step++) {
          const before = [...game.positions];
          moveHorses(game, random);
          game.positions.forEach((position, horse) => {
            expect(position).to.be.at.least(before[horse]); // never backwards
            expect(position).to.be.at.most(TRACK_LENGTH); // never past the line
          });
        }
      })
    );
  });

  it("pays exactly the bets on the winner times its odds", () => {
    fc.assert(
      fc.property(clicks, (clickList) => {
        const wallets = new Map();
        const game = createGame();
        for (const { userId, horse } of clickList) placeBet(game, wallets, userId, horse);

        const totals = betTotals(game);
        const winner = finishRace(game);
        const results = payOut(game, wallets, winner);

        const paid = sum(results.map((r) => r.won));
        expect(paid).to.equal(totals[winner] * HORSES[winner].odds);
      })
    );
  });

  it("never takes dubloons for a horse that doesn't exist", () => {
    fc.assert(
      fc.property(player, badHorse, (userId, horse) => {
        const wallets = new Map();
        const game = createGame();

        const status = placeBet(game, wallets, userId, horse);

        expect(status).to.equal("invalid");
        expect(getCoins(wallets, userId)).to.equal(STARTING_COINS);
        expect(betTotals(game)).to.deep.equal([0, 0, 0, 0, 0]);
      })
    );
  });

  it("still bets the right amount after a broken click", () => {
    // A broken click followed by a real one should behave like just the real one.
    fc.assert(
      fc.property(player, badHorse, realHorse, (userId, bad, good) => {
        const wallets = new Map();
        const game = createGame();
        placeBet(game, wallets, userId, bad);
        placeBet(game, wallets, userId, good);

        expect(getCoins(wallets, userId)).to.equal(STARTING_COINS - BET_SIZE);
        expect(sum(betTotals(game))).to.equal(BET_SIZE);
      })
    );
  });
});
