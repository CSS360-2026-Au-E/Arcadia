/*
  MINIGOLF PICTURES

  Draws the course as a PNG so the bot can post it after every shot:
  grass, walls, water, slopes, the cup, traps, every ball, and a dotted
  line for the last shot.

  It draws pixel by pixel into a plain buffer and saves it as a PNG with
  Node's built-in zlib, so it needs no extra packages (and nothing to
  install in Codespaces).
*/
import zlib from "zlib";
import { HEIGHT, SLOPES, WIDTH } from "./minigolfCourses";
import { directionVector } from "./minigolfPhysics";

export const SQUARE = 48; // pixels per square
const MARGIN = 24; // room around the course for the A-L / 1-8 labels
export const IMAGE_WIDTH = WIDTH * SQUARE + MARGIN * 2;
export const IMAGE_HEIGHT = HEIGHT * SQUARE + MARGIN * 2;

const COLORS = {
  background: [24, 48, 30],
  grassLight: [96, 178, 78],
  grassDark: [86, 166, 70],
  wall: [120, 96, 74],
  wallTop: [150, 124, 98],
  water: [58, 134, 214],
  ripple: [120, 180, 240],
  slope: [70, 140, 58],
  tee: [190, 230, 170],
  cup: [20, 20, 20],
  flag: [230, 57, 70],
  pole: [240, 240, 240],
  label: [220, 235, 215],
  banana: [255, 214, 10],
  fan: [210, 225, 235],
  goo: [140, 220, 60],
  bumper: [230, 57, 70],
  movingWall: [251, 133, 0],
  teleporter: [155, 93, 229],
  sand: [222, 196, 140],
  sandDot: [190, 160, 100],
};

/*
  Draw the game's current hole.
    options.path:      the last shot's points, from simulateShot
    options.pathColor: [r, g, b] for that dotted line
    options.balls:     [{ x, y, rgb }] balls to draw
    options.showTraps: false to hide traps (while players are still placing them)
*/
export function drawCourse(course, traps = [], options = {}) {
  const image = new Picture(IMAGE_WIDTH, IMAGE_HEIGHT, COLORS.background);

  // The squares.
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const square = course.grid[row][col];
      const left = MARGIN + col * SQUARE;
      const top = MARGIN + row * SQUARE;
      const grass = (row + col) % 2 === 0 ? COLORS.grassLight : COLORS.grassDark;

      if (square === "#") {
        image.rect(left, top, SQUARE, SQUARE, COLORS.wall);
        image.rect(left, top, SQUARE, 8, COLORS.wallTop);
      } else if (square === "~") {
        image.rect(left, top, SQUARE, SQUARE, COLORS.water);
        for (const dy of [14, 30]) image.line(left + 8, top + dy, left + 24, top + dy, 2, COLORS.ripple);
        image.line(left + 26, top + 22, left + 40, top + 22, 2, COLORS.ripple);
      } else {
        image.rect(left, top, SQUARE, SQUARE, grass);
        if (square === "T") image.rect(left + 8, top + 8, SQUARE - 16, SQUARE - 16, COLORS.tee);
        if (SLOPES[square]) drawSlope(image, left, top, SLOPES[square]);
      }
    }
  }

  // The cup and its flag.
  const cup = toPixels(course.cup);
  image.circle(cup.x, cup.y, 10, COLORS.cup);
  image.line(cup.x + 6, cup.y - 2, cup.x + 6, cup.y - 30, 2, COLORS.pole);
  image.triangle([cup.x + 7, cup.y - 30], [cup.x + 22, cup.y - 25], [cup.x + 7, cup.y - 20], COLORS.flag);

  if (options.showTraps !== false) for (const trap of traps) drawTrap(image, trap);

  // The last shot, as a dotted line.
  if (options.path) {
    for (const point of options.path) {
      const p = toPixels(point);
      image.circle(p.x, p.y, 2.5, options.pathColor || [255, 255, 255]);
    }
  }

  // The balls. Balls sitting on the same spot get nudged apart so you can see them all.
  const balls = options.balls || [];
  balls.forEach((ball, i) => {
    const p = toPixels(ball);
    const twins = balls.filter((b, j) => j < i && Math.hypot(b.x - ball.x, b.y - ball.y) < 0.3).length;
    const angle = (twins * Math.PI * 2) / 6;
    const x = p.x + (twins ? Math.cos(angle) * 12 : 0);
    const y = p.y + (twins ? Math.sin(angle) * 12 : 0);
    image.circle(x, y, 10, [20, 20, 20]);
    image.circle(x, y, 8, ball.rgb);
  });

  // Square names around the edge, like a chessboard.
  for (let col = 0; col < WIDTH; col++) {
    const letter = String.fromCharCode(65 + col);
    image.text(letter, MARGIN + col * SQUARE + SQUARE / 2 - 5, 5, COLORS.label);
    image.text(letter, MARGIN + col * SQUARE + SQUARE / 2 - 5, IMAGE_HEIGHT - MARGIN + 5, COLORS.label);
  }
  for (let row = 0; row < HEIGHT; row++) {
    const number = String(row + 1);
    image.text(number, 7, MARGIN + row * SQUARE + SQUARE / 2 - 7, COLORS.label);
    image.text(number, IMAGE_WIDTH - MARGIN + 7, MARGIN + row * SQUARE + SQUARE / 2 - 7, COLORS.label);
  }

  return image.toPng();
}

// The middle of a spot on the course, in pixels.
function toPixels(point) {
  return { x: MARGIN + point.x * SQUARE, y: MARGIN + point.y * SQUARE };
}

// Two arrows pointing the way the slope pushes.
function drawSlope(image, left, top, way) {
  const cx = left + SQUARE / 2;
  const cy = top + SQUARE / 2;
  for (const shift of [-8, 8]) {
    const tipX = cx + way.x * (shift + 6);
    const tipY = cy + way.y * (shift + 6);
    // The two arms of a ">" shape, turned to face `way`.
    const sideX = -way.y;
    const sideY = way.x;
    const backX = tipX - way.x * 7;
    const backY = tipY - way.y * 7;
    image.line(tipX, tipY, backX + sideX * 7, backY + sideY * 7, 3, COLORS.slope);
    image.line(tipX, tipY, backX - sideX * 7, backY - sideY * 7, 3, COLORS.slope);
  }
}

function drawTrap(image, trap) {
  const left = MARGIN + trap.col * SQUARE;
  const top = MARGIN + trap.row * SQUARE;
  const cx = left + SQUARE / 2;
  const cy = top + SQUARE / 2;

  if (trap.kind === "banana") {
    // A yellow crescent: a yellow circle with a grass-colored bite.
    image.circle(cx, cy, 13, COLORS.banana);
    image.circle(cx + 7, cy - 7, 11, (trap.row + trap.col) % 2 === 0 ? COLORS.grassLight : COLORS.grassDark);
  } else if (trap.kind === "fan") {
    image.circle(cx, cy, 15, COLORS.fan);
    const way = directionVector(trap.dir);
    image.line(cx - way.x * 10, cy - way.y * 10, cx + way.x * 10, cy + way.y * 10, 3, [60, 60, 60]);
    image.circle(cx + way.x * 10, cy + way.y * 10, 4, [60, 60, 60]);
  } else if (trap.kind === "goo") {
    image.circle(cx, cy + 2, 14, COLORS.goo);
    image.circle(cx - 8, cy - 8, 6, COLORS.goo);
    image.circle(cx + 9, cy - 6, 5, COLORS.goo);
  } else if (trap.kind === "bumper") {
    image.circle(cx, cy, 16, COLORS.bumper);
    image.circle(cx, cy, 9, [255, 255, 255]);
    image.circle(cx, cy, 5, COLORS.bumper);
  } else if (trap.kind === "movingWall") {
    image.rect(left + 2, top + 2, SQUARE - 4, SQUARE - 4, COLORS.movingWall);
    for (let i = 0; i < 4; i++) image.line(left + 4 + i * 12, top + 44, left + 14 + i * 12, top + 4, 3, [120, 60, 0]);
  } else if (trap.kind === "fakeCup") {
    image.circle(cx, cy, 10, COLORS.cup); // looks just like the real cup, but no flag
  } else if (trap.kind === "teleporter") {
    image.circle(cx, cy, 16, COLORS.teleporter);
    image.circle(cx, cy, 11, [40, 20, 70]);
    image.circle(cx, cy, 5, COLORS.teleporter);
  } else if (trap.kind === "sand") {
    image.rect(left + 2, top + 2, SQUARE - 4, SQUARE - 4, COLORS.sand);
    for (let i = 0; i < 9; i++) image.circle(left + 10 + (i % 3) * 14, top + 10 + Math.floor(i / 3) * 14, 2, COLORS.sandDot);
  }
}

/*
  A tiny picture we can draw on: rectangles, circles, lines,
  triangles and a few letters, then save as a PNG.
*/
class Picture {
  constructor(width, height, color) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.rect(0, 0, width, height, color);
  }

  // Set one pixel. `amount` 0 to 1 blends it with what's there (for soft edges).
  dot(x, y, color, amount = 1) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 3;
    for (let c = 0; c < 3; c++) {
      this.pixels[i + c] = Math.round(this.pixels[i + c] * (1 - amount) + color[c] * amount);
    }
  }

  rect(left, top, width, height, color) {
    for (let y = Math.round(top); y < top + height; y++) {
      for (let x = Math.round(left); x < left + width; x++) this.dot(x, y, color);
    }
  }

  circle(cx, cy, radius, color) {
    for (let y = Math.floor(cy - radius - 1); y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius - 1); x <= cx + radius + 1; x++) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const amount = Math.min(1, Math.max(0, radius + 0.5 - distance));
        if (amount > 0) this.dot(x, y, color, amount);
      }
    }
  }

  // A thick line, drawn as a row of small circles.
  line(x1, y1, x2, y2, thickness, color) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= steps; i++) {
      this.circle(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps, thickness / 2, color);
    }
  }

  triangle(a, b, c, color) {
    const area = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const total = area(a, b, c);
    for (let y = Math.floor(Math.min(a[1], b[1], c[1])); y <= Math.max(a[1], b[1], c[1]); y++) {
      for (let x = Math.floor(Math.min(a[0], b[0], c[0])); x <= Math.max(a[0], b[0], c[0]); x++) {
        const p = [x + 0.5, y + 0.5];
        const w1 = area(b, c, p) / total;
        const w2 = area(c, a, p) / total;
        const w3 = area(a, b, p) / total;
        if (w1 >= 0 && w2 >= 0 && w3 >= 0) this.dot(x, y, color);
      }
    }
  }

  // Letters A-L and numbers 1-9, each 5 pixels wide and 7 tall, drawn twice as big.
  text(text, left, top, color) {
    let x = left;
    for (const char of text) {
      const rows = FONT[char] || [];
      rows.forEach((bits, row) => {
        for (let col = 0; col < 5; col++) {
          if (bits[col] === "1") this.rect(x + col * 2, top + row * 2, 2, 2, color);
        }
      });
      x += 12;
    }
  }

  // Save as a PNG file (as a Buffer Discord can send).
  toPng() {
    const rows = Buffer.alloc((this.width * 3 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const start = y * (this.width * 3 + 1);
      rows[start] = 0; // no filter on this row
      this.pixels.copy(rows, start + 1, y * this.width * 3, (y + 1) * this.width * 3);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header[8] = 8; // 8 bits per color
    header[9] = 2; // red, green, blue
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // every PNG starts with these bytes
      pngChunk("IHDR", header),
      pngChunk("IDAT", zlib.deflateSync(rows)),
      pngChunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// The checksum every PNG chunk ends with.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// A 5 by 7 pixel font for the square labels.
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
