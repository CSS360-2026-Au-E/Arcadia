import { expect } from "chai";
import { HOLES, WIDTH, HEIGHT, parseHole, parseSquare, squareName } from "../src/games/minigolfCourses";
import { POWER_DISTANCE, simulateShot, suggestAim } from "../src/games/minigolfPhysics";
import { moveWalls, offerTraps, placementProblem } from "../src/games/minigolfTraps";
import { CARDS, playCard } from "../src/games/minigolfCards";
import {
  DEFAULT_HOLES,
  MAX_STROKES,
  addPlayer,
  createGame,
  currentPlacer,
  currentPlayer,
  placeTrap,
  shoot,
  skipPlacer,
  skipTurn,
  startHole,
  total,
  winners,
} from "../src/games/minigolf";
import { IMAGE_HEIGHT, IMAGE_WIDTH, drawCourse } from "../src/games/minigolfPicture";

// A plain test hole: tee on the left, cup on the right, nothing in between.
const FLAT = parseHole({
  name: "Flat",
  map: [
    "############",
    "#..........#",
    "#..........#",
    "#.T.......O#",
    "#..........#",
    "#..........#",
    "#..........#",
    "############",
  ],
});

// Directions: 0 = up, 4 = right, 8 = down, 12 = left.
const UP = 0;
const RIGHT = 4;
const DOWN = 8;
const LEFT = 12;

// The same "random" number every time, so tests always get the same result.
const fixed = (value) => () => value;

// Random-looking numbers that come out the same every test run.
function seeded(seed = 7) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Roll the ball from the tee and return where it stopped.
const roll = (course, direction, power, extra = {}) =>
  simulateShot({ course, start: course.tee, direction, power, ...extra });

// A two player game, already on its first hole.
function twoPlayerGame(mode) {
  const game = createGame({ hostId: "a", mode, holes: 3, random: seeded() });
  addPlayer(game, "a", "Abhi");
  addPlayer(game, "b", "Sam");
  startHole(game);
  return game;
}

describe("minigolf courses", () => {
  it("every hole has the right size, one tee and one cup", () => {
    for (const hole of HOLES) {
      const course = parseHole(hole);
      expect(course.grid).to.have.length(HEIGHT);
      course.grid.forEach((row) => expect(row).to.have.length(WIDTH));
      expect(hole.map.join("").split("T")).to.have.length(2);
      expect(hole.map.join("").split("O")).to.have.length(2);
    }
  });

  it("has at least as many holes as the default game", () => {
    expect(HOLES.length).to.be.at.least(DEFAULT_HOLES);
    expect(DEFAULT_HOLES).to.equal(6);
  });

  it("names squares like a chessboard", () => {
    expect(squareName(0, 0)).to.equal("A1");
    expect(squareName(11, 7)).to.equal("L8");
    expect(parseSquare("c4")).to.deep.equal({ col: 2, row: 3 });
    expect(parseSquare("M1")).to.equal(null);
  });
});

describe("minigolf physics", () => {
  it("rolls the right distance for each power on flat grass", () => {
    for (let power = 1; power <= 4; power++) {
      const shot = roll(FLAT, DOWN, power, { start: { x: 5.5, y: 1.5 } });
      const want = Math.min(POWER_DISTANCE[power - 1], 5); // the wall stops long ones
      if (POWER_DISTANCE[power - 1] < 5) expect(shot.end.y - 1.5).to.be.closeTo(want, 0.1);
    }
  });

  it("drops in the cup when it rolls over it gently", () => {
    const shot = roll(FLAT, RIGHT, 5);
    expect(shot.holed).to.equal(true);
    expect(shot.end).to.deep.equal(FLAT.cup);
  });

  it("skips over the cup when it's going too fast", () => {
    const course = parseHole({ ...{ name: "Long" }, map: FLAT_MAP_WITH_CUP_AT("#.T..O.....#") });
    const shot = roll(course, RIGHT, 5);
    expect(shot.holed).to.equal(false);
    expect(shot.end.x).to.be.greaterThan(course.cup.x + 1);
  });

  it("bounces off walls", () => {
    const shot = roll(FLAT, LEFT, 3); // the wall is 1 square to the left of the tee
    expect(shot.bounces).to.be.at.least(1);
    expect(shot.end.x).to.be.greaterThan(FLAT.tee.x);
  });

  it("slopes push the ball, and Gravity flip pushes it the other way", () => {
    const course = parseHole({ name: "Slope", map: FLAT_MAP_WITH_CUP_AT("#.T.vvvv..O#") });
    const normal = roll(course, RIGHT, 3);
    const flipped = roll(course, RIGHT, 3, { effects: { gravityFlip: true } });
    expect(normal.end.y).to.be.greaterThan(course.tee.y);
    expect(flipped.end.y).to.be.lessThan(course.tee.y);
  });

  it("water sends the ball back with a 1 stroke penalty", () => {
    const course = parseHole({ name: "Wet", map: FLAT_MAP_WITH_CUP_AT("#.T..~~~..O#") });
    const shot = roll(course, RIGHT, 3);
    expect(shot.water).to.equal(true);
    expect(shot.penalty).to.equal(1);
    expect(shot.end).to.deep.equal(course.tee);
  });

  it("aims a beginner straight at the cup", () => {
    expect(suggestAim(FLAT, FLAT.tee)).to.deep.equal({ direction: RIGHT, power: 4 });
  });

  it("gives the same result for the same shot", () => {
    const a = roll(parseHole(HOLES[6]), 5, 4);
    const b = roll(parseHole(HOLES[6]), 5, 4);
    expect(a.end).to.deep.equal(b.end);
  });
});

describe("minigolf traps", () => {
  const trap = (kind, col, extra = {}) => ({ kind, col, row: 3, owner: "b", ...extra });

  it("sticky goo stops the ball dead", () => {
    const shot = roll(FLAT, RIGHT, 5, { traps: [trap("goo", 4)] });
    expect(Math.floor(shot.end.x)).to.equal(4);
    expect(shot.hits.map((t) => t.kind)).to.deep.equal(["goo"]);
  });

  it("a bumper sends the ball back", () => {
    const shot = roll(FLAT, RIGHT, 4, { traps: [trap("bumper", 5)] });
    expect(shot.end.x).to.be.lessThan(5);
  });

  it("a banana peel spins the ball off course", () => {
    const shot = roll(FLAT, RIGHT, 4, { traps: [trap("banana", 4)], random: fixed(0.25) }); // spins straight down
    expect(shot.end.y).to.be.greaterThan(FLAT.tee.y + 1);
  });

  it("a fan pushes the ball sideways", () => {
    const shot = roll(FLAT, RIGHT, 3, { traps: [trap("fan", 3, { dir: UP })] });
    expect(shot.end.y).to.be.lessThan(FLAT.tee.y - 1);
  });

  it("a fake cup catches slow balls and costs a stroke", () => {
    const shot = roll(FLAT, RIGHT, 2, { traps: [trap("fakeCup", 4)] });
    expect(shot.end).to.deep.equal({ x: 4.5, y: 3.5 });
    expect(shot.penalty).to.equal(1);
    expect(shot.holed).to.equal(false);
  });

  it("sand slows the ball down", () => {
    const plain = roll(FLAT, RIGHT, 3);
    const sandy = roll(FLAT, RIGHT, 3, { traps: [trap("sand", 3)] });
    expect(sandy.end.x).to.be.lessThan(plain.end.x);
  });

  it("a teleporter moves the ball somewhere else", () => {
    const shot = roll(FLAT, RIGHT, 2, { traps: [trap("teleporter", 3)], random: fixed(0) });
    expect(shot.path.some((p) => p.jump)).to.equal(true);
  });

  it("a moving wall blocks the ball and slides after each shot", () => {
    const wall = trap("movingWall", 4, { dir: 1 });
    const shot = roll(FLAT, RIGHT, 3, { traps: [wall] });
    expect(shot.bounces).to.equal(1);
    moveWalls(FLAT, [wall]);
    expect(wall.col).to.equal(5);
  });

  it("offers 3 different traps", () => {
    const offer = offerTraps();
    expect(new Set(offer).size).to.equal(3);
  });

  it("won't put traps on the tee, the cup, next to the cup, or on walls", () => {
    expect(placementProblem(FLAT, [], 2, 3)).to.match(/tee/);
    expect(placementProblem(FLAT, [], 10, 3)).to.match(/cup/);
    expect(placementProblem(FLAT, [], 9, 2)).to.match(/cup/);
    expect(placementProblem(FLAT, [], 0, 0)).to.match(/wall/);
    expect(placementProblem(FLAT, [trap("goo", 5)], 5, 3)).to.match(/already/);
    expect(placementProblem(FLAT, [], 5, 3)).to.equal(null);
  });
});

describe("minigolf chaos cards", () => {
  it("Ghost ball goes through a wall", () => {
    const course = parseHole({ name: "Wall", map: FLAT_MAP_WITH_CUP_AT("#.T..#....O#") });
    const normal = roll(course, RIGHT, 3);
    const ghost = roll(course, RIGHT, 3, { effects: { ghost: true } });
    expect(normal.end.x).to.be.lessThan(5);
    expect(ghost.end.x).to.be.greaterThan(6);
  });

  it("Mirror flips the aim", () => {
    const shot = roll(FLAT, RIGHT, 1, { effects: { mirror: true } });
    expect(shot.end.x).to.be.lessThan(FLAT.tee.x);
  });

  it("Ice rink and Super putt make the ball roll further", () => {
    const plain = roll(FLAT, DOWN, 1);
    expect(roll(FLAT, DOWN, 1, { effects: { ice: true } }).end.y).to.be.greaterThan(plain.end.y);
    expect(roll(FLAT, DOWN, 1, { effects: { superPutt: true } }).end.y).to.be.greaterThan(plain.end.y);
  });

  it("Tiny cup only counts if the ball stops on the cup", () => {
    expect(roll(FLAT, RIGHT, 5, { effects: { cup: "tiny" } }).holed).to.equal(false);
  });

  it("Magnet cup pulls in a ball that stops nearby", () => {
    const shot = simulateShot({ course: FLAT, start: { x: 8.5, y: 3.5 }, direction: RIGHT, power: 1, effects: { cup: "magnet" } });
    expect(shot.holed).to.equal(true);
  });

  it("Swap trades ball spots", () => {
    const game = twoPlayerGame("chaos");
    const [abhi, sam] = game.players;
    sam.ball = { x: 6.5, y: 6.5 };
    abhi.hand = ["swap"];
    const played = playCard(game, abhi, 0, sam);
    expect(played.error).to.equal(undefined);
    expect(abhi.ball).to.deep.equal({ x: 6.5, y: 6.5 });
    expect(abhi.hand).to.have.length(0);
  });

  it("Mulligan undoes the last shot", () => {
    const game = twoPlayerGame("chaos");
    const abhi = currentPlayer(game);
    shoot(game, 0, 2);
    skipTurn(game); // Sam
    abhi.hand = ["mulligan"];
    playCard(game, abhi, 0);
    expect(abhi.ball).to.deep.equal(game.course.tee);
    expect(abhi.strokes[0]).to.equal(0);
  });

  it("only one card per hole, and someone-cards need another player", () => {
    const game = twoPlayerGame("chaos");
    const abhi = game.players[0];
    abhi.hand = ["mirror", "wind"];
    expect(playCard(game, abhi, 0, abhi).error).to.match(/another player/);
    expect(playCard(game, abhi, 1).text).to.match(/Wind gust/);
    expect(playCard(game, abhi, 0, game.players[1]).error).to.match(/already/);
  });

  it("Shuffle passes every hand along", () => {
    const game = twoPlayerGame("chaos");
    const [abhi, sam] = game.players;
    abhi.hand = ["shuffle", "ghost"];
    sam.hand = ["ice"];
    playCard(game, abhi, 0);
    expect(abhi.hand).to.deep.equal(["ice"]);
    expect(sam.hand).to.deep.equal(["ghost"]);
  });

  it("deals 3 cards to everyone", () => {
    const game = twoPlayerGame("chaos");
    game.players.forEach((p) => expect(p.hand).to.have.length(3));
    Object.values(CARDS).forEach((card) => expect(["you", "someone", "everyone"]).to.include(card.who));
  });
});

describe("minigolf game", () => {
  it("lets up to 8 players join, once each", () => {
    const game = createGame({ hostId: "p0" });
    for (let i = 0; i < 8; i++) expect(addPlayer(game, `p${i}`, `P${i}`)).to.equal(null);
    expect(addPlayer(game, "p0", "P0")).to.match(/full|already/);
    expect(addPlayer(game, "p9", "P9")).to.match(/full/);
    expect(game.holeCount).to.equal(6);
  });

  it("Sabotage: everyone places a trap, worst score first, then shooting starts", () => {
    const game = twoPlayerGame("sabotage");
    expect(game.phase).to.equal("traps");
    const first = currentPlacer(game);
    const kind = game.placing.offers.get(first.id)[0];
    expect(placeTrap(game, game.players[1], kind, 5, 5)).to.match(/not your turn/);
    expect(placeTrap(game, first, kind, 5, 5)).to.equal(null);
    skipPlacer(game); // the host skips the second player: they get a random trap
    expect(game.traps).to.have.length(2);
    expect(game.phase).to.equal("playing");
  });

  it("takes turns and ends the hole when everyone is done", () => {
    const game = twoPlayerGame("chaos");
    const first = currentPlayer(game);
    shoot(game, 4, 1);
    expect(currentPlayer(game)).to.not.equal(first);
    skipTurn(game);
    const { holeOver } = skipTurn(game);
    expect(holeOver).to.equal(true);
  });

  it("caps a hole at the most strokes", () => {
    const game = twoPlayerGame("chaos");
    const player = currentPlayer(game);
    for (let i = 0; i < MAX_STROKES; i++) {
      if (currentPlayer(game) !== player) skipTurn(game);
      if (player.done) break;
      shoot(game, 0, 1); // tap into the wall, never reaching the cup
    }
    expect(player.strokes[0]).to.equal(MAX_STROKES);
    expect(player.done).to.equal(true);
  });

  it("worst score goes first on the next hole, and lowest total wins", () => {
    const game = twoPlayerGame("chaos");
    const [abhi, sam] = game.players;
    abhi.strokes = [2];
    sam.strokes = [5];
    startHole(game);
    expect(game.order[0]).to.equal(sam);
    abhi.strokes = [2, 3];
    sam.strokes = [5, 4];
    expect(total(sam)).to.equal(9);
    expect(winners(game)).to.deep.equal([abhi]);
  });

  it("ends after the last hole", () => {
    const game = twoPlayerGame("chaos");
    expect(startHole(game)).to.equal(true);
    expect(startHole(game)).to.equal(true);
    expect(startHole(game)).to.equal(false);
    expect(game.phase).to.equal("over");
  });
});

describe("minigolf pictures", () => {
  it("draws a PNG of the course", () => {
    const course = parseHole(HOLES[0]);
    const png = drawCourse(course, [{ kind: "goo", col: 4, row: 4 }], { balls: [{ ...course.tee, rgb: [255, 0, 0] }] });
    expect(png.subarray(1, 4).toString()).to.equal("PNG");
    expect(png.readUInt32BE(16)).to.equal(IMAGE_WIDTH);
    expect(png.readUInt32BE(20)).to.equal(IMAGE_HEIGHT);
  });
});

// The flat test hole with a different middle row (row 4).
function FLAT_MAP_WITH_CUP_AT(row) {
  return ["############", "#..........#", "#..........#", row, "#..........#", "#..........#", "#..........#", "############"];
}
