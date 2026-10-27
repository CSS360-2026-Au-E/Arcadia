/*
  MINIGOLF PHYSICS

  Moves the ball for one shot, a tiny step at a time, and reports what
  happened. No Discord code. Tested in tests/minigolf.spec.js.

  The rules are simple on purpose, so players can learn to aim:
  - The ball slows down by the same amount every moment (friction),
    so power 1 to 5 always rolls the same distance on flat grass.
  - Walls bounce the ball like a mirror and take a little speed off.
  - Slopes push the ball while it rolls over them.
  - The ball drops in if it rolls over the cup slowly enough.
    Too fast and it skips right over.
  The same shot always ends up in the same place, unless it hits a
  random trap like the banana peel.
*/
import { SLOPES, squareAt } from "./minigolfCourses";

// How far the ball rolls on flat grass for power 1 to 5, in squares.
export const POWER_DISTANCE = [1.5, 3, 5, 8, 12];

// The 16 directions players can aim, clockwise from straight up.
export const DIRECTIONS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

const FRICTION = 4; // speed lost per second
const SLOPE_PUSH = 3; // weaker than friction, so a ball can stop on a slope
const WIND_PUSH = 1.5;
const BOUNCE = 0.8; // a wall keeps 80% of the speed
const STEP = 0.01; // seconds per step
const MAX_MOVE = 0.1; // never move more than this many squares in one step
const STOP_SPEED = 0.05;
export const CUP_SPEED = 5; // faster than this and the ball skips over the cup
export const CUP_RADIUS = { normal: 0.35, big: 0.6, magnet: 1.0 };
const SUPER_PUTT = 1.6; // Super putt card: rolls 60% further
const FAN_PUSH = 2; // a fan pushes the ball about 2 squares

// Which way a direction number points, as an x and y step.
// y goes down the screen, so "N" is y = -1.
export function directionVector(direction) {
  const angle = (direction * Math.PI) / 8;
  return { x: Math.sin(angle), y: -Math.cos(angle) };
}

// The starting speed that makes the ball roll `distance` squares.
function speedFor(distance, friction) {
  return Math.sqrt(2 * friction * distance);
}

/*
  Play one shot.

    shot = {
      course,             // from parseHole
      start: { x, y },    // where the ball is
      direction,          // 0 to 15, see DIRECTIONS
      power,              // 1 to 5
      traps: [],          // { kind, col, row, dir, owner } see minigolfTraps.js
      effects: {},        // cards in play, see below
      random,             // a function like Math.random (tests pass a fixed one)
    }

  effects can have: ghost (go through walls), superPutt, mirror (aim is
  flipped), ice (half friction), cup ("normal" | "big" | "tiny" | "magnet"),
  gravityFlip (slopes push the other way), wind (push east).

  Returns {
    path: [{ x, y }, ...],   // points along the way, for the picture
    end: { x, y },           // where the ball stopped
    holed,                   // true if it went in
    water,                   // true if it landed in water
    penalty,                 // extra strokes (water, fake cup)
    hits: [trap, ...],       // traps it ran into, in order
    bounces,                 // how many walls it bounced off
  }
*/
export function simulateShot(shot) {
  const { course, start, power, traps = [], effects = {}, random = Math.random } = shot;
  const direction = effects.mirror ? (shot.direction + 8) % 16 : shot.direction;
  const friction = effects.ice ? FRICTION / 2 : FRICTION;
  const distance = POWER_DISTANCE[power - 1] * (effects.superPutt ? SUPER_PUTT : 1);

  const aim = directionVector(direction);
  const speed = speedFor(distance, friction);
  let vx = aim.x * speed;
  let vy = aim.y * speed;
  let x = start.x;
  let y = start.y;

  const result = { path: [{ x, y }], holed: false, water: false, penalty: 0, hits: [], bounces: 0 };
  const cupSize = effects.cup || "normal";
  let square = squareKey(x, y);
  let lastPoint = { x, y };
  let lastSafe = { x, y }; // last spot that wasn't inside a wall (for ghost balls)

  const isWall = (px, py) => {
    const col = Math.floor(px);
    const row = Math.floor(py);
    if (squareAt(course, px, py) === "#" && (!effects.ghost || isEdge(col, row))) return true;
    return !effects.ghost && traps.some((t) => t.kind === "movingWall" && t.col === col && t.row === row);
  };

  for (let i = 0; i < 50000; i++) {
    const trapHere = trapAt(traps, x, y);

    // Slopes and wind push the ball.
    const slope = SLOPES[squareAt(course, x, y)];
    if (slope) {
      const flip = effects.gravityFlip ? -1 : 1;
      vx += slope.x * SLOPE_PUSH * flip * STEP;
      vy += slope.y * SLOPE_PUSH * flip * STEP;
    }
    if (effects.wind) vx += WIND_PUSH * STEP;

    // Friction slows it down. Sand slows it down a lot more.
    const drag = friction * (trapHere && trapHere.kind === "sand" ? 4 : 1);
    let speedNow = Math.hypot(vx, vy);
    const slower = Math.max(0, speedNow - drag * STEP);
    if (speedNow > 0) {
      vx = (vx / speedNow) * slower;
      vy = (vy / speedNow) * slower;
    }
    speedNow = slower;
    if (speedNow < STOP_SPEED) break;

    // Move in small pieces so the ball never jumps through a wall.
    const pieces = Math.ceil((speedNow * STEP) / MAX_MOVE);
    let stopped = false;
    for (let p = 0; p < pieces && !stopped; p++) {
      const nx = x + (vx * STEP) / pieces;
      const ny = y + (vy * STEP) / pieces;

      if (isWall(nx, ny)) {
        // Bounce: flip whichever way ran into the wall.
        const hitX = isWall(nx, y);
        const hitY = isWall(x, ny);
        if (hitX) vx = -vx;
        if (hitY) vy = -vy;
        if (!hitX && !hitY) {
          vx = -vx;
          vy = -vy;
        }
        vx *= BOUNCE;
        vy *= BOUNCE;
        result.bounces += 1;
        break;
      }

      x = nx;
      y = ny;
      if (squareAt(course, x, y) !== "#") lastSafe = { x, y };
      if (Math.hypot(x - lastPoint.x, y - lastPoint.y) >= 0.25) {
        lastPoint = { x, y };
        result.path.push(lastPoint);
      }

      // Into the cup?
      const speed = Math.hypot(vx, vy);
      const toCup = Math.hypot(x - course.cup.x, y - course.cup.y);
      if (cupSize !== "tiny" && toCup < CUP_RADIUS[cupSize] && speed < CUP_SPEED) {
        x = course.cup.x;
        y = course.cup.y;
        result.holed = true;
        stopped = true;
        break;
      }

      // Entering a new square: water and traps happen here.
      const key = squareKey(x, y);
      if (key === square) continue;
      square = key;

      if (squareAt(course, x, y) === "~") {
        result.water = true;
        result.penalty += 1;
        x = start.x;
        y = start.y;
        stopped = true;
        break;
      }

      const trap = trapAt(traps, x, y);
      if (!trap) continue;
      result.hits.push(trap);

      if (trap.kind === "banana") {
        // Spin off in a random direction at the same speed.
        const angle = random() * Math.PI * 2;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else if (trap.kind === "fan") {
        const push = speedFor(FAN_PUSH, friction);
        const way = directionVector(trap.dir);
        vx += way.x * push;
        vy += way.y * push;
      } else if (trap.kind === "goo") {
        stopped = true;
      } else if (trap.kind === "bumper") {
        vx = -vx * 1.5;
        vy = -vy * 1.5;
      } else if (trap.kind === "fakeCup" && speed < CUP_SPEED) {
        x = trap.col + 0.5;
        y = trap.row + 0.5;
        result.penalty += 1;
        stopped = true;
      } else if (trap.kind === "teleporter") {
        const spot = randomEmptySquare(course, traps, random);
        x = spot.x;
        y = spot.y;
        square = squareKey(x, y);
        result.path.push({ x, y, jump: true });
      }
      break; // speed changed, go back to the main loop
    }
    if (stopped) break;
  }

  // A ghost ball can't stop inside a wall: put it back where it last was.
  if (squareAt(course, x, y) === "#") {
    x = lastSafe.x;
    y = lastSafe.y;
  }

  // Tiny cup: the ball has to stop right on the cup's square.
  // Magnet cup: anything that stops close by gets pulled in.
  if (!result.holed && !result.water) {
    const onCupSquare = squareKey(x, y) === squareKey(course.cup.x, course.cup.y);
    const toCup = Math.hypot(x - course.cup.x, y - course.cup.y);
    if ((cupSize === "tiny" && onCupSquare) || (cupSize === "magnet" && toCup < 1.5)) {
      x = course.cup.x;
      y = course.cup.y;
      result.holed = true;
    }
  }

  result.end = { x, y };
  result.path.push({ x, y });
  return result;
}

// The best aim for a beginner: straight at the cup, just enough power.
export function suggestAim(course, ball) {
  const dx = course.cup.x - ball.x;
  const dy = course.cup.y - ball.y;
  const angle = Math.atan2(dx, -dy); // 0 = up, clockwise
  const direction = (Math.round(angle / (Math.PI / 8)) + 16) % 16;
  const distance = Math.hypot(dx, dy);
  const index = POWER_DISTANCE.findIndex((d) => d >= distance);
  return { direction, power: index === -1 ? 5 : index + 1 };
}

// A random grass square with nothing on it, as the middle of that square.
export function randomEmptySquare(course, traps, random = Math.random) {
  const spots = [];
  course.grid.forEach((row, r) =>
    row.forEach((square, c) => {
      if (square === "." && !traps.some((t) => t.col === c && t.row === r)) spots.push({ x: c + 0.5, y: r + 0.5 });
    })
  );
  return spots[Math.floor(random() * spots.length)];
}

function squareKey(x, y) {
  return `${Math.floor(x)},${Math.floor(y)}`;
}

function trapAt(traps, x, y) {
  const col = Math.floor(x);
  const row = Math.floor(y);
  return traps.find((t) => t.col === col && t.row === row && t.kind !== "movingWall");
}

// The outside ring of the map is always solid, even for ghost balls.
function isEdge(col, row) {
  return col <= 0 || row <= 0 || col >= 11 || row >= 7;
}
