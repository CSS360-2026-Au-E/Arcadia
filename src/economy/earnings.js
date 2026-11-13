/*
  HOW MANY POINTS EACH GAME HANDS OUT

  These functions only do math. They don't talk to Discord and they don't
  save anything. Each game's Discord code calls the one for its game when
  a game ends, then gives the points to the players (see bank.js).

  The points are game points, not dubloons. src/economy/rates.js decides
  what they're worth in dubloons when someone types /convert.
*/

// ---------------------------------------------------------------------------
// HANGMAN: the person who types the last letter solves it.
// ---------------------------------------------------------------------------
export const HANGMAN_WIN = 100;
export const HANGMAN_PER_LIFE_LEFT = 10;

// maxWrong is MAX_WRONG from hangman.js (6). A clean solve is 100 + 6 * 10 = 160.
export function hangmanPoints(game, maxWrong) {
  return HANGMAN_WIN + HANGMAN_PER_LIFE_LEFT * (maxWrong - game.wrong);
}

// ---------------------------------------------------------------------------
// SONG GUESSER: the person who names the song. Shorter clip, more points.
// One number per clip: 0.1s, 1s, 2s, 4s, 8s, 16s.
// ---------------------------------------------------------------------------
export const SONGGUESS_BY_CLIP = [300, 250, 200, 150, 100, 50];

export function songguessPoints(stage) {
  const last = SONGGUESS_BY_CLIP.length - 1;
  return SONGGUESS_BY_CLIP[Math.min(stage, last)];
}

// ---------------------------------------------------------------------------
// MINIGOLF: everyone earns points for every hole, and the top finishers get
// a bonus. The courses have no par, so points go by strokes.
// ---------------------------------------------------------------------------

// Index = strokes on the hole. 1 stroke (a hole in one) is 100 points.
// 8 strokes is the most you can take, so it earns nothing.
export const MINIGOLF_BY_STROKES = [0, 100, 60, 40, 20, 10, 10, 10, 0];

// Bonus for finishing 1st, 2nd and 3rd. Last place never gets a bonus,
// so a one-player game earns hole points only.
export const MINIGOLF_PLACE_BONUS = [300, 150, 75];

/*
  Points for every player at the end of a minigolf game.
  "players" is game.players. Each player has strokes like [3, 2, 5].
  Gives back a list like [{ id: "111", points: 460 }, ...].
  Players who tie share the better place.
*/
export function minigolfPoints(players) {
  const total = (p) => p.strokes.reduce((sum, n) => sum + n, 0);
  const totals = players.map(total);
  const worst = Math.max(...totals);

  return players.map((player) => {
    const holePoints = player.strokes.reduce(
      (sum, n) => sum + (MINIGOLF_BY_STROKES[n] ?? 0),
      0
    );

    // Place = how many players did strictly better, so ties share a place.
    const place = totals.filter((t) => t < total(player)).length;
    const isLast = players.length < 2 || total(player) === worst;
    const bonus = isLast ? 0 : MINIGOLF_PLACE_BONUS[place] ?? 0;

    return { id: player.id, points: holePoints + bonus };
  });
}

// ---------------------------------------------------------------------------
// HOT POTATO: 20 points for every round you survive, and 200 for winning.
// ---------------------------------------------------------------------------
export const HOTPOTATO_WIN = 200;
export const HOTPOTATO_PER_ROUND = 20;

/*
  "game" is the finished game: game.out lists who exploded, in order, and
  winnerId is the last one standing.
  The first player out survived 0 rounds, the second survived 1, and so on.
  Gives back a list like [{ id: "111", points: 240 }, ...].
*/
export function hotpotatoPoints(game, winnerId) {
  const losers = game.out.map((id, rounds) => ({ id, points: HOTPOTATO_PER_ROUND * rounds }));
  const winner = { id: winnerId, points: HOTPOTATO_WIN + HOTPOTATO_PER_ROUND * game.out.length };
  return [...losers, winner].filter((p) => p.points > 0);
}

// ---------------------------------------------------------------------------
// TIC TAC TOE: beating the bot pays more on harder levels.
// ---------------------------------------------------------------------------
export const TICTACTOE_WIN = { easy: 50, medium: 100, hard: 300 };
export const TICTACTOE_DRAW = 30;

// status is what playTurn() returned: "won", "draw", "lost" or "continue".
export function tictactoePoints(difficulty, status) {
  if (status === "won") return TICTACTOE_WIN[difficulty] ?? 0;
  if (status === "draw") return TICTACTOE_DRAW;
  return 0;
}
