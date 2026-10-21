/*
  HANGMAN GAME RULES

  This file only knows the rules of hangman. It does not talk to Discord.
  Keeping the rules separate makes them easy to read and easy to test
  (see tests/hangman.spec.js).

  A "game" is just a plain object that looks like this:
    {
      word: "pixel",          // the secret word
      guessed: Set {"p","z"}, // every letter anyone has tried so far
      wrong: 1,               // how many guesses were not in the word
    }
*/

// How many wrong guesses you get before you lose.
export const MAX_WRONG = 6;

// The secret word is picked at random from this list.
// Add more words here if you like (lowercase letters only).
export const WORDS = [
  "arcade", "joystick", "pixel", "console", "controller", "highscore",
  "dungeon", "wizard", "dragon", "treasure", "galaxy", "rocket",
  "puzzle", "zombie", "ninja", "pirate", "castle", "keyboard",
  "javascript", "discord", "bowling", "pinball", "token",
];

// The picture of the hangman. Picture number 0 is the empty gallows,
// picture number 6 is the full stick figure (you lost).
const PICTURES = [
  "  +---+\n  |   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n=========",
];

// Start a brand new game. If no word is given, pick a random one.
export function createGame(word) {
  if (!word) {
    const randomIndex = Math.floor(Math.random() * WORDS.length);
    word = WORDS[randomIndex];
  }

  return {
    word: word.toLowerCase(),
    guessed: new Set(),
    wrong: 0,
  };
}

// Show the word with unguessed letters hidden, like "p _ x _ l".
export function hiddenWord(game) {
  let result = [];
  for (const letter of game.word) {
    if (game.guessed.has(letter)) {
      result.push(letter);
    } else {
      result.push("_");
    }
  }
  return result.join(" ");
}

// True when every letter of the word has been guessed.
export function isWon(game) {
  for (const letter of game.word) {
    if (!game.guessed.has(letter)) return false;
  }
  return true;
}

// True when the players have used up all their wrong guesses.
export function isLost(game) {
  return game.wrong >= MAX_WRONG;
}

/*
  Try one letter. Returns a word that says what happened:
    "invalid" - it was not a single letter a to z, so we ignore it
    "repeat"  - someone already tried that letter
    "hit"     - the letter is in the word
    "miss"    - the letter is not in the word
    "won"     - that letter finished the word
    "lost"    - that was the last wrong guess
*/
export function guess(game, text) {
  const letter = text.trim().toLowerCase();

  // /^[a-z]$/ means "exactly one letter from a to z".
  if (!/^[a-z]$/.test(letter)) return "invalid";
  if (game.guessed.has(letter)) return "repeat";

  game.guessed.add(letter);

  if (game.word.includes(letter)) {
    return isWon(game) ? "won" : "hit";
  }

  game.wrong = game.wrong + 1;
  return isLost(game) ? "lost" : "miss";
}

// The letters people tried that were NOT in the word, in a-z order.
export function wrongLetters(game) {
  return [...game.guessed].filter((letter) => !game.word.includes(letter)).sort();
}

// Build the message the bot sends: the picture, the hidden word,
// and the wrong guesses so far. The ``` makes Discord show it in a
// fixed-width font so the picture lines up.
export function showGame(game) {
  const wrong = wrongLetters(game);
  const wrongText = wrong.length > 0 ? wrong.join(", ") : "none";

  return (
    "```\n" +
    PICTURES[game.wrong] + "\n\n" +
    hiddenWord(game) + "\n" +
    "```\n" +
    `Wrong guesses (${game.wrong}/${MAX_WRONG}): ${wrongText}`
  );
}

/*
  Every game that is running right now, one per channel.
  A Map is like a dictionary: games.get(channelId) gives back that
  channel's game. Games are kept in memory, so they disappear when
  the bot is restarted.
*/
export const games = new Map();
