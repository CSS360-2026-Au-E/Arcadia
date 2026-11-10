/*
  DUBLOON EXCHANGE RATES

  Every game keeps its own points. When a player types /convert, their game
  points turn into dubloons, and dubloons are what the /leaderboard ranks
  and what blackjack, slots and horse race bet.

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
*/

export const RATES = {
  // am-pngg's game. A win is 100 to 160 points.
  hangman: { name: "Hangman", points: 100, dubloons: 10 },

  // abhip1008's game. A win is 50 to 300 points, more for shorter clips.
  songguess: { name: "Song Guesser", points: 100, dubloons: 10 },

  // abhip1008's game. One full game can be 500+ points, so the rate is lower.
  minigolf: { name: "Minigolf", points: 100, dubloons: 5 },

  // cpukarma's game. A win is 200 points plus 20 for every round survived.
  hotpotato: { name: "Hot Potato", points: 100, dubloons: 10 },

  // ovjason's game. A win is 50 (easy), 100 (medium) or 300 (hard), a draw is 30.
  tictactoe: { name: "Tic Tac Toe", points: 100, dubloons: 10 },
};

// The game keys in the order /points and /convert list them.
export const GAME_KEYS = Object.keys(RATES);
