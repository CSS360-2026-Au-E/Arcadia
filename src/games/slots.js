/*
  SLOT MACHINE GAME RULES

  This file only knows the rules. It does not talk to Discord. The Discord
  side is src/events/slotsInteraction.js, and the rules are tested in
  tests/slots.spec.js.

  How a spin goes: you bet dubloons, three reels spin, and each one stops on
  a symbol. Three of the same symbol pays that symbol's prize. Two cherries
  (in any spots) gives back double your bet. Anything else loses the bet.

  Some symbols come up more often than others. "weight" is how often:
  a symbol with weight 30 shows up 30 times as often as one with weight 1.
  Rare symbols pay more.
*/

// The smallest bet you can make, in dubloons.
export const MIN_BET = 10;

/*
  "pays" is how many times your bet you get back for three in a row,
  counting the bet itself. Bet 10 and hit three 💎 and you get 500 back.
  If you change these, run `npm test`: a test makes sure the machine still
  keeps a little of each bet on average (otherwise everyone gets rich).
*/
export const SYMBOLS = [
  { emoji: "🍒", weight: 30, pays: 7 },
  { emoji: "🍋", weight: 25, pays: 10 },
  { emoji: "🔔", weight: 18, pays: 15 },
  { emoji: "⭐", weight: 12, pays: 25 },
  { emoji: "💎", weight: 8, pays: 50 },
  { emoji: "7️⃣", weight: 4, pays: 100 },
];

// Two cherries anywhere (but not three) gives back this many times your bet.
export const TWO_CHERRIES_PAYS = 2;

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

// Pick one symbol, using the weights. "random" is Math.random unless a test passes its own.
export function spinReel(random = Math.random) {
  let roll = random() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    if (roll < symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// Spin all three reels. Gives back three symbols.
export function spin(random = Math.random) {
  return [spinReel(random), spinReel(random), spinReel(random)];
}

// How many times the bet a spin pays back (0 means you lost).
export function multiplier(reels) {
  const [a, b, c] = reels;
  if (a.emoji === b.emoji && b.emoji === c.emoji) return a.pays;
  const cherries = reels.filter((s) => s.emoji === "🍒").length;
  if (cherries === 2) return TWO_CHERRIES_PAYS;
  return 0;
}

// How many dubloons a spin pays back for this bet.
export function winnings(reels, bet) {
  return bet * multiplier(reels);
}

// "🍒 | 🔔 | 🍒"
export function showReels(reels) {
  return reels.map((s) => s.emoji).join(" | ");
}

/*
  On average, how much of each bet comes back, worked out exactly by going
  through every possible spin. 0.95 means the machine keeps 5 dubloons of
  every 100 bet over time. The tests check it stays under 1.
*/
export function averageReturn() {
  let total = 0;
  for (const a of SYMBOLS) {
    for (const b of SYMBOLS) {
      for (const c of SYMBOLS) {
        const chance = (a.weight * b.weight * c.weight) / TOTAL_WEIGHT ** 3;
        total += chance * multiplier([a, b, c]);
      }
    }
  }
  return total;
}
