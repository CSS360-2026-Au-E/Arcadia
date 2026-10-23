/*
  SONG GUESSER GAME RULES

  The bot plays a tiny piece of a song, then a longer piece each time
  nobody gets it, like the game Heardle. First person to type the
  song's title wins.

  This file knows the rules and how to get songs. It does not talk to
  Discord. The rules are tested in tests/songguess.spec.js.

  Where the songs come from: Deezer's free API. It needs no account or
  key, and every song comes with a 30 second preview MP3. (Spotify
  stopped giving preview clips to new apps in 2024, so it can't be used.)

  A "game" is a plain object that looks like this:
    {
      song: { title, artist, link, preview },
      stage: 0,      // which clip we are on, 0 is the shortest
      over: false,   // true once someone wins or the last clip ran out
      timer: null,   // the countdown to the next clip
    }
*/
import axios from "axios";

// How many seconds of the song each clip plays.
// Every time nobody guesses it, the next clip is longer.
export const CLIP_SECONDS = [0.1, 1, 2, 4, 8, 16];

// How long players get on each clip before the bot plays a longer one.
export const SECONDS_PER_CLIP = 20;

// Deezer's top 100 songs right now, so most people will know them.
const CHART_URL = "https://api.deezer.com/chart/0/tracks?limit=100";

// Deezer previews are 30 seconds long.
const PREVIEW_SECONDS = 30;

export function createGame(song) {
  return { song, stage: 0, over: false, timer: null };
}

// True when the game has already played its longest clip.
export function isLastClip(game) {
  return game.stage >= CLIP_SECONDS.length - 1;
}

/*
  Tidy up a song title so small differences don't matter.
  "Dracula (with JENNIE)"        -> "dracula"
  "Bohemian Rhapsody - Remastered" -> "bohemian rhapsody"
  "Don't Stop Me Now"            -> "dont stop me now"
*/
export function cleanTitle(text) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ") // drop (feat. ...) and [Live]
    .replace(/\s+-\s+.*$/, " ") // drop " - Remastered 2011"
    .replace(/\bfeat\..*$/, " ") // drop "feat. Someone" with no brackets
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, "") // drop punctuation like ' ! ?
    .replace(/\s+/g, " ")
    .trim();
}

// How many single letter changes it takes to turn a into b.
// Used so a small typo still counts as right.
export function typoDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// Is this message the right song title?
// Allows one typo for every 5 letters, up to 2 typos.
export function isCorrectGuess(game, text) {
  const guess = cleanTitle(text);
  const answer = cleanTitle(game.song.title);
  if (guess.length === 0) return false;
  if (guess === answer) return true;

  const allowedTypos = Math.min(2, Math.floor(answer.length / 5));
  return typoDistance(guess, answer) <= allowedTypos;
}

/*
  Cut the first few seconds off the preview MP3.
  An MP3 is a short header (the "ID3 tag") followed by the sound, and the
  sound uses about the same number of bytes every second. So the first
  N seconds of sound is roughly the first N seconds' worth of bytes.
*/
export function cutClip(mp3, seconds) {
  const headerSize = id3Size(mp3);
  const bytesPerSecond = (mp3.length - headerSize) / PREVIEW_SECONDS;
  const end = headerSize + Math.ceil(bytesPerSecond * seconds);
  return mp3.subarray(0, Math.min(end, mp3.length));
}

// The size of the ID3 tag at the start of an MP3, or 0 if there is none.
// Its size is stored in bytes 6 to 9, 7 bits per byte.
export function id3Size(mp3) {
  const startsWithId3 = mp3[0] === 0x49 && mp3[1] === 0x44 && mp3[2] === 0x33; // "ID3"
  if (!startsWithId3) return 0;
  const size = (mp3[6] << 21) | (mp3[7] << 14) | (mp3[8] << 7) | mp3[9];
  return 10 + size;
}

// Pick a random popular song that has a preview.
export async function getRandomSong() {
  const response = await axios.get(CHART_URL);
  const songs = response.data.data.filter((track) => track.preview);
  const track = songs[Math.floor(Math.random() * songs.length)];

  return {
    title: track.title,
    artist: track.artist.name,
    link: track.link,
    preview: track.preview,
  };
}

// Download a song's 30 second preview as raw MP3 bytes.
export async function downloadPreview(song) {
  const response = await axios.get(song.preview, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

/*
  Every game that is running right now, one per channel.
  Games are kept in memory, so they disappear when the bot restarts.
*/
export const games = new Map();
