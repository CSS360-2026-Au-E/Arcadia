/*
  DUBLOON EXCHANGE RATES

  Every game keeps its own points. When a player types /convert, their game
  points turn into dubloons, and dubloons are what the /leaderboard ranks
  and what slots, poker and horse race bet.

  This file is the one place that says how much each game's points are worth.
  Each line reads like a sentence:

      hangman: { points: 100, dubloons: 10 }
      "100 hangman points are worth 10 dubloons."

  TO SET YOUR GAME'S RATE: change the two numbers on your game's line, then
  run `npm test` (it checks that every rate is a whole number above 0).
  Nothing else needs to change. Leftover points that don't make a full
  dubloon stay in the game and count next time.

  How many points a game hands out (for a win, for each hole, and so on)
  is set in src/economy/earnings.js.

Horse race, slots and poker aren't listed here. You bet dubloons on them
directly, so 1 coin is 1 dubloon.
*/

export const RATES = {
  // am-pngg's game. A win is 100 to 160 points.
  hangman: { name: "Hangman", points: 100, dubloons: 10 },

  // abhip1008's game. A win is 50 to 300 points, more for shorter clips.
  songguess: { name: "Song Guesser", points: 100, dubloons: 10 },

  // abhip1008's game. One full game can be 500+ points, so the rate is lower.
  minigolf: { name: "Minigolf", points: 100, dubloons: 5 },

  // cpukarma's game. 10 points = 1 dubloon. A win is 300 points (30 dubloons),
  // and everyone else who played gets 100 points (10 dubloons).
  hotpotato: { name: "Hot Potato", points: 10, dubloons: 1 },

  // ovjason's game. 100 points = 1 dubloon. A win is 50 (easy), 100 (medium)
  // or 300 (hard), and a draw is 30.
  tictactoe: { name: "Tic Tac Toe", points: 100, dubloons: 1 },

  // cpukarma's game. CATcher's points are called mewroons, and they're worth
  // 1 dubloon each. Catching a cat is 5 (common), 10 (rare), 20 (legendary)
  // or 50 (mythical) mewroons.
  catcher: { name: "CATcher (mewroons)", points: 1, dubloons: 1 },

  // kristinebaldoza's personality quiz. It's a one-time quiz, so finishing it
  // gives 100 points, which is 1 dubloon.
  mbti: { name: "Personality Quiz", points: 100, dubloons: 1 },
};

// The game keys in the order /points and /convert list them.
export const GAME_KEYS = Object.keys(RATES);
