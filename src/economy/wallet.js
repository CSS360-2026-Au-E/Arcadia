/*
  DUBLOONS AND GAME POINTS: THE RULES

  This file only does the bookkeeping. It doesn't talk to Discord and it
  doesn't save to disk (bank.js does that), so it's easy to test
  (see tests/economy.spec.js).

  A "bank" is a plain object with everyone's account in it:
    {
      users: {
        "111": {
          dubloons: 250,
          points: { hangman: 40, minigolf: 520 },  // game points not converted yet
          servers: ["999"],                        // servers they've played in
        },
      },
    }
*/

// What a brand new player starts with, so they can try the betting games.
export const STARTING_DUBLOONS = 100;

export function createBank() {
  return { users: {} };
}

// Get someone's account, making a new one if this is their first time.
// If serverId is given, remember they play in that server (for /leaderboard).
export function account(bank, userId, serverId = null) {
  if (!bank.users[userId]) {
    bank.users[userId] = { dubloons: STARTING_DUBLOONS, points: {}, servers: [] };
  }
  const user = bank.users[userId];
  if (serverId && !user.servers.includes(serverId)) user.servers.push(serverId);
  return user;
}

export function getDubloons(bank, userId) {
  return account(bank, userId).dubloons;
}

export function getPoints(bank, userId, game) {
  return account(bank, userId).points[game] || 0;
}

// Give game points (not dubloons). Only whole numbers above 0 count.
export function addPoints(bank, userId, game, points, serverId = null) {
  const user = account(bank, userId, serverId);
  const amount = Math.floor(points);
  if (amount > 0) user.points[game] = (user.points[game] || 0) + amount;
  return user.points[game] || 0;
}

// Add dubloons (a win). Gives back the new balance.
export function addDubloons(bank, userId, amount, serverId = null) {
  const user = account(bank, userId, serverId);
  user.dubloons += Math.floor(amount);
  return user.dubloons;
}

// Take dubloons (a bet). Gives back false, and takes nothing, if they can't afford it.
export function spendDubloons(bank, userId, amount, serverId = null) {
  const user = account(bank, userId, serverId);
  if (!Number.isInteger(amount) || amount <= 0 || user.dubloons < amount) return false;
  user.dubloons -= amount;
  return true;
}

/*
  How many dubloons some game points are worth at a rate like
  { points: 100, dubloons: 10 }. Gives back:
    dubloons - how many dubloons you get (always a whole number)
    used     - how many points that costs; the rest stay as game points
  250 points at 100 -> 10 is 25 dubloons, using all 250.
  105 points at 100 -> 10 is 10 dubloons, using 100 and leaving 5.
*/
export function exchange(points, rate) {
  const dubloons = Math.floor((points * rate.dubloons) / rate.points);
  const used = Math.ceil((dubloons * rate.points) / rate.dubloons);
  return { dubloons, used };
}

/*
  Turn game points into dubloons. "game" is one game's key, or null for all of them.
  "rates" is RATES from rates.js.
  Gives back one line per game that had points, like:
    { game: "hangman", points: 160, dubloons: 16, left: 0 }
*/
export function convert(bank, userId, rates, game = null, serverId = null) {
  const user = account(bank, userId, serverId);
  const keys = game ? [game] : Object.keys(rates);
  const results = [];

  for (const key of keys) {
    const rate = rates[key];
    const points = user.points[key] || 0;
    if (!rate || points === 0) continue;

    const { dubloons, used } = exchange(points, rate);
    user.points[key] = points - used;
    user.dubloons += dubloons;
    results.push({ game: key, points: used, dubloons, left: user.points[key] });
  }
  return results;
}

/*
  The richest players in one server, most dubloons first.
  Gives back a list like [{ id: "111", dubloons: 900 }, ...].
*/
export function leaderboard(bank, serverId, count = 10) {
  return Object.entries(bank.users)
    .filter(([, user]) => user.servers.includes(serverId))
    .map(([id, user]) => ({ id, dubloons: user.dubloons }))
    .sort((a, b) => b.dubloons - a.dubloons)
    .slice(0, count);
}

// Someone's place on the server's leaderboard: 1 is first. 0 if they aren't on it.
export function rankOf(bank, serverId, userId) {
  const everyone = leaderboard(bank, serverId, Infinity);
  return everyone.findIndex((row) => row.id === userId) + 1;
}
