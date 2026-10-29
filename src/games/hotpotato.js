/*
  HOT POTATO GAME RULES

  This file only knows the rules of hot potato. It does not talk to Discord.
  Keeping the rules separate makes them easy to read and easy to test
  (see tests/hotpotato.spec.js).

  How a game goes:
    1. Someone types /hotpotato. Players type "join" to get in.
    2. The bot hands the potato to a random player and starts a secret timer.
    3. Whoever holds the potato passes it by @mentioning another player.
    4. When the timer runs out, whoever is holding the potato is out.
    5. New round with the players who are left. Last player standing wins.

  A "game" is just a plain object (a bundle of named values) that looks like this:
    {
      stage: "joining",          // "joining" before it starts, "playing" after
      players: ["111", "222"],   // Discord user IDs of everyone still in
      holder: "111",             // who has the potato right now (null before it starts)
      out: ["333"],              // everyone who has exploded, in order
    }

  WORDS YOU'LL SEE A LOT
    export   - lets OTHER files use this thing. The event files "import" these.
    const    - a named value that never gets replaced.
    function - a reusable set of steps. You give it inputs, it can give back an answer.
    return   - "give back this answer and stop the function right here."
*/

// ---------------------------------------------------------------------------
// SETTINGS
// These are the numbers that control the game. They're at the top so anyone
// can change how the game feels without digging through the code.
// ---------------------------------------------------------------------------

// How many people you need to start a game.
export const MIN_PLAYERS = 2;

// How long people have to type "join", in seconds.
export const JOIN_SECONDS = 30;

// The secret timer is a random length between these two numbers, in seconds.
// Random means nobody knows when it will explode, which is what makes it tense.
export const SHORTEST_FUSE = 10;
export const LONGEST_FUSE = 30;

// ---------------------------------------------------------------------------
// STARTING A GAME
// ---------------------------------------------------------------------------

// Make a brand new, empty game. Nobody is in it yet, and nobody has the potato.
// Every game in every channel starts from this same blank bundle.
export function createGame() {
  return {
    stage: "joining", // we start in the "waiting for people to join" stage
    players: [],      // an empty list; people get added when they type "join"
    holder: null,     // null means "nobody" (no one has the potato yet)
    out: [],          // an empty list; exploded players get added here
  };
}

/*
  Add someone to the game.
  Instead of just saying yes or no, it returns a word describing what happened,
  so the Discord file can pick the right message to send:
    "joined"  - they are in
    "already" - they were already in
    "closed"  - too late, the game already started
*/
export function join(game, userId) {
  // If the game has moved past joining, nobody new can get in.
  if (game.stage !== "joining") return "closed";

  // .includes() checks "is this ID already somewhere in the list?"
  // This stops someone from joining twice.
  if (game.players.includes(userId)) return "already";

  // .push() adds the new player to the end of the list.
  game.players.push(userId);
  return "joined";
}

// Answers true or false: are there enough players to start?
// .length is how many items are in the list.
export function canStart(game) {
  return game.players.length >= MIN_PLAYERS;
}

// ---------------------------------------------------------------------------
// RANDOMNESS
// ---------------------------------------------------------------------------

// Pick one random item from a list.
// Math.random() gives a decimal from 0 up to (but not including) 1, like 0.73.
// Multiplying by the list length and rounding down (Math.floor) turns that into
// a position in the list. Example with 3 players: 0.73 x 3 = 2.19 -> 2,
// so we pick the item at position 2 (the third player, since lists count from 0).
// There's no "export" here, so only this file can use it. It's a private helper.
function randomFrom(list) {
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

// Pick how long this round's secret timer is, in seconds.
// Step 1: range = 30 - 10 = 20 (how much room there is between shortest and longest).
// Step 2: pick a random whole number from 0 to 20 (we add 1 so 20 itself can be picked).
// Step 3: add the shortest time back on, so the answer lands between 10 and 30.
export function fuseSeconds() {
  const range = LONGEST_FUSE - SHORTEST_FUSE;
  return SHORTEST_FUSE + Math.floor(Math.random() * (range + 1));
}

// ---------------------------------------------------------------------------
// PLAYING
// ---------------------------------------------------------------------------

// Start a round: switch to the "playing" stage and give the potato to a
// random player. Gives back the ID of whoever got it, so the Discord file can
// announce them.
export function startRound(game) {
  game.stage = "playing";
  game.holder = randomFrom(game.players);
  return game.holder;
}

/*
  Try to pass the potato from one player (fromId) to another (toId).
  Each "if" is a rule that can block the pass. The checks run top to bottom,
  and the first one that fails returns right away, so the potato never moves.
  If every check is fine, we reach the bottom and the pass happens.
    "passed"      - it worked, toId has the potato now
    "not-holder"  - fromId doesn't have the potato, so they can't pass it
    "self"        - you can't pass it to yourself
    "not-playing" - toId isn't in the game (or is already out)
*/
export function pass(game, fromId, toId) {
  // Rule 1: only the person holding the potato can pass it.
  if (game.holder !== fromId) return "not-holder";

  // Rule 2: you can't pass it to yourself (that would dodge the game).
  if (fromId === toId) return "self";

  // Rule 3: you can only pass to someone still in the game.
  if (!game.players.includes(toId)) return "not-playing";

  // All rules passed: hand the potato over.
  game.holder = toId;
  return "passed";
}

// The timer ran out! Whoever is holding the potato is out.
// Gives back the ID of the player who exploded, so Discord can announce them.
export function explode(game) {
  const loser = game.holder; // remember who had it

  // .filter() makes a NEW list that keeps only the items that pass a test.
  // The test here is "this ID is not the loser," so the loser gets left out.
  game.players = game.players.filter((id) => id !== loser);

  game.out.push(loser); // add them to the list of people who are out
  game.holder = null;   // the potato is gone until the next round starts
  return loser;
}

// ---------------------------------------------------------------------------
// ENDING
// ---------------------------------------------------------------------------

// True when only one player (or nobody) is left, meaning the game is over.
export function isOver(game) {
  return game.players.length <= 1;
}

// Who won? If the game is over, it's the one player left in the list.
// The "? :" is a short if/else: (question) ? (answer if yes) : (answer if no).
export function winner(game) {
  return isOver(game) ? game.players[0] : null;
}

// ---------------------------------------------------------------------------
// ALL RUNNING GAMES
// ---------------------------------------------------------------------------

/*
  Every game that is running right now, one per channel.
  A Map is like a dictionary or a coat check: you store something under a
  label (the channel ID) and get it back later with that same label.
    games.set(channelId, game)  - save a game for this channel
    games.get(channelId)        - get this channel's game back
    games.has(channelId)        - is there a game in this channel?
    games.delete(channelId)     - the game is over, free up the channel
  Games are kept in the bot's memory, so they disappear when the bot restarts.
*/
export const games = new Map();
