import { expect } from "chai";
import {
  createGame,
  double,
  handValue,
  hit,
  isBlackjack,
  newDeck,
  payout,
  showDealer,
  stand,
} from "../src/games/blackjack";

// Build cards from text like "A♠", "10♥".
const cards = (...names) => names.map((n) => ({ rank: n.slice(0, -1), suit: n.slice(-1) }));

// createGame deals player, dealer, player, dealer, then draws from the rest.
// So deal(["10♠","9♠"], ["7♥","K♥"], "5♣") gives you 10 9 and the dealer 7 K.
function deal(player, dealer, ...rest) {
  return cards(player[0], dealer[0], player[1], dealer[1], ...rest);
}

describe("blackjack", () => {
  it("shuffles a full 52-card deck", () => {
    const deck = newDeck();
    expect(deck).to.have.length(52);
    expect(new Set(deck.map((c) => c.rank + c.suit)).size).to.equal(52);
  });

  it("counts aces as 11 or 1", () => {
    expect(handValue(cards("A♠", "K♥"))).to.equal(21);
    expect(handValue(cards("A♠", "A♥", "9♦"))).to.equal(21);
    expect(handValue(cards("A♠", "9♥", "5♦"))).to.equal(15);
    expect(handValue(cards("K♠", "Q♥", "5♦"))).to.equal(25);
    expect(isBlackjack(cards("A♠", "J♥"))).to.equal(true);
    expect(isBlackjack(cards("7♠", "7♥", "7♦"))).to.equal(false);
  });

  it("pays 3 to 2 for a blackjack on the deal", () => {
    const game = createGame("ana", 100, deal(["A♠", "K♠"], ["9♥", "8♥"]));
    expect(game.result).to.equal("blackjack");
    expect(payout(game)).to.equal(250);
  });

  it("hides the dealer's second card until the hand is over", () => {
    const game = createGame("ana", 10, deal(["10♠", "6♠"], ["9♥", "8♥"]));
    expect(showDealer(game)).to.equal("9♥ 🂠");
    stand(game);
    expect(showDealer(game)).to.equal("9♥ 8♥ (17)");
  });

  it("busts when you go over 21", () => {
    const game = createGame("ana", 50, deal(["10♠", "6♠"], ["9♥", "8♥"], "K♣"));
    expect(hit(game)).to.equal("bust");
    expect(payout(game)).to.equal(0);
  });

  it("makes the dealer draw to 17, and pays 2x when the dealer busts", () => {
    const game = createGame("ana", 50, deal(["10♠", "8♠"], ["10♥", "6♥"], "K♣"));
    expect(stand(game)).to.equal("win");
    expect(handValue(game.dealer)).to.equal(26);
    expect(payout(game)).to.equal(100);
  });

  it("gives your bet back on a tie", () => {
    const game = createGame("ana", 50, deal(["10♠", "8♠"], ["10♥", "8♥"]));
    expect(stand(game)).to.equal("push");
    expect(payout(game)).to.equal(50);
  });

  it("doubles the bet for exactly one more card", () => {
    const game = createGame("ana", 50, deal(["6♠", "5♠"], ["10♥", "7♥"], "10♣"));
    expect(double(game)).to.equal("win"); // 21 beats 17
    expect(game.player).to.have.length(3);
    expect(game.bet).to.equal(100);
    expect(payout(game)).to.equal(200);
  });

  it("stands for you when you hit to exactly 21", () => {
    const game = createGame("ana", 10, deal(["10♠", "6♠"], ["10♥", "8♥"], "5♣"));
    expect(hit(game)).to.equal("win");
  });
});
