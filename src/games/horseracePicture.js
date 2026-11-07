/*
  HORSE RACE PICTURE

  Draws the race as a PNG picture so the bot can show it in Discord:
  a dirt racetrack with white rails, a horse and jockey in each lane,
  galloping legs that change pose every step, dust clouds when a horse
  puts on a burst of speed, a checkered finish post, and a gold rosette
  on the winner.

  Like the minigolf picture, it colors pixels one by one into a plain
  list of numbers, then saves that as a PNG with Node's built-in zlib.
  That means there's nothing extra to install.

  How pixel pictures work: a picture is a grid of dots. Each dot has a
  color made of three numbers from 0 to 255: [red, green, blue].
  [255, 0, 0] is pure red, [0, 0, 0] is black, [255, 255, 255] is white.
  x counts dots from the left edge, y counts dots down from the top edge.
*/
import zlib from "zlib";
import { HORSES, TRACK_LENGTH } from "./horserace";

// ---------------------------------------------------------------------------
// SIZES AND COLORS
// ---------------------------------------------------------------------------

export const IMAGE_WIDTH = 800;
const TOP_BAR = 56;      // the dark strip at the top with the title
const LANE_HEIGHT = 88;  // how tall each lane is
export const IMAGE_HEIGHT = TOP_BAR + LANE_HEIGHT * HORSES.length + 8;

// Where the start and finish lines are, measured from the left edge.
const START_X = 140;
const FINISH_X = 700;

// Each jockey's shirt color ("silks"), matching the button emoji in horserace.js.
const SILKS = [
  [230, 57, 70],   // red
  [58, 120, 255],  // blue
  [46, 180, 90],   // green
  [255, 200, 30],  // yellow
  [155, 89, 230],  // purple
];

// Each horse's coat color, so they don't all look the same.
const COATS = [
  [120, 72, 40],   // brown
  [45, 40, 45],    // black
  [170, 90, 45],   // chestnut
  [160, 160, 165], // grey
  [215, 175, 105], // golden
];

const COLORS = {
  topBar: [22, 30, 40],
  title: [255, 255, 255],
  dirtLight: [196, 150, 102],
  dirtDark: [184, 138, 92],
  rail: [250, 250, 250],
  grass: [80, 160, 70],
  hoof: [40, 30, 25],
  eye: [15, 15, 15],
  skin: [240, 200, 160],
  dust: [230, 210, 180],
  gold: [255, 205, 40],
  ribbon: [220, 50, 60],
  label: [255, 255, 255],
  labelShadow: [90, 60, 35],
};

// ---------------------------------------------------------------------------
// DRAWING THE RACE
// ---------------------------------------------------------------------------

/*
  Draw the race as it is right now and give back the PNG.
    game.positions:  how far each horse is (from horserace.js)
    game.lastSteps:  how far each horse ran on the last step (for dust clouds)
    frame:           which step this is; it flips the horses' legs each step
    winner:          the winning horse's number, or null while still racing
*/
export function drawRace(game, frame = 0, winner = null) {
  const picture = new Picture(IMAGE_WIDTH, IMAGE_HEIGHT, COLORS.grass);
  picture.rect(0, 0, IMAGE_WIDTH, TOP_BAR, COLORS.topBar);

  // The title at the top. Once there's a winner, it says who won.
  const title = winner === null ? "HORSE RACE" : `${HORSES[winner].name.toUpperCase()} WINS`;
  picture.text(title, 24, 14, COLORS.title, 4);

  HORSES.forEach((horse, i) => {
    const top = TOP_BAR + 4 + i * LANE_HEIGHT;
    drawLane(picture, top, i);

    // The horse's name and odds, written in its lane.
    const label = `${horse.name.toUpperCase()}  PAYS ${horse.odds}X`;
    picture.text(label, START_X + 12, top + 6, COLORS.labelShadow, 2);
    picture.text(label, START_X + 10, top + 4, COLORS.label, 2);

    // Turn "how far along the track" into "how many dots from the left".
    const x = START_X + (game.positions[i] / TRACK_LENGTH) * (FINISH_X - START_X);
    const y = top + LANE_HEIGHT - 30; // low in the lane, so the name fits above

    // A dust cloud behind any horse that just put on a burst of speed (3 steps).
    if (game.lastSteps && game.lastSteps[i] === 3) {
      picture.circle(x - 48, y + 14, 9, COLORS.dust, 0.8);
      picture.circle(x - 62, y + 10, 7, COLORS.dust, 0.6);
      picture.circle(x - 74, y + 15, 5, COLORS.dust, 0.4);
    }

    // Horses take turns between two leg poses, so they look like they're running.
    // (frame + i) makes the horses not all step at the same time.
    const legsOut = (frame + i) % 2 === 0;
    drawHorse(picture, x, y, COATS[i], SILKS[i], i + 1, legsOut);

    if (winner === i) drawRosette(picture, x - 26, y - 30);
  });

  return picture.toPng();
}

// One lane: striped dirt, white rails, the lane number, the start line
// and the checkered finish post.
function drawLane(picture, top, i) {
  // Stripes of light and dark dirt, like a raked track.
  for (let x = 0; x < IMAGE_WIDTH; x += 50) {
    const dirt = (x / 50) % 2 === 0 ? COLORS.dirtLight : COLORS.dirtDark;
    picture.rect(x, top, 50, LANE_HEIGHT, dirt);
  }
  // The white rail at the bottom of each lane.
  picture.rect(0, top + LANE_HEIGHT - 3, IMAGE_WIDTH, 3, COLORS.rail);
  if (i === 0) picture.rect(0, top, IMAGE_WIDTH, 3, COLORS.rail); // the top rail

  // The lane number in a circle the color of that jockey's shirt.
  picture.circle(44, top + LANE_HEIGHT / 2, 24, [255, 255, 255]);
  picture.circle(44, top + LANE_HEIGHT / 2, 20, SILKS[i]);
  picture.text(String(i + 1), 38, top + LANE_HEIGHT / 2 - 10, [255, 255, 255], 3);

  // The start line.
  picture.rect(START_X - 4, top, 4, LANE_HEIGHT - 3, COLORS.rail);

  // The checkered finish post: little squares that swap black and white.
  const square = 12;
  for (let row = 0; row * square < LANE_HEIGHT - 3; row++) {
    for (let col = 0; col < 3; col++) {
      const color = (row + col) % 2 === 0 ? [255, 255, 255] : [20, 20, 20];
      const height = Math.min(square, LANE_HEIGHT - 3 - row * square);
      picture.rect(FINISH_X + 50 + col * square, top + row * square, square, height, color);
    }
  }
}

/*
  A horse and jockey running to the right. (x, y) is the middle of the horse's body.
  "legsOut" picks the leg pose: stretched out, or tucked under.
*/
function drawHorse(picture, x, y, coat, silk, number, legsOut) {
  const dark = coat.map((c) => Math.max(0, c - 40)); // a darker shade for the mane and tail

  // Legs first, so the body covers the tops of them.
  // Each leg is [where it joins the body, where the hoof goes] across x.
  const legs = legsOut
    ? [[-18, -32], [-12, -20], [14, 28], [20, 36]]  // stretched out, mid-gallop
    : [[-18, -10], [-12, -4], [14, 8], [20, 14]];   // tucked under
  for (const [hip, hoof] of legs) {
    picture.line(x + hip, y + 4, x + hoof, y + 22, 5, coat);
    picture.circle(x + hoof, y + 23, 3, COLORS.hoof);
  }

  // The tail, flowing out behind.
  picture.line(x - 24, y - 6, x - 40, y + 2, 6, dark);
  picture.line(x - 40, y + 2, x - 44, y + 12, 4, dark);

  // The body: a long oval.
  picture.ellipse(x, y, 28, 12, coat);

  // The neck and head, reaching forward.
  picture.line(x + 18, y - 4, x + 32, y - 20, 12, coat);
  picture.ellipse(x + 40, y - 20, 11, 7, coat);
  picture.triangle([x + 30, y - 26], [x + 33, y - 36], [x + 36, y - 26], coat); // ear
  picture.line(x + 16, y - 10, x + 29, y - 26, 4, dark);                        // mane
  picture.circle(x + 41, y - 23, 2, COLORS.eye);

  // The saddle cloth with the horse's number on it.
  picture.rect(x - 14, y - 10, 18, 18, [255, 255, 255]);
  picture.text(String(number), x - 10, y - 8, [20, 20, 20], 2);

  // The jockey, crouched forward: shirt, arm, face and helmet.
  picture.ellipse(x - 2, y - 20, 10, 7, silk);
  picture.line(x + 4, y - 20, x + 22, y - 14, 4, silk); // arm holding the reins
  picture.circle(x + 8, y - 30, 6, COLORS.skin);
  picture.circle(x + 8, y - 33, 6, silk);               // helmet
}

// A gold rosette with a ribbon, pinned above the winner.
function drawRosette(picture, x, y) {
  picture.triangle([x - 8, y], [x - 14, y + 22], [x - 2, y + 18], COLORS.ribbon);
  picture.triangle([x + 8, y], [x + 14, y + 22], [x + 2, y + 18], COLORS.ribbon);
  picture.circle(x, y, 14, COLORS.ribbon);
  picture.circle(x, y, 11, COLORS.gold);
  picture.text("1", x - 4, y - 7, COLORS.ribbon, 2);
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

  // An oval: like a circle, but "rx" wide and "ry" tall.
  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        // Squash the oval back into a circle of size 1 and check if the dot is inside.
        const distance = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        const edge = Math.min(1, Math.max(0, (1 - distance) * Math.min(rx, ry) + 0.5));
        if (edge > 0) this.dot(x, y, color, edge);
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
