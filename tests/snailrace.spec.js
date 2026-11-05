import { expect } from "chai";
import {
  TRACK_LENGTH,
  betCounts,
  createGame,
  finishers,
  moveSnails,
  pickWinner,
  placeBet,
  randomStep,
  winningBettors,
} from "../src/games/snailrace";
import { IMAGE_HEIGHT, IMAGE_WIDTH, drawRace } from "../src/games/snailracePicture";

// A "roll" that hands out these steps in order, so the test knows
// exactly how far each snail moves.
function rollsOf(...steps) {
  return () => steps.shift();
}

describe("snail race", () => {
  it("starts with every snail at the start line", () => {
    const game = createGame();
    expect(game.stage).to.equal("betting");
    expect(game.positions).to.deep.equal([0, 0, 0, 0]);
  });

  it("saves bets and lets players switch", () => {
    const game = createGame();
    expect(placeBet(game, "ana", 0)).to.equal("placed");
    expect(placeBet(game, "ben", 2)).to.equal("placed");
    expect(placeBet(game, "ana", 2)).to.equal("changed");
    expect(betCounts(game)).to.deep.equal([0, 0, 2, 0]);
  });

  it("closes betting once the race starts", () => {
    const game = createGame();
    moveSnails(game, rollsOf(1, 1, 1, 1));
    expect(placeBet(game, "ana", 0)).to.equal("closed");
  });

  it("moves each snail by its roll", () => {
    const game = createGame();
    moveSnails(game, rollsOf(0, 1, 2, 1));
    expect(game.positions).to.deep.equal([0, 1, 2, 1]);
  });

  it("never moves a snail past the finish line", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH - 1, 0, 0, 0];
    moveSnails(game, rollsOf(2, 0, 0, 0));
    expect(game.positions[0]).to.equal(TRACK_LENGTH);
    expect(finishers(game)).to.deep.equal([0]);
  });

  it("picks one winner in a photo finish", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH, 3, TRACK_LENGTH, 5];
    expect(finishers(game)).to.deep.equal([0, 2]);
    // pick the second snail in the list of finishers
    expect(pickWinner(game, () => 1)).to.equal(2);
    expect(game.stage).to.equal("done");
  });

  it("finds everyone who bet on the winner", () => {
    const game = createGame();
    placeBet(game, "ana", 1);
    placeBet(game, "ben", 3);
    placeBet(game, "cat", 1);
    expect(winningBettors(game, 1)).to.deep.equal(["ana", "cat"]);
    expect(winningBettors(game, 0)).to.deep.equal([]);
  });

  it("only rolls 0, 1 or 2", () => {
    for (let i = 0; i < 200; i++) {
      expect([0, 1, 2]).to.include(randomStep());
    }
  });

  it("remembers each snail's last step for the speed lines", () => {
    const game = createGame();
    moveSnails(game, rollsOf(2, 0, 1, 2));
    expect(game.lastSteps).to.deep.equal([2, 0, 1, 2]);
  });

  it("draws the race as a PNG picture", () => {
    const game = createGame();
    moveSnails(game, rollsOf(1, 2, 0, 1));
    const png = drawRace(game);
    // Every PNG starts with the same 8 bytes, then its width and height.
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join("")).to.equal("PNG");
    expect(png.readUInt32BE(16)).to.equal(IMAGE_WIDTH);
    expect(png.readUInt32BE(20)).to.equal(IMAGE_HEIGHT);
  });

  it("draws the finished race with a winner", () => {
    const game = createGame();
    game.positions = [TRACK_LENGTH, 3, 5, 7];
    expect(drawRace(game, 0).length).to.be.greaterThan(1000);
  });
});
