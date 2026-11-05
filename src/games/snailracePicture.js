var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var snailracePicture_exports = {};
__export(snailracePicture_exports, {
  IMAGE_HEIGHT: () => IMAGE_HEIGHT,
  IMAGE_WIDTH: () => IMAGE_WIDTH,
  drawRace: () => drawRace
});
module.exports = __toCommonJS(snailracePicture_exports);
var import_zlib = __toESM(require("zlib"));
var import_snailrace = require("./snailrace");
const IMAGE_WIDTH = 800;
const TOP_BAR = 56;
const LANE_HEIGHT = 84;
const IMAGE_HEIGHT = TOP_BAR + LANE_HEIGHT * import_snailrace.SNAILS.length;
const START_X = 120;
const FINISH_X = 720;
const SHELL_COLORS = [
  [230, 57, 70],
  [46, 196, 102],
  [58, 134, 255],
  [255, 200, 30]
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
  nameShadow: [30, 60, 30]
};
function drawRace(game, winner = null) {
  const picture = new Picture(IMAGE_WIDTH, IMAGE_HEIGHT, COLORS.topBar);
  const title = winner === null ? "SNAIL RACE" : `${import_snailrace.SNAILS[winner].name.toUpperCase()} WINS`;
  picture.text(title, 24, 14, COLORS.title, 4);
  import_snailrace.SNAILS.forEach((snail, i) => {
    const top = TOP_BAR + i * LANE_HEIGHT;
    drawLane(picture, top, i);
    picture.text(snail.name.toUpperCase(), START_X + 12, top + 8, COLORS.nameShadow, 2);
    picture.text(snail.name.toUpperCase(), START_X + 10, top + 6, COLORS.name, 2);
    const x = START_X + game.positions[i] / import_snailrace.TRACK_LENGTH * (FINISH_X - START_X);
    const y = top + LANE_HEIGHT / 2 + 10;
    picture.rect(START_X, y + 12, x - START_X, 6, COLORS.slime, 0.6);
    const steps = game.lastSteps ? game.lastSteps[i] : 0;
    if (steps === 2) {
      for (const dy of [-14, -2, 10])
        picture.line(x - 70, y + dy, x - 40, y + dy, 3, COLORS.speed);
    }
    drawSnail(picture, x, y, SHELL_COLORS[i]);
    if (winner === i)
      drawCrown(picture, x + 2, y - 44);
  });
  return picture.toPng();
}
function drawLane(picture, top, i) {
  for (let x = 0; x < IMAGE_WIDTH; x += 40) {
    const grass = (x / 40 + i) % 2 === 0 ? COLORS.grassLight : COLORS.grassDark;
    picture.rect(x, top, 40, LANE_HEIGHT, grass);
  }
  picture.rect(0, top + LANE_HEIGHT - 3, IMAGE_WIDTH, 3, COLORS.laneLine);
  picture.circle(48, top + LANE_HEIGHT / 2, 26, [255, 255, 255]);
  picture.circle(48, top + LANE_HEIGHT / 2, 22, SHELL_COLORS[i]);
  picture.text(String(i + 1), 42, top + LANE_HEIGHT / 2 - 10, [255, 255, 255], 3);
  picture.rect(START_X - 4, top, 4, LANE_HEIGHT - 3, COLORS.startLine);
  const square = 12;
  for (let row = 0; row * square < LANE_HEIGHT - 3; row++) {
    for (let col = 0; col < 3; col++) {
      const color = (row + col) % 2 === 0 ? [255, 255, 255] : [20, 20, 20];
      const height = Math.min(square, LANE_HEIGHT - 3 - row * square);
      picture.rect(FINISH_X + 20 + col * square, top + row * square, square, height, color);
    }
  }
}
function drawSnail(picture, x, y, shellColor) {
  for (let dx = -30; dx <= 26; dx += 4)
    picture.circle(x + dx, y + 8, 10, COLORS.bodyEdge);
  for (let dx = -30; dx <= 26; dx += 4)
    picture.circle(x + dx, y + 8, 8, COLORS.body);
  picture.circle(x + 28, y, 11, COLORS.bodyEdge);
  picture.circle(x + 28, y, 9, COLORS.body);
  for (const lean of [0, 10]) {
    picture.line(x + 26, y - 4, x + 26 + lean, y - 26, 4, COLORS.body);
    picture.circle(x + 26 + lean, y - 28, 6, COLORS.eyeWhite);
    picture.circle(x + 28 + lean, y - 28, 3, COLORS.pupil);
  }
  picture.line(x + 30, y + 4, x + 35, y + 3, 2, COLORS.pupil);
  picture.circle(x - 6, y - 10, 24, COLORS.shellDark);
  const rings = [
    [21, shellColor, 0],
    [16, COLORS.shellDark, 2],
    [13, shellColor, 3],
    [8, COLORS.shellDark, 4],
    [5, shellColor, 5]
  ];
  for (const [radius, color, nudge] of rings)
    picture.circle(x - 6 + nudge, y - 10, radius, color);
  picture.circle(x - 16, y - 20, 4, [255, 255, 255], 0.7);
}
function drawCrown(picture, x, y) {
  picture.rect(x - 20, y - 8, 40, 10, COLORS.crown);
  picture.triangle([x - 20, y - 8], [x - 20, y - 26], [x - 6, y - 8], COLORS.crown);
  picture.triangle([x - 10, y - 8], [x, y - 30], [x + 10, y - 8], COLORS.crown);
  picture.triangle([x + 6, y - 8], [x + 20, y - 26], [x + 20, y - 8], COLORS.crown);
  picture.circle(x, y - 3, 3, COLORS.crownJewel);
}
class Picture {
  constructor(width, height, color) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.rect(0, 0, width, height, color);
  }
  dot(x, y, color, amount = 1) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return;
    const i = (y * this.width + x) * 3;
    for (let c = 0; c < 3; c++) {
      this.pixels[i + c] = Math.round(this.pixels[i + c] * (1 - amount) + color[c] * amount);
    }
  }
  rect(left, top, width, height, color, amount = 1) {
    for (let y = Math.round(top); y < top + height; y++) {
      for (let x = Math.round(left); x < left + width; x++)
        this.dot(x, y, color, amount);
    }
  }
  circle(cx, cy, radius, color, amount = 1) {
    for (let y = Math.floor(cy - radius - 1); y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius - 1); x <= cx + radius + 1; x++) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const edge = Math.min(1, Math.max(0, radius + 0.5 - distance));
        if (edge > 0)
          this.dot(x, y, color, edge * amount);
      }
    }
  }
  line(x1, y1, x2, y2, thickness, color) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= steps; i++) {
      this.circle(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, thickness / 2, color);
    }
  }
  triangle(a, b, c, color) {
    const area = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const total = area(a, b, c);
    for (let y = Math.floor(Math.min(a[1], b[1], c[1])); y <= Math.max(a[1], b[1], c[1]); y++) {
      for (let x = Math.floor(Math.min(a[0], b[0], c[0])); x <= Math.max(a[0], b[0], c[0]); x++) {
        const p = [x + 0.5, y + 0.5];
        const inside = [area(b, c, p), area(c, a, p), area(a, b, p)].every((w) => w / total >= 0);
        if (inside)
          this.dot(x, y, color);
      }
    }
  }
  text(text, left, top, color, size = 2) {
    let x = left;
    for (const char of text) {
      const rows = FONT[char] || [];
      rows.forEach((bits, row) => {
        for (let col = 0; col < 5; col++) {
          if (bits[col] === "1")
            this.rect(x + col * size, top + row * size, size, size, color);
        }
      });
      x += 6 * size;
    }
  }
  toPng() {
    const rows = Buffer.alloc((this.width * 3 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const start = y * (this.width * 3 + 1);
      rows[start] = 0;
      this.pixels.copy(rows, start + 1, y * this.width * 3, (y + 1) * this.width * 3);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header[8] = 8;
    header[9] = 2;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk("IHDR", header),
      pngChunk("IDAT", import_zlib.default.deflateSync(rows)),
      pngChunk("IEND", Buffer.alloc(0))
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
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++)
    c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 4294967295;
  for (const byte of buffer)
    crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
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
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"]
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  drawRace
});
