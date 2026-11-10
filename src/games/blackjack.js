/*
  BLACKJACK GAME RULES

  This file only knows the rules of blackjack. It does not talk to Discord.
  The Discord side is src/events/blackjackInteraction.js, and the rules are
  tested in tests/blackjack.spec.js.

  How a hand goes:
    1. You bet dubloons. You and the dealer each get two cards. One of the
       dealer's cards is face down.
    2. Get as close to 21 as you can without going over. Hit takes another
       card. Stand keeps what you have. Double doubles your bet, takes exactly
       one more card, and stands.
    3. Then the dealer flips their hidden card and takes cards until they
       have 17 or more.
    4. Closer to 21 wins. Going over 21 is a "bust" and loses right away.

  Card values: 2 to 10 are worth their number, J Q K are 10, and an ace is
  11 unless that would put you over 21, then it's 1.

  A "game" is a plain object:
    {
      playerId: "111",
      bet: 50,                  // dubloons on the table (doubles if you Double)
      deck: [card, ...],        // cards left to draw
      player: [card, card],     // your hand
      dealer: [card, card],     // the dealer's hand; dealer[1] is face down
      result: null,             // set when the hand is over, see RESULTS
    }
  A card is { rank: "A", suit: "♠" }.
*/

export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// The smallest bet you can make, in dubloons.
export const MIN_BET = 10;

// The dealer keeps taking cards until they have at least this much.
export const DEALER_STANDS_ON = 17;

/*
  How each result pays. The number is how many times your bet you get back,
  counting the bet itself:
    blackjack (21 with your first two cards) gets back 2.5x: your bet plus 1.5x
    win gets back 2x: your bet plus the same again
    push (a tie) gets your bet back
    lose and bust get nothing back
*/
export const PAYOUTS = { blackjack: 2.5, win: 2, push: 1, lose: 0, bust: 0 };

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

// The best total for a hand. Aces count 11 until that would bust, then 1.
export function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10; // count one ace as 1 instead of 11
    aces -= 1;
  }
  return total;
}

// 21 with exactly two cards.
export function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

// Deal a new hand. If the deck isn't given, shuffle a new one.
export function createGame(playerId, bet, deck = newDeck()) {
  const game = { playerId, bet, deck: [...deck], player: [], dealer: [], result: null };
  game.player.push(draw(game));
  game.dealer.push(draw(game));
  game.player.push(draw(game));
  game.dealer.push(draw(game));

  // A blackjack on the deal ends the hand right away.
  if (isBlackjack(game.player) || isBlackjack(game.dealer)) settle(game);
  return game;
}

function draw(game) {
  return game.deck.shift();
}

export function isOver(game) {
  return game.result !== null;
}

// Doubling is only allowed on your first two cards.
export function canDouble(game) {
  return !isOver(game) && game.player.length === 2;
}

// Take one card. Gives back "bust" if you went over 21, otherwise "continue".
// Reaching exactly 21 stands for you automatically.
export function hit(game) {
  if (isOver(game)) return game.result;
  game.player.push(draw(game));
  const total = handValue(game.player);
  if (total > 21) {
    game.result = "bust";
    return "bust";
  }
  if (total === 21) return stand(game);
  return "continue";
}

// Stop taking cards. The dealer plays, and the hand is decided.
export function stand(game) {
  if (isOver(game)) return game.result;
  while (handValue(game.dealer) < DEALER_STANDS_ON) game.dealer.push(draw(game));
  return settle(game);
}

// Double the bet, take one card, then stand. The caller takes the extra
// dubloons from the player first (see canDouble).
export function double(game) {
  if (!canDouble(game)) return game.result;
  game.bet *= 2;
  game.player.push(draw(game));
  if (handValue(game.player) > 21) {
    game.result = "bust";
    return "bust";
  }
  return stand(game);
}

// Compare the hands and decide the result.
function settle(game) {
  const you = handValue(game.player);
  const dealer = handValue(game.dealer);

  if (isBlackjack(game.player) && !isBlackjack(game.dealer)) game.result = "blackjack";
  else if (isBlackjack(game.dealer) && !isBlackjack(game.player)) game.result = "lose";
  else if (you > 21) game.result = "bust";
  else if (dealer > 21 || you > dealer) game.result = "win";
  else if (you === dealer) game.result = "push";
  else game.result = "lose";
  return game.result;
}

// How many dubloons go back to the player. Only call this once the hand is over.
export function payout(game) {
  return Math.floor(game.bet * (PAYOUTS[game.result] ?? 0));
}

// "A♠ 10♥"
export function showHand(hand) {
  return hand.map((card) => `${card.rank}${card.suit}`).join(" ");
}

// The dealer's hand with the second card face down until the hand is over.
export function showDealer(game) {
  if (isOver(game)) return `${showHand(game.dealer)} (${handValue(game.dealer)})`;
  return `${showHand([game.dealer[0]])} 🂠`;
}
