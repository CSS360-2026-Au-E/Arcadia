/*
  CATCHER: THE RULES

  This file only knows the rules of CATcher. It doesn't talk to Discord and
  it doesn't save anything, so it's easy to test (see tests/catcher.spec.js).
  The Discord side lives in src/events/catcherInteraction.js, and saving
  everyone's cats and treats lives in src/games/catcherSave.js.

  How it plays:
    1. Someone types /explore and a random wild cat appears in the channel.
       Rarer cats show up less often. Each cat is in a random mood.
    2. Anyone can try to catch it with pspsps (no treat) or by offering
       treats. Each cat only eats its favorite treat and rejects the rest.
       Players can stack several favorite treats on one try. The person who
       explored can also skip it and look for a different cat.
    3. The bot rolls a number from 1 to 100. If the roll is at or below the
       catch chance, the cat is caught and goes into that player's collection
       (/catventory), and they earn mewroons.
    4. Each cat only sticks around for a few tries before it runs away.
    5. Mewroons buy treats in /catshop. The cat's favorite treat raises the
       catch chance. /convert turns mewroons into dubloons, 1 for 1.
*/
import { account } from "../economy/wallet";

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------

/*
  Rarities. For each one:
    weight     how often it appears. The weights add up to 101, so a common
               cat appears 60 out of every 101 explores and a mythical 1.
    chance     the starting catch chance, out of 100
    tries      how many catch attempts (from anyone) before the cat runs away
    mewroons   how many mewroons you earn for catching it
*/
export const RARITIES = {
  common: { name: "Common", emoji: "⚪", weight: 60, chance: 60, tries: 5, mewroons: 5 },
  rare: { name: "Rare", emoji: "🔵", weight: 30, chance: 30, tries: 4, mewroons: 10 },
  legendary: { name: "Legendary", emoji: "🟡", weight: 10, chance: 10, tries: 3, mewroons: 20 },
  mythical: { name: "Mythical", emoji: "🟣", weight: 1, chance: 1, tries: 2, mewroons: 50 },
};

// Every cat shows up in one of these moods, picked at random.
// "bonus" is added to (or, for angry, taken away from) the catch chance.
export const MOODS = {
  sleepy: { name: "Sleepy", emoji: "😴", bonus: 30 },
  calm: { name: "Calm", emoji: "😌", bonus: 15 },
  angry: { name: "Angry", emoji: "😾", bonus: -30 },
};

// Treats. "price" is in mewroons. A cat only eats its favorite treat (see
// CATS below) and rejects the others. Each favorite treat it eats adds
// "bonus" plus FAVORITE_BONUS to the catch chance, so one Tuna adds 15,
// one Catnip adds 20 and one Golden Salmon adds 40.
export const TREATS = {
  tuna: { name: "Tuna", emoji: "🐟", price: 10, bonus: 5 },
  catnip: { name: "Catnip", emoji: "🌿", price: 20, bonus: 10 },
  salmon: { name: "Golden Salmon", emoji: "✨", price: 100, bonus: 30 },
};

// Extra chance for each favorite treat, on top of the treat's own bonus.
export const FAVORITE_BONUS = 10;

// The catch chance always stays between these. 1 means no cat is ever
// impossible. 100 means stacking enough treats makes a catch certain.
export const MIN_CHANCE = 1;
export const MAX_CHANCE = 100;

// Mewroons are CATcher's game points. They're saved in the shared bank
// under this game key, which is also CATcher's line in rates.js.
export const MEWROON_KEY = "catcher";

/*
  The cats. To add your art, save PNGs in assets/catcher/ named after the
  cat's id and mood, like elgato-sleepy.png, elgato-calm.png and
  elgato-angry.png. A plain elgato.png is used for any mood that doesn't
  have its own drawing, and a cat with no picture at all shows its emoji.

  "hint" is a clue about the cat's favorite treat, shown when it appears.
*/
export const CATS = [
  { id: "elgato", name: "El Gato", rarity: "common", emoji: "🐈", favorite: "tuna", hint: "It keeps sniffing toward the kitchen." },
  { id: "nerd", name: "Know-It-All Nerd Cat", rarity: "common", emoji: "🤓", favorite: "catnip", hint: "Actually, it read that plants are good for focus." },
  { id: "stare", name: "1000 Stare Cat", rarity: "rare", emoji: "😐", favorite: "tuna", hint: "It's staring at the fish tank. It has been for hours." },
  { id: "clapping", name: "Clapping Hand Cat", rarity: "rare", emoji: "👏", favorite: "catnip", hint: "It claps whenever someone walks past the garden." },
  { id: "thinker", name: "Thinker Cat", rarity: "legendary", emoji: "🤔", favorite: "salmon", hint: "It only thinks about the finest things in life." },
  { id: "soup", name: "Full of Soup Cat", rarity: "legendary", emoji: "🍲", favorite: "catnip", hint: "Too full to eat. Maybe something to play with instead?" },
  { id: "soupface", name: "Cat with White Soup on Face", rarity: "mythical", emoji: "🥛", favorite: "salmon", hint: "It shimmers near anything golden." },
];

export function findCat(catId) {
  return CATS.find((cat) => cat.id === catId);
}

// ---------------------------------------------------------------------------
// RANDOMNESS
// "random" is a function that gives a number from 0 up to (not including) 1.
// The game uses Math.random. The tests pass in fixed numbers instead, so the
// results are always the same.
// ---------------------------------------------------------------------------

// Pick a rarity using the weights, then a random cat of that rarity.
// Example: the weights add up to 101. A random number of 0.65 x 101 = 65.65.
// Commons cover 0-59 and rares cover 60-89, so 65.65 lands on rare.
export function pickCat(random = Math.random) {
  const total = Object.values(RARITIES).reduce((sum, r) => sum + r.weight, 0);
  let spot = random() * total;

  let rarity = "common";
  for (const [key, r] of Object.entries(RARITIES)) {
    if (spot < r.weight) {
      rarity = key;
      break;
    }
    spot -= r.weight;
  }

  const choices = CATS.filter((cat) => cat.rarity === rarity);
  return choices[Math.floor(random() * choices.length)];
}

// Each mood is equally likely.
export function pickMood(random = Math.random) {
  const keys = Object.keys(MOODS);
  return keys[Math.floor(random() * keys.length)];
}

// A whole number from 1 to 100.
export function roll(random = Math.random) {
  return Math.floor(random() * 100) + 1;
}

// ---------------------------------------------------------------------------
// ONE WILD CAT (an "encounter")
// ---------------------------------------------------------------------------

/*
  A new encounter looks like:
    { catId: "elgato", mood: "sleepy", triesLeft: 5, caughtBy: null, ranAway: false }
*/
export function createEncounter(cat, random = Math.random) {
  return {
    catId: cat.id,
    mood: pickMood(random),
    triesLeft: RARITIES[cat.rarity].tries,
    caughtBy: null,
    ranAway: false,
  };
}

export function isOver(encounter) {
  return encounter.caughtBy !== null || encounter.ranAway;
}

// Does this cat eat this treat? Each cat only eats its favorite.
export function likes(cat, treatId) {
  return treatId === cat.favorite;
}

// How much one favorite treat adds to the catch chance.
export function treatBonus(treatId) {
  return TREATS[treatId].bonus + FAVORITE_BONUS;
}

/*
  The catch chance for one attempt, out of 100.
  Step by step: start with the rarity's chance, add the mood's bonus (angry
  takes 30 away), add each favorite treat being offered (its bonus + 10),
  then keep it between 1 and 100. Treats the cat doesn't like add nothing.
  Example: Thinker Cat is legendary (10). It's sleepy (+30). Offer one
  Golden Salmon, its favorite (+30 +10): 10 + 30 + 40 = 80.
  Offer two: 10 + 30 + 40 + 40 = 120, which stops at 100.
*/
export function catchChance(cat, encounter, treatId = null, count = 1) {
  let chance = startingChance(cat, encounter);
  if (treatId && likes(cat, treatId)) chance += treatBonus(treatId) * count;
  return Math.max(MIN_CHANCE, Math.min(chance, MAX_CHANCE));
}

// Rarity + mood, before treats and before keeping it between 1 and 100.
// An angry legendary is 10 - 30 = -20 here.
function startingChance(cat, encounter) {
  return RARITIES[cat.rarity].chance + MOODS[encounter.mood].bonus;
}

// The most favorite treats worth stacking: any more wouldn't raise the
// chance, because it's already at 100. Always at least 1.
// Example: a sleepy Thinker Cat starts at 40. Each Golden Salmon adds 40.
// (100 - 40) / 40 = 1.5, rounded up = 2 Golden Salmon to reach 100.
export function mostUseful(cat, encounter, treatId) {
  const missing = MAX_CHANCE - startingChance(cat, encounter);
  return Math.max(1, Math.ceil(missing / treatBonus(treatId)));
}

/*
  Try to catch the cat. "theRoll" is a number from 1 to 100 (see roll()).
  "count" is how many treats are offered at once (stacking).
  Gives back what happened, so the Discord side can pick the right message:
    { result: "caught",   chance }  - the cat is yours
    { result: "missed",   chance }  - try again (triesLeft went down)
    { result: "rejected" }          - wrong treat: the cat won't eat it.
                                      The player keeps it, but a try is used.
    { result: "ran-away", chance }  - that was the last try
    { result: "over" }              - someone already caught it, or it left
*/
export function tryCatch(encounter, cat, userId, treatId, theRoll, count = 1) {
  if (isOver(encounter)) return { result: "over" };
  encounter.triesLeft -= 1;

  if (treatId && !likes(cat, treatId)) {
    if (encounter.triesLeft <= 0) {
      encounter.ranAway = true;
      return { result: "ran-away", rejected: true };
    }
    return { result: "rejected" };
  }

  const chance = catchChance(cat, encounter, treatId, count);
  if (theRoll <= chance) {
    encounter.caughtBy = userId;
    return { result: "caught", chance };
  }

  if (encounter.triesLeft <= 0) {
    encounter.ranAway = true;
    return { result: "ran-away", chance };
  }
  return { result: "missed", chance };
}

// ---------------------------------------------------------------------------
// PLAYERS' CATS AND TREATS
// A "box" holds everyone's collection, like:
//   { users: { "111": { cats: { elgato: 2 }, treats: { tuna: 3 } } } }
// ---------------------------------------------------------------------------

export function createBox() {
  return { users: {} };
}

// Get someone's collection, making an empty one the first time.
export function player(box, userId) {
  if (!box.users[userId]) box.users[userId] = { cats: {}, treats: {} };
  return box.users[userId];
}

export function addCat(box, userId, catId) {
  const p = player(box, userId);
  p.cats[catId] = (p.cats[catId] || 0) + 1;
  return p.cats[catId];
}

export function addTreat(box, userId, treatId, count = 1) {
  const p = player(box, userId);
  p.treats[treatId] = (p.treats[treatId] || 0) + count;
  return p.treats[treatId];
}

// Use up treats (1 unless a count is given). Gives back false and uses
// nothing if they don't have enough.
export function useTreat(box, userId, treatId, count = 1) {
  const p = player(box, userId);
  if (!Number.isInteger(count) || count <= 0 || (p.treats[treatId] || 0) < count) return false;
  p.treats[treatId] -= count;
  return true;
}

// How many of a treat someone has.
export function treatCount(box, userId, treatId) {
  return player(box, userId).treats[treatId] || 0;
}

// How many different cats someone has found, out of how many exist.
export function discovered(box, userId) {
  const p = player(box, userId);
  const found = CATS.filter((cat) => p.cats[cat.id] > 0).length;
  return { found, total: CATS.length };
}

// ---------------------------------------------------------------------------
// MEWROONS
// These work on the shared bank from src/economy/wallet.js, where mewroons
// are kept as CATcher's game points.
// ---------------------------------------------------------------------------

export function getMewroons(bank, userId) {
  return account(bank, userId).points[MEWROON_KEY] || 0;
}

// Spend mewroons. Gives back false (and spends nothing) if they don't
// have enough, or if the amount isn't a whole number above 0.
export function spendMewroons(bank, userId, amount) {
  const user = account(bank, userId);
  const have = user.points[MEWROON_KEY] || 0;
  if (!Number.isInteger(amount) || amount <= 0 || have < amount) return false;
  user.points[MEWROON_KEY] = have - amount;
  return true;
}
