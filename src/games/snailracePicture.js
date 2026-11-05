/*
  SNAIL RACE PICTURE

  Draws the race as a PNG picture so the bot can show it in Discord:
  grassy lanes, a checkered finish line, a cartoon snail in each lane with
  a slime trail behind it, speed lines when a snail zooms, and a gold
  crown on the winner.

  Like the minigolf picture, it colors pixels one by one into a plain
  list of numbers, then saves that as a PNG with Node's built-in zlib.
  That means there's nothing extra to install.

  How pixel pictures work: a picture is a grid of dots. Each dot has a
  color made of three numbers from 0 to 255: [red, green, blue].
  [255, 0, 0] is pure red, [0, 0, 0] is black, [255, 255, 255] is white.
  x counts dots from the left edge, y counts dots down from the top edge.
*/
import zlib from "zlib";
import { SNAILS, TRACK_LENGTH } from "./snailrace";

// ---------------------------------------------------------------------------
// SIZES AND COLORS
// ---------------------------------------------------------------------------

export const IMAGE_WIDTH = 800;
const TOP_BAR = 56;      // the dark strip at the top with the title
const LANE_HEIGHT = 84;  // how tall each lane is
export const IMAGE_HEIGHT = TOP_BAR + LANE_HEIGHT * SNAILS.length;

// Where the start and finish lines are, measured from the left edge.
const START_X = 120;
const FINISH_X = 720;

// The color of each snail's shell, matching the lane emoji in snailrace.js.
const SHELL_COLORS = [
  [230, 57, 70],   // red
  [46, 196, 102],  // green
  [58, 134, 255],  // blue
  [255, 200, 30],  // yellow
];

const COLORS = {
  topBar: [28, 22, 48],
  title: [255, 255, 255],
  grassLight: [104, 186, 84],
  grassDark: [92, 172, 74],
  laneLine: [235, 245, 225],
  startLine: [255, 255, 255],
  slime: [190, 240, 255],
  body: [214, 236, 160],
  bodyEdge: [150, 180, 100],
  eyeWhite: [255, 255, 255],
  pupil: [20, 20, 20],
  shellDark: [60, 30, 30],
  crown: [255, 210, 40],
  crownJewel: [230, 57, 70],
  speed: [255, 255, 255],
  name: [255, 255, 255],
  nameShadow: [30, 60, 30],
};

// ---------------------------------------------------------------------------
// DRAWING THE RACE
// ---------------------------------------------------------------------------

/*
  Draw the race as it is right now and give back the PNG.
    game.positions:  how far each snail is (from snailrace.js)
    game.lastSteps:  how far each snail moved on the last step (for speed lines)
    winner:          the winning snail's number, or null while still racing
*/
export function drawRace(game, winner = null) {
  const picture = new Picture(IMAGE_WIDTH, IMAGE_HEIGHT, COLORS.topBar);

  // The title at the top. Once there's a winner, it says who won.
  const title = winner === null ? "SNAIL RACE" : `${SNAILS[winner].name.toUpperCase()} WINS`;
  picture.text(title, 24, 14, COLORS.title, 4);

  SNAILS.forEach((snail, i) => {
    const top = TOP_BAR + i * LANE_HEIGHT;
    drawLane(picture, top, i);
    picture.text(snail.name.toUpperCase(), START_X + 12, top + 8, COLORS.nameShadow, 2);
    picture.text(snail.name.toUpperCase(), START_X + 10, top + 6, COLORS.name, 2);

    // Turn "how many steps along the track" into "how many dots from the left".
    const x = START_X + (game.positions[i] / TRACK_LENGTH) * (FINISH_X - START_X);
    const y = top + LANE_HEIGHT / 2 + 10;

    // The slime trail, from the start line to the snail.
    picture.rect(START_X, y + 12, x - START_X, 6, COLORS.slime, 0.6);

    // Speed lines if this snail zoomed 2 steps on the last turn.
    const steps = game.lastSteps ? game.lastSteps[i] : 0;
    if (steps === 2) {
      for (const dy of [-14, -2, 10]) picture.line(x - 70, y + dy, x - 40, y + dy, 3, COLORS.speed);
    }

    drawSnail(picture, x, y, SHELL_COLORS[i]);
    if (winner === i) drawCrown(picture, x + 2, y - 44);
  });

  return picture.toPng();
}

// One lane: striped grass, a white line under it, a lane number, the
// start line and the checkered finish line.
function drawLane(picture, top, i) {
  // Stripes of light and dark grass, like a mowed field.
  for (let x = 0; x < IMAGE_WIDTH; x += 40) {
    const grass = (x / 40 + i) % 2 === 0 ? COLORS.grassLight : COLORS.grassDark;
    picture.rect(x, top, 40, LANE_HEIGHT, grass);
  }
  picture.rect(0, top + LANE_HEIGHT - 3, IMAGE_WIDTH, 3, COLORS.laneLine);

  // The lane number in a circle the color of that snail's shell.
  picture.circle(48, top + LANE_HEIGHT / 2, 26, [255, 255, 255]);
  picture.circle(48, top + LANE_HEIGHT / 2, 22, SHELL_COLORS[i]);
  picture.text(String(i + 1), 42, top + LANE_HEIGHT / 2 - 10, [255, 255, 255], 3);

  // The start line.
  picture.rect(START_X - 4, top, 4, LANE_HEIGHT - 3, COLORS.startLine);

  // The checkered finish line: little squares that swap black and white.
  const square = 12;
  for (let row = 0; row * square < LANE_HEIGHT - 3; row++) {
    for (let col = 0; col < 3; col++) {
      const color = (row + col) % 2 === 0 ? [255, 255, 255] : [20, 20, 20];
      const height = Math.min(square, LANE_HEIGHT - 3 - row * square);
      picture.rect(FINISH_X + 20 + col * square, top + row * square, square, height, color);
    }
  }
}

// A cartoon snail facing right. (x, y) is the middle of its body.
function drawSnail(picture, x, y, shellColor) {
  // The body: a long blob made of overlapping circles, with a darker edge.
  for (let dx = -30; dx <= 26; dx += 4) picture.circle(x + dx, y + 8, 10, COLORS.bodyEdge);
  for (let dx = -30; dx <= 26; dx += 4) picture.circle(x + dx, y + 8, 8, COLORS.body);
  picture.circle(x + 28, y, 11, COLORS.bodyEdge); // head
  picture.circle(x + 28, y, 9, COLORS.body);

  // Two eye stalks with eyeballs on top.
  for (const lean of [0, 10]) {
    picture.line(x + 26, y - 4, x + 26 + lean, y - 26, 4, COLORS.body);
    picture.circle(x + 26 + lean, y - 28, 6, COLORS.eyeWhite);
    picture.circle(x + 28 + lean, y - 28, 3, COLORS.pupil);
  }

  // A happy little smile.
  picture.line(x + 30, y + 4, x + 35, y + 3, 2, COLORS.pupil);

  // The shell: rings of dark and color, smaller each time, to look like a spiral.
  picture.circle(x - 6, y - 10, 24, COLORS.shellDark);
  const rings = [
    [21, shellColor, 0],
    [16, COLORS.shellDark, 2],
    [13, shellColor, 3],
    [8, COLORS.shellDark, 4],
    [5, shellColor, 5],
  ];
  // Each ring is nudged a little to the right, which makes it swirl.
  for (const [radius, color, nudge] of rings) picture.circle(x - 6 + nudge, y - 10, radius, color);

  // A white shine spot so the shell looks round and glossy.
  picture.circle(x - 16, y - 20, 4, [255, 255, 255], 0.7);
}

// A gold crown for the winner. (x, y) is the middle of its bottom edge.
function drawCrown(picture, x, y) {
  picture.rect(x - 20, y - 8, 40, 10, COLORS.crown);
  picture.triangle([x - 20, y - 8], [x - 20, y - 26], [x - 6, y - 8], COLORS.crown);
  picture.triangle([x - 10, y - 8], [x, y - 30], [x + 10, y - 8], COLORS.crown);
  picture.triangle([x + 6, y - 8], [x + 20, y - 26], [x + 20, y - 8], COLORS.crown);
  picture.circle(x, y - 3, 3, COLORS.crownJewel);
}

// ---------------------------------------------------------------------------
// THE PICTURE TOOL
// A tiny picture we can draw shapes and capital letters on, then save as a PNG.
// You don't need to change anything below to change how the race looks.
// ---------------------------------------------------------------------------

class Picture {
  constructor(width, height, color) {
    this.width = width;
    this.height = height;
    // 3 numbers (red, green, blue) for every dot in the picture.
    this.pixels = Buffer.alloc(width * height * 3);
    this.rect(0, 0, width, height, color);
  }

  // Color one dot. "amount" from 0 to 1 mixes the new color with the old
  // one, which makes see-through shapes and smooth edges.
  dot(x, y, color, amount = 1) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 3;
    for (let c = 0; c < 3; c++) {
      this.pixels[i + c] = Math.round(this.pixels[i + c] * (1 - amount) + color[c] * amount);
    }
  }

  rect(left, top, width, height, color, amount = 1) {
    for (let y = Math.round(top); y < top + height; y++) {
      for (let x = Math.round(left); x < left + width; x++) this.dot(x, y, color, amount);
    }
  }

  circle(cx, cy, radius, color, amount = 1) {
    for (let y = Math.floor(cy - radius - 1); y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius - 1); x <= cx + radius + 1; x++) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        // Dots right on the edge get mixed in a little, so circles look smooth.
        const edge = Math.min(1, Math.max(0, radius + 0.5 - distance));
        if (edge > 0) this.dot(x, y, color, edge * amount);
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
        const inside = [area(b, c, p), area(c, a, p), area(a, b, p)].every((w) => w / total >= 0);
        if (inside) this.dot(x, y, color);
      }
    }
  }

  // Write capital letters, numbers and spaces. Each letter is 5 dots wide
  // and 7 tall, made "size" times bigger.
  text(text, left, top, color, size = 2) {
    let x = left;
    for (const char of text) {
      const rows = FONT[char] || [];
      rows.forEach((bits, row) => {
        for (let col = 0; col < 5; col++) {
          if (bits[col] === "1") this.rect(x + col * size, top + row * size, size, size, color);
        }
      });
      x += 6 * size; // 5 dots for the letter plus 1 dot of space
    }
  }

  // Save as a PNG (as a Buffer, which is what Discord needs to send a file).
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

// A PNG file is made of "chunks": a length, a name, the data, and a checksum.
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

// A 5 by 7 dot font. Each string is one row of the letter; "1" means color this dot.
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
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};
