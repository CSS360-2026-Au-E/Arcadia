import { expect } from "chai";
import { PAYOUTS, createGame, draw, payout, scoreHand, toggleHold } from "../src/games/poker";

// Build cards from text like "A♠", "10♥".
const cards = (...names) => names.map((n) => ({ rank: n.slice(0, -1), suit: n.slice(-1) }));

describe("video poker", () => {
  it("scores every kind of hand", () => {
    expect(scoreHand(cards("10♠", "J♠", "Q♠", "K♠", "A♠"))).to.equal("royalFlush");
    expect(scoreHand(cards("5♥", "6♥", "7♥", "8♥", "9♥"))).to.equal("straightFlush");
    expect(scoreHand(cards("9♠", "9♥", "9♦", "9♣", "2♠"))).to.equal("fourOfAKind");
    expect(scoreHand(cards("K♠", "K♥", "K♦", "4♣", "4♠"))).to.equal("fullHouse");
    expect(scoreHand(cards("2♦", "7♦", "9♦", "J♦", "K♦"))).to.equal("flush");
    expect(scoreHand(cards("6♠", "7♥", "8♦", "9♣", "10♠"))).to.equal("straight");
    expect(scoreHand(cards("Q♠", "Q♥", "Q♦", "4♣", "7♠"))).to.equal("threeOfAKind");
    expect(scoreHand(cards("3♠", "3♥", "8♦", "8♣", "K♠"))).to.equal("twoPair");
    expect(scoreHand(cards("J♠", "J♥", "3♦", "6♣", "9♠"))).to.equal("jacksOrBetter");
    expect(scoreHand(cards("2♠", "5♥", "8♦", "J♣", "K♠"))).to.equal("nothing");
  });

  it("only pays a pair of jacks or higher", () => {
    expect(scoreHand(cards("10♠", "10♥", "3♦", "6♣", "9♠"))).to.equal("nothing");
    expect(scoreHand(cards("A♠", "A♥", "3♦", "6♣", "9♠"))).to.equal("jacksOrBetter");
  });

  it("counts A-2-3-4-5 as a straight, but not Q-K-A-2-3", () => {
    expect(scoreHand(cards("A♠", "2♥", "3♦", "4♣", "5♠"))).to.equal("straight");
    expect(scoreHand(cards("Q♠", "K♥", "A♦", "2♣", "3♠"))).to.equal("nothing");
  });

  it("swaps only the cards you didn't hold", () => {
    const deck = cards("J♠", "J♥", "2♦", "5♣", "9♠", "J♦", "4♥", "4♠");
    const game = createGame("111", 20, deck);
    toggleHold(game, 0);
    toggleHold(game, 1);
    toggleHold(game, 4);
    toggleHold(game, 4); // clicked twice: not held any more
    expect(draw(game)).to.equal("fullHouse");
    expect(game.hand.map((c) => c.rank + c.suit)).to.deep.equal(["J♠", "J♥", "J♦", "4♥", "4♠"]);
    expect(payout(game)).to.equal(20 * PAYOUTS.fullHouse);
  });

  it("can't change holds or draw twice after the hand is over", () => {
    const game = createGame("111", 10, cards("2♠", "5♥", "8♦", "J♣", "K♠", "3♥", "3♦", "3♣", "3♠", "7♥"));
    expect(draw(game)).to.equal("fourOfAKind"); // nothing held, so all 5 are swapped
    toggleHold(game, 0);
    expect(game.held[0]).to.equal(false);
    expect(draw(game)).to.equal("fourOfAKind"); // a second draw changes nothing
    expect(game.hand.map((c) => c.rank + c.suit)).to.deep.equal(["3♥", "3♦", "3♣", "3♠", "7♥"]);
  });

  it("pays nothing for a losing hand and the bet back for jacks or better", () => {
    expect(PAYOUTS.nothing).to.equal(0);
    expect(PAYOUTS.jacksOrBetter).to.equal(1);
  });
});
