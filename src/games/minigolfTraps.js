/*
  MINIGOLF TRAPS (Sabotage mode)

  Before each hole, every player secretly drops one trap on the course.
  What each trap does to the ball lives in minigolfPhysics.js; this file
  has the list of traps and the rules for where they can go.

  A trap on the course is a plain object:
    { kind: "banana", col: 4, row: 2, owner: "<player id>", dir: 4 }
  `dir` is only used by fans (which way they blow) and moving walls
  (+1 slides right, -1 slides left).
*/
import { HEIGHT, WIDTH } from "./minigolfCourses";

export const TRAPS = {
  banana: { name: "Banana peel", emoji: "🍌", text: "Ball spins off in a random direction" },
  fan: { name: "Fan", emoji: "🌬️", text: "Pushes the ball about 2 squares one way" },
  goo: { name: "Sticky goo", emoji: "🟢", text: "Ball stops dead on this square" },
  bumper: { name: "Bumper", emoji: "🔴", text: "Bounces the ball back hard" },
  movingWall: { name: "Moving wall", emoji: "🧱", text: "A wall that slides one square after every shot" },
  fakeCup: { name: "Fake cup", emoji: "🕳️", text: "Looks like the cup. Ball stops there, +1 stroke" },
  teleporter: { name: "Teleporter", emoji: "🟣", text: "Sends the ball to a random empty square" },
  sand: { name: "Sand pit", emoji: "🏖️", text: "Ball slows down a lot while crossing it" },
};

// Each player picks from 3 random traps.
export function offerTraps(random = Math.random) {
  const kinds = Object.keys(TRAPS);
  const offer = [];
  while (offer.length < 3) {
    const kind = kinds[Math.floor(random() * kinds.length)];
    if (!offer.includes(kind)) offer.push(kind);
  }
  return offer;
}

// Why a trap can't go on this square, or null if it can.
export function placementProblem(course, traps, col, row) {
  if (col < 0 || col >= WIDTH || row < 0 || row >= HEIGHT) return "That square isn't on the course.";
  const square = course.grid[row][col];
  if (square === "#") return "That square is a wall.";
  if (square === "~") return "That square is water.";
  if (square === "T") return "You can't put a trap on the tee.";
  const cupCol = Math.floor(course.cup.x);
  const cupRow = Math.floor(course.cup.y);
  if (Math.abs(col - cupCol) <= 1 && Math.abs(row - cupRow) <= 1) {
    return "Traps can't go on the cup or the squares right next to it.";
  }
  if (traps.some((t) => t.col === col && t.row === row)) return "Someone already put a trap there.";
  return null;
}

// Make the trap object, picking a random way for fans and moving walls.
export function makeTrap(kind, col, row, owner, random = Math.random) {
  const trap = { kind, col, row, owner };
  if (kind === "fan") trap.dir = [0, 4, 8, 12][Math.floor(random() * 4)]; // up, right, down, left
  if (kind === "movingWall") trap.dir = random() < 0.5 ? -1 : 1;
  return trap;
}

// A random legal trap, for when the host skips a player's turn to place.
export function randomTrap(course, traps, owner, random = Math.random) {
  const kinds = Object.keys(TRAPS);
  for (let tries = 0; tries < 500; tries++) {
    const col = Math.floor(random() * WIDTH);
    const row = Math.floor(random() * HEIGHT);
    if (!placementProblem(course, traps, col, row)) {
      return makeTrap(kinds[Math.floor(random() * kinds.length)], col, row, owner, random);
    }
  }
  return null;
}

// After every shot, moving walls slide one square, turning around
// when something is in the way.
export function moveWalls(course, traps, balls = []) {
  for (const trap of traps) {
    if (trap.kind !== "movingWall") continue;
    for (const dir of [trap.dir, -trap.dir]) {
      const col = trap.col + dir;
      const blocked =
        col < 0 ||
        col >= WIDTH ||
        course.grid[trap.row][col] !== "." ||
        traps.some((t) => t !== trap && t.col === col && t.row === trap.row) ||
        balls.some((b) => Math.floor(b.x) === col && Math.floor(b.y) === trap.row);
      if (!blocked) {
        trap.col = col;
        trap.dir = dir;
        break;
      }
    }
  }
}
