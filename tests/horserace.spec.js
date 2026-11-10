import { expect } from "chai";
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
  leader,
  moveHorses,
  payOut,
  pickWinner,
  placeBet,
} from "../src/games/horserace";
import { IMAGE_HEIGHT, IMAGE_WIDTH, drawRace } from "../src/games/horseracePicture";

// A fake Math.random that hands out these numbers in order, so the test
// knows exactly what will happen.
function randomOf(...numbers) {
  return () => numbers.shift();
}

describe("horse race", () => {
  it("starts with every horse at the gate", () => {
    const game = createGame();
    expect(game.stage).to.equal("betting");
    expect(game.positions).to.deep.equal([0, 0, 0, 0, 0]);
  });

  it("gives new players starting coins", () => {
    const wallets = new Map();
    expect(getCoins(wallets, "ana")).to.equal(STARTING_COINS);
  });

  it("takes coins for each bet and adds up the totals", () => {
    const game = createGame();
    const wallets = new Map();
    expect(placeBet(game, wallets, "ana", 0)).to.equal("placed");
    expect(placeBet(game, wallets, "ana", 0)).to.equal("placed");
    expect(placeBet(game, wallets, "ben", 4)).to.equal("placed");
    expect(getCoins(wallets, "ana")).to.equal(STARTING_COINS - 2 * BET_SIZE);
    expect(betTotals(game)).to.deep.equal([2 * BET_SIZE, 0, 0, 0, BET_SIZE]);
  });

  it("won't take a bet from a player who can't cover it", () => {
    const game = createGame();
    const wallets = new Map([["ana", BET_SIZE - 1]]);
    expect(placeBet(game, wallets, "ana", 1)).to.equal("broke");
    expect(getCoins(wallets, "ana")).to.equal(BET_SIZE - 1);
    expect(betTotals(game)).to.deep.equal([0, 0, 0, 0, 0]);
  });

  it("closes betting once the race starts", () => {
    const game = createGame();
    moveHorses(game, () => 0.5);
    expect(placeBet(game, new Map(), "ana", 0)).to.equal("closed");
  });

  it("gallops 0 to 2, plus 1 for a burst of speed", () => {
    // 0.9 * 3 = 2.7, which rounds down to 2. Then 0.1 is under the speed, so +1.
    expect(gallop(HORSES[0], randomOf(0.9, 0.1))).to.equal(3);
    // 0.1 * 3 = 0.3, which rounds down to 0. Then 0.99 is over the speed, so no burst.
    expect(gallop(HORSES[0], randomOf(0.1, 0.99))).to.equal(0);
  });

  it("never runs a horse past the finish line", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH - 1, 0, 0, 0, 0];
    moveHorses(game, () => 0.1); // every horse gets 0 + a burst = 1 step
    expect(game.positions[0]).to.equal(TRACK_LENGTH);
    expect(finishers(game)).to.deep.equal([0]);
    expect(leader(game)).to.equal(0);
  });

  it("picks one winner in a photo finish", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH, 3, TRACK_LENGTH, 5, 1];
    expect(pickWinner(game, () => 0.9)).to.equal(2);
    expect(game.stage).to.equal("done");
  });

  it("pays winning bets at the horse's odds", () => {
    const game = createGame();
    const wallets = new Map();
    placeBet(game, wallets, "ana", 2); // 10 on Lucky Clover
    placeBet(game, wallets, "ana", 0); // 10 on Thunderbolt
    placeBet(game, wallets, "ben", 0); // 10 on Thunderbolt
    const results = payOut(game, wallets, 2); // Lucky Clover wins
    const ana = results.find((r) => r.userId === "ana");
    const ben = results.find((r) => r.userId === "ben");
    expect(ana.won).to.equal(BET_SIZE * HORSES[2].odds);
    expect(ana.coins).to.equal(STARTING_COINS - 2 * BET_SIZE + BET_SIZE * HORSES[2].odds);
    expect(ben.won).to.equal(0);
    expect(ben.coins).to.equal(STARTING_COINS - BET_SIZE);
  });

  it("lets the favorite win more often than the long shot", () => {
    const wins = HORSES.map(() => 0);
    for (let i = 0; i < 2000; i++) {
      const game = createGame();
      while (finishers(game).length === 0) moveHorses(game);
      wins[pickWinner(game)] += 1;
    }
    expect(wins[0]).to.be.greaterThan(wins[4]);
  });

  it("draws the race as a PNG picture", () => {
    const game = createGame();
    moveHorses(game, () => 0.5);
    const png = drawRace(game, 1);
    // Every PNG starts with the same 8 bytes, then its width and height.
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join("")).to.equal("PNG");
    expect(png.readUInt32BE(16)).to.equal(IMAGE_WIDTH);
    expect(png.readUInt32BE(20)).to.equal(IMAGE_HEIGHT);
  });

  it("draws the finished race with a winner", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH, 3, 5, 7, 9];
    expect(drawRace(game, 2, 0).length).to.be.greaterThan(1000);
  });
});
