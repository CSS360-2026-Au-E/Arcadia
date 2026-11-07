import { expect } from "chai";
import {
  LONGEST_FUSE,
  SHORTEST_FUSE,
  canStart,
  createGame,
  explode,
  fuseSeconds,
  isOver,
  join,
  pass,
  startRound,
  winner,
} from "../src/games/hotpotato";

// Make a game that has already started, with these players.
function gameWith(...players) {
  const game = createGame();
  for (const id of players) join(game, id);
  startRound(game);
  return game;
}

describe("hot potato", () => {
  it("lets people join before it starts", () => {
    const game = createGame();
    expect(join(game, "ana")).to.equal("joined");
    expect(join(game, "ana")).to.equal("already");
    expect(game.players).to.deep.equal(["ana"]);
  });

  it("needs at least 2 players to start", () => {
    const game = createGame();
    join(game, "ana");
    expect(canStart(game)).to.equal(false);
    join(game, "ben");
    expect(canStart(game)).to.equal(true);
  });

  it("closes joining once the game starts", () => {
    const game = gameWith("ana", "ben");
    expect(join(game, "cat")).to.equal("closed");
  });

  it("gives the potato to someone who is playing", () => {
    const game = gameWith("ana", "ben", "cat");
    expect(game.players).to.include(game.holder);
  });

  it("lets the holder pass the potato", () => {
    const game = gameWith("ana", "ben");
    game.holder = "ana";
    expect(pass(game, "ana", "ben")).to.equal("passed");
    expect(game.holder).to.equal("ben");
  });

  it("stops people who don't have the potato from passing it", () => {
    const game = gameWith("ana", "ben", "cat");
    game.holder = "ana";
    expect(pass(game, "ben", "cat")).to.equal("not-holder");
    expect(game.holder).to.equal("ana");
  });

  it("won't pass to yourself or to someone not playing", () => {
    const game = gameWith("ana", "ben");
    game.holder = "ana";
    expect(pass(game, "ana", "ana")).to.equal("self");
    expect(pass(game, "ana", "zoe")).to.equal("not-playing");
    expect(game.holder).to.equal("ana");
  });

  it("knocks out whoever is holding it when it explodes", () => {
    const game = gameWith("ana", "ben", "cat");
    game.holder = "ben";
    expect(explode(game)).to.equal("ben");
    expect(game.players).to.deep.equal(["ana", "cat"]);
    expect(game.out).to.deep.equal(["ben"]);
    expect(isOver(game)).to.equal(false);
  });

  it("can't pass to someone who already exploded", () => {
    const game = gameWith("ana", "ben", "cat");
    game.holder = "ben";
    explode(game);
    startRound(game);
    game.holder = "ana";
    expect(pass(game, "ana", "ben")).to.equal("not-playing");
  });

  it("ends when one player is left, and they win", () => {
    const game = gameWith("ana", "ben");
    game.holder = "ana";
    explode(game);
    expect(isOver(game)).to.equal(true);
    expect(winner(game)).to.equal("ben");
  });

  it("picks a fuse between the shortest and longest times", () => {
    for (let i = 0; i < 100; i++) {
      const seconds = fuseSeconds();
      expect(seconds).to.be.at.least(SHORTEST_FUSE);
      expect(seconds).to.be.at.most(LONGEST_FUSE);
    }
  });
});
