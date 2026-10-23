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

  Players pick a genre and an era (or "General" for either). The bot
  finds a Deezer playlist that matches both, like "80s Rock", and picks
  a random song from it.

  A "game" is a plain object that looks like this:
    {
      song: { title, artist, link, preview },
      stage: 0,      // which clip we are on, 0 is the shortest
      over: false,   // true once someone wins or gives up
    }
*/
import axios from "axios";

// How many seconds of the song each clip plays.
// Every time nobody guesses it, the next clip is longer.
export const CLIP_SECONDS = [0.1, 1, 2, 4, 8, 16];

// The genres players can pick. `word` goes into the playlist search,
// and `match` checks that a playlist's title really is that genre.
export const GENRES = {
  general: { name: "General" },
  pop: { name: "Pop", word: "pop", match: /pop/i },
  hiphop: { name: "Hip-Hop / Rap", word: "hip hop", match: /hip.?hop|rap/i },
  rock: { name: "Rock", word: "rock", match: /rock/i },
  rnb: { name: "R&B", word: "r&b", match: /r&b|rnb|soul/i },
  country: { name: "Country", word: "country", match: /country/i },
  electronic: { name: "Electronic / Dance", word: "dance", match: /electro|dance|edm|house/i },
  latin: { name: "Latin", word: "latin", match: /latin|reggaeton/i },
  kpop: { name: "K-Pop", word: "k-pop", match: /k-?pop/i },
};

// The eras players can pick, the same way.
export const ERAS = {
  general: { name: "General" },
  "70s": { name: "70s", word: "70s", match: /70s|70's|seventies|197\d/i },
  "80s": { name: "80s", word: "80s", match: /80s|80's|eighties|198\d/i },
  "90s": { name: "90s", word: "90s", match: /90s|90's|nineties|199\d/i },
  "2000s": { name: "2000s", word: "2000s", match: /2000s|\b00s|00's|200\d/i },
  "2010s": { name: "2010s", word: "2010s", match: /2010s|\b10s|10's|201\d/i },
  "2020s": { name: "2020s", word: "2020s", match: /2020s|\b20s|20's|202\d/i },
};

const DEEZER = "https://api.deezer.com";

// Deezer previews are 30 seconds long.
const PREVIEW_SECONDS = 30;

export function createGame(song) {
  return { song, stage: 0, over: false };
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

// What to search Deezer for, like "80s rock hits" or "pop hits".
export function searchText(genreKey, eraKey) {
  return [ERAS[eraKey].word, GENRES[genreKey].word, "hits"].filter(Boolean).join(" ");
}

/*
  Put the playlists from a search in best-first order, keeping only the
  ones whose title matches the genre and era picked. Playlists made by
  Deezer's own editors, and bigger playlists, go first.
*/
export function rankPlaylists(playlists, genreKey, eraKey) {
  const genre = GENRES[genreKey];
  const era = ERAS[eraKey];

  return playlists
    .filter((playlist) => !genre.match || genre.match.test(playlist.title))
    .filter((playlist) => !era.match || era.match.test(playlist.title))
    .map((playlist) => {
      let points = 0;
      if (/deezer/i.test(playlist.user?.name || "")) points += 2;
      if (playlist.nb_tracks >= 30) points += 1;
      return { playlist, points };
    })
    .sort((a, b) => b.points - a.points)
    .map((ranked) => ranked.playlist);
}

// "80s Rock", "Pop", or "any" when both are General.
export function describeChoice(genreKey, eraKey) {
  const words = [ERAS[eraKey], GENRES[genreKey]]
    .filter((choice) => choice.word)
    .map((choice) => choice.name);
  return words.length > 0 ? words.join(" ") : "any";
}

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

// Pick a random song with a preview for the genre and era picked.
// "General" for both means anything from Deezer's top 100 right now.
export async function getRandomSong(genreKey = "general", eraKey = "general") {
  let tracksUrl = `${DEEZER}/chart/0/tracks?limit=100`;

  if (genreKey !== "general" || eraKey !== "general") {
    const search = await axios.get(`${DEEZER}/search/playlist`, {
      params: { q: searchText(genreKey, eraKey), limit: 25 },
    });
    const playlists = rankPlaylists(search.data.data || [], genreKey, eraKey);
    if (playlists.length === 0) throw new Error("no playlist found");

    // Pick one of the best 3, so the same playlist isn't used every time.
    const playlist = pickRandom(playlists.slice(0, 3));
    tracksUrl = `${DEEZER}/playlist/${playlist.id}/tracks?limit=100`;
  }

  const response = await axios.get(tracksUrl);
  const songs = response.data.data.filter((track) => track.preview);
  if (songs.length === 0) throw new Error("no songs with previews");
  const track = pickRandom(songs);

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
