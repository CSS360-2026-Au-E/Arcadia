import { expect } from "chai";
import { SYMBOLS, averageReturn, multiplier, showReels, spin, spinReel, winnings } from "../src/games/slots";

const symbol = (emoji) => SYMBOLS.find((s) => s.emoji === emoji);
const reels = (...emojis) => emojis.map(symbol);

describe("slots", () => {
  it("picks symbols by weight", () => {
    expect(spinReel(() => 0).emoji).to.equal("🍒"); // the very start of the cherries
    expect(spinReel(() => 0.999).emoji).to.equal("7️⃣"); // the very end, the rarest
    expect(spin(() => 0.5)).to.have.length(3);
  });

  it("pays the symbol's prize for three in a row", () => {
    expect(multiplier(reels("💎", "💎", "💎"))).to.equal(symbol("💎").pays);
    expect(winnings(reels("7️⃣", "7️⃣", "7️⃣"), 10)).to.equal(10 * symbol("7️⃣").pays);
  });

  it("gives back double for two cherries, and nothing for a miss", () => {
    expect(multiplier(reels("🍒", "🔔", "🍒"))).to.equal(2);
    expect(multiplier(reels("🍋", "🔔", "⭐"))).to.equal(0);
    expect(multiplier(reels("🍋", "🍋", "⭐"))).to.equal(0);
  });

  it("keeps a little of each bet on average, so nobody gets rich for free", () => {
    const average = averageReturn();
    expect(average).to.be.below(1);
    expect(average).to.be.above(0.85); // but not a rip-off either
  });

  it("shows the reels", () => {
    expect(showReels(reels("🍒", "🔔", "🍒"))).to.equal("🍒 | 🔔 | 🍒");
  });
});
