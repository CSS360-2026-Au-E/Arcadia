/*
  MINIGOLF COURSES

  Every hole is a little text map, 12 squares wide and 8 tall.
  To add a hole, copy one below and change the letters:

    .  grass
    #  wall
    T  tee (where every ball starts)
    O  cup
    ~  water (ball goes back to where it was shot from, +1 stroke)
    >  slope pushing right   <  slope pushing left
    ^  slope pushing up      v  slope pushing down

  Squares are named like a chessboard: columns A to L left to right,
  rows 1 to 8 top to bottom. So the top left square is A1.
*/

export const WIDTH = 12;
export const HEIGHT = 8;

export const HOLES = [
  {
    name: "Warm-up",
    map: [
      "############",
      "#..........#",
      "#..........#",
      "#.T......O.#",
      "#..........#",
      "#..........#",
      "#..........#",
      "############",
    ],
  },
  {
    name: "The Bend",
    map: [
      "############",
      "#.T....#####",
      "#......#####",
      "#......#####",
      "#..........#",
      "#..........#",
      "#.......O..#",
      "############",
    ],
  },
  {
    name: "Downhill",
    map: [
      "############",
      "#....vvv...#",
      "#.T..vvv..O#",
      "#....vvv...#",
      "#..........#",
      "#..........#",
      "#..........#",
      "############",
    ],
  },
  {
    name: "The Pond",
    map: [
      "############",
      "#.T........#",
      "#...~~~~...#",
      "#...~~~~...#",
      "#...~~~~...#",
      "#...~~~~...#",
      "#........O.#",
      "############",
    ],
  },
  {
    name: "Zigzag",
    map: [
      "############",
      "#T...#.....#",
      "#....#..#..#",
      "#....#..#..#",
      "#.......#..#",
      "#.......#.O#",
      "#....#..#..#",
      "############",
    ],
  },
  {
    name: "Island",
    map: [
      "############",
      "#.T.....~~~#",
      "#.......~O~#",
      "#..>>>>>~.~#",
      "#.......~..#",
      "#..........#",
      "#..........#",
      "############",
    ],
  },
  {
    name: "Pinball",
    map: [
      "############",
      "#T.........#",
      "#..#....#..#",
      "#.....#....#",
      "#..#....#..#",
      "#.....#....#",
      "#........O.#",
      "############",
    ],
  },
  {
    name: "Side Hill",
    map: [
      "############",
      "#.T........#",
      "#..........#",
      "#<<<<<<<<<<#",
      "#<<<<<<<<<<#",
      "#..........#",
      "#.........O#",
      "############",
    ],
  },
  {
    name: "The Final",
    map: [
      "############",
      "#T..#......#",
      "#...#.~~~..#",
      "#...#.~O~..#",
      "#...>>>.v..#",
      "#.......v..#",
      "#..#####...#",
      "############",
    ],
  },
];

// Which way each slope letter pushes the ball.
export const SLOPES = {
  ">": { x: 1, y: 0 },
  "<": { x: -1, y: 0 },
  "^": { x: 0, y: -1 },
  v: { x: 0, y: 1 },
};

/*
  Turn a text map into something the game can use:
    {
      name, grid: ["#", ".", ...] by row,
      tee: { x, y }, cup: { x, y }   // the middle of those squares
    }
*/
export function parseHole(hole) {
  if (hole.map.length !== HEIGHT) throw new Error(`${hole.name}: needs ${HEIGHT} rows`);

  let tee = null;
  let cup = null;
  const grid = hole.map.map((row, y) => {
    if (row.length !== WIDTH) throw new Error(`${hole.name}: row ${y + 1} needs ${WIDTH} squares`);
    return row.split("").map((square, x) => {
      if (square === "T") tee = { x: x + 0.5, y: y + 0.5 };
      if (square === "O") cup = { x: x + 0.5, y: y + 0.5 };
      return square;
    });
  });

  if (!tee || !cup) throw new Error(`${hole.name}: needs a T and an O`);
  return { name: hole.name, grid, tee, cup };
}

// What's on the square at (x, y). Anything off the map counts as wall.
export function squareAt(course, x, y) {
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) return "#";
  return course.grid[row][col];
}

// "C4" for column 2, row 3 (both counted from 0).
export function squareName(col, row) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

// The other way: "C4" -> { col: 2, row: 3 }, or null if it's not a real square.
export function parseSquare(text) {
  const match = /^([A-La-l])([1-8])$/.exec(text.trim());
  if (!match) return null;
  return { col: match[1].toUpperCase().charCodeAt(0) - 65, row: Number(match[2]) - 1 };
}
