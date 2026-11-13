/*
  VIDEO POKER GAME RULES (Jacks or Better)

  This file only knows the rules of video poker. It does not talk to Discord.
  The Discord side is src/events/pokerInteraction.js, and the rules are
  tested in tests/poker.spec.js.

  How a hand goes, like a video poker machine in a casino:
    1. You bet dubloons and get 5 cards.
    2. Pick which cards to HOLD. You can hold any of them, all of them, or none.
    3. Click Draw. Every card you didn't hold is swapped for a new one.
    4. Your final 5 cards are scored on the pay table (PAYOUTS below).
       The worst hand that pays is a pair of jacks or better, which is
       where the name comes from. A pair of 10s or lower pays nothing.

  A "game" is a plain object:
    {
      playerId: "111",
      bet: 20,                          // dubloons on the table
      deck: [card, ...],                // cards left to draw
      hand: [card, card, card, card, card],
      held: [false, false, false, false, false],
      result: null,                     // set after the draw, a key of PAYOUTS
    }
  A card is { rank: "A", suit: "♠" }.
*/
export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// A fresh 52-card deck, shuffled. "random" is Math.random unless a test passes its own.
export function newDeck(random = Math.random) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit });
  }
  // Fisher-Yates shuffle: swap each card with a random card at or before it.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// The smallest bet you can make, in dubloons.
export const MIN_BET = 10;

/*
  The pay table. The number is how many times your bet you get back,
  counting the bet itself. So a pair of jacks gives your bet back, and two
  pair doubles it. These are the "8/5" numbers many real machines use:
  played perfectly, the machine pays back about 96 dubloons for every 100 bet,
  so the house still wins slowly.
*/
export const PAYOUTS = {
  royalFlush: 250,
  straightFlush: 50,
  fourOfAKind: 25,
  fullHouse: 8,
  flush: 5,
  straight: 4,
  threeOfAKind: 3,
  twoPair: 2,
  jacksOrBetter: 1,
  nothing: 0,
};

// How each hand is written in a message.
export const HAND_NAMES = {
  royalFlush: "Royal Flush",
  straightFlush: "Straight Flush",
  fourOfAKind: "Four of a Kind",
  fullHouse: "Full House",
  flush: "Flush",
  straight: "Straight",
  threeOfAKind: "Three of a Kind",
  twoPair: "Two Pair",
  jacksOrBetter: "Jacks or Better",
  nothing: "Nothing",
};

// A card's rank as a number: 2 to 10, then J=11, Q=12, K=13, A=14.
export function rankValue(card) {
  const faces = { J: 11, Q: 12, K: 13, A: 14 };
  return faces[card.rank] ?? Number(card.rank);
}

/*
  Score 5 cards. Gives back a key of PAYOUTS, like "fullHouse".
  We count how many of each rank there are. [3, 2] means a full house,
  [4, 1] four of a kind, and so on.
*/
export function scoreHand(hand) {
  const values = hand.map(rankValue).sort((a, b) => a - b);
  const counts = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const groups = Object.values(counts).sort((a, b) => b - a); // like [2, 2, 1]

  const flush = hand.every((card) => card.suit === hand[0].suit);
  const allDifferent = groups.length === 5;
  // A straight is 5 ranks in a row. A-2-3-4-5 counts too (the ace is low there).
  const wheel = values.join() === "2,3,4,5,14";
  const straight = allDifferent && (values[4] - values[0] === 4 || wheel);

  if (straight && flush) return values[0] === 10 ? "royalFlush" : "straightFlush";
  if (groups[0] === 4) return "fourOfAKind";
  if (groups[0] === 3 && groups[1] === 2) return "fullHouse";
  if (flush) return "flush";
  if (straight) return "straight";
  if (groups[0] === 3) return "threeOfAKind";
  if (groups[0] === 2 && groups[1] === 2) return "twoPair";
  if (groups[0] === 2) {
    const pairValue = Number(Object.keys(counts).find((v) => counts[v] === 2));
    if (pairValue >= 11) return "jacksOrBetter";
  }
  return "nothing";
}

// Start a hand: shuffle and deal 5 cards. The test can pass its own deck.
export function createGame(playerId, bet, deck = newDeck()) {
  const hand = deck.splice(0, 5);
  return { playerId, bet, deck, hand, held: [false, false, false, false, false], result: null };
}

export function isOver(game) {
  return game.result !== null;
}

// Hold a card, or let it go if it was already held. "index" is 0 to 4.
export function toggleHold(game, index) {
  if (isOver(game)) return;
  game.held[index] = !game.held[index];
}

// Swap every card that isn't held, then score the hand.
export function draw(game) {
  if (isOver(game)) return game.result;
  game.hand = game.hand.map((card, i) => (game.held[i] ? card : game.deck.shift()));
  game.result = scoreHand(game.hand);
  return game.result;
}

// How many dubloons the player gets back.
export function payout(game) {
  return game.bet * PAYOUTS[game.result];
}

// The hand as text, like "A♠ K♠ 10♥ 4♦ 4♣".
export function showHand(hand) {
  return hand.map((card) => `\`${card.rank}${card.suit}\``).join(" ");
}

// The pay table as text, for the first message.
export function payTableText() {
  return Object.keys(PAYOUTS)
    .filter((key) => PAYOUTS[key] > 0)
    .map((key) => `${HAND_NAMES[key]} ${PAYOUTS[key]}x`)
    .join(" · ");
}
