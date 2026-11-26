import { expect } from "chai";
import { RATES } from "../src/economy/rates";
import { createBank } from "../src/economy/wallet";
import {
  CATS,
  FAVORITE_BONUS,
  MAX_CHANCE,
  MEWROON_KEY,
  MIN_CHANCE,
  MOODS,
  RARITIES,
  TREATS,
  addCat,
  addTreat,
  catchChance,
  createBox,
  createEncounter,
  discovered,
  findCat,
  getMewroons,
  isOver,
  likes,
  mostUseful,
  pickCat,
  pickMood,
  player,
  roll,
  spendMewroons,
  treatBonus,
  treatCount,
  tryCatch,
  useTreat,
} from "../src/games/catcher";

// A fake random function that gives back these numbers in order.
const fakeRandom = (...numbers) => () => numbers.shift();

// A wild cat in a chosen mood.
function encounterFor(catId, mood) {
  const encounter = createEncounter(findCat(catId));
  encounter.mood = mood;
  return encounter;
}

describe("CATcher", () => {
  describe("cats and settings", () => {
    it("gives every cat a real rarity, favorite treat and unique id", () => {
      const ids = CATS.map((cat) => cat.id);
      expect(new Set(ids).size).to.equal(ids.length);
      for (const cat of CATS) {
        expect(RARITIES).to.have.property(cat.rarity);
        expect(TREATS).to.have.property(cat.favorite);
      }
    });

    it("has at least one cat of every rarity", () => {
      for (const rarity of Object.keys(RARITIES)) {
        expect(CATS.some((cat) => cat.rarity === rarity)).to.equal(true);
      }
    });

    it("uses the same numbers for how often a rarity appears and its catch chance", () => {
      for (const r of Object.values(RARITIES)) expect(r.weight).to.equal(r.chance);
    });

    it("converts mewroons to dubloons 1 for 1", () => {
      expect(RATES[MEWROON_KEY].points).to.equal(RATES[MEWROON_KEY].dubloons);
    });
  });

  describe("picking a cat", () => {
    it("picks a common cat for a low roll", () => {
      expect(pickCat(fakeRandom(0.1, 0)).rarity).to.equal("common");
    });

    it("picks a rare cat for a middle roll", () => {
      expect(pickCat(fakeRandom(0.65, 0)).rarity).to.equal("rare");
    });

    it("picks a legendary cat for a high roll", () => {
      expect(pickCat(fakeRandom(0.95, 0)).rarity).to.equal("legendary");
    });

    it("picks the mythical cat for the very top roll", () => {
      expect(pickCat(fakeRandom(0.999, 0)).rarity).to.equal("mythical");
    });

    it("picks every mood", () => {
      expect(pickMood(fakeRandom(0))).to.equal("sleepy");
      expect(pickMood(fakeRandom(0.5))).to.equal("calm");
      expect(pickMood(fakeRandom(0.99))).to.equal("angry");
    });

    it("rolls a whole number from 1 to 100", () => {
      expect(roll(fakeRandom(0))).to.equal(1);
      expect(roll(fakeRandom(0.999))).to.equal(100);
    });
  });

  describe("catch chance", () => {
    const elgato = findCat("elgato"); // common (60), favorite: tuna

    it("adds the mood: sleepy +30, calm +15, angry -30", () => {
      expect(catchChance(elgato, encounterFor("elgato", "sleepy"))).to.equal(60 + MOODS.sleepy.bonus);
      expect(catchChance(elgato, encounterFor("elgato", "calm"))).to.equal(60 + MOODS.calm.bonus);
      expect(catchChance(elgato, encounterFor("elgato", "angry"))).to.equal(60 + MOODS.angry.bonus);
    });

    it("adds the favorite treat's bonus plus 10 extra", () => {
      const calm = encounterFor("elgato", "calm"); // 60 + 15 = 75
      expect(treatBonus("tuna")).to.equal(TREATS.tuna.bonus + FAVORITE_BONUS);
      expect(catchChance(elgato, calm, "tuna")).to.equal(75 + treatBonus("tuna"));
    });

    it("only eats its favorite treat", () => {
      expect(likes(elgato, "tuna")).to.equal(true);
      expect(likes(elgato, "catnip")).to.equal(false);
      // A treat it doesn't like adds nothing.
      const calm = encounterFor("elgato", "calm");
      expect(catchChance(elgato, calm, "catnip")).to.equal(75);
    });

    it("works the docs example: sleepy Thinker Cat with Golden Salmon is 80", () => {
      const thinker = findCat("thinker");
      expect(catchChance(thinker, encounterFor("thinker", "sleepy"), "salmon")).to.equal(80);
    });

    it("adds up stacked treats and stops at 100", () => {
      const thinker = findCat("thinker");
      const sleepy = encounterFor("thinker", "sleepy"); // 10 + 30 = 40
      expect(catchChance(thinker, sleepy, "salmon", 2)).to.equal(MAX_CHANCE); // 40 + 80 = 120
      expect(MAX_CHANCE).to.equal(100);
    });

    it("knows how many treats are worth stacking", () => {
      const thinker = findCat("thinker");
      // 40 to start, +40 each: 2 Golden Salmon reach 100.
      expect(mostUseful(thinker, encounterFor("thinker", "sleepy"), "salmon")).to.equal(2);
      // A calm El Gato starts at 75, +15 each: 2 Tuna reach 100 (75 + 30 = 105).
      expect(mostUseful(elgato, encounterFor("elgato", "calm"), "tuna")).to.equal(2);
      // An angry Full of Soup Cat starts at 10 - 30 = -20, +20 each: 6 Catnip reach 100.
      expect(mostUseful(findCat("soup"), encounterFor("soup", "angry"), "catnip")).to.equal(6);
    });

    it("never goes below 1", () => {
      const soupface = findCat("soupface"); // mythical (1)
      expect(catchChance(soupface, encounterFor("soupface", "angry"))).to.equal(MIN_CHANCE);
    });
  });

  describe("catching", () => {
    it("catches the cat when the roll is at or below the chance", () => {
      const elgato = findCat("elgato");
      const encounter = encounterFor("elgato", "calm");
      const outcome = tryCatch(encounter, elgato, "ana", null, 75);
      expect(outcome.result).to.equal("caught");
      expect(encounter.caughtBy).to.equal("ana");
      expect(isOver(encounter)).to.equal(true);
    });

    it("misses when the roll is too high", () => {
      const elgato = findCat("elgato");
      const encounter = encounterFor("elgato", "calm");
      const outcome = tryCatch(encounter, elgato, "ana", null, 100);
      expect(outcome.result).to.equal("missed");
      expect(encounter.triesLeft).to.equal(RARITIES.common.tries - 1);
    });

    it("runs away after the last try", () => {
      const thinker = findCat("thinker");
      const encounter = encounterFor("thinker", "angry");
      const results = [];
      for (let i = 0; i < RARITIES.legendary.tries; i++) {
        results.push(tryCatch(encounter, thinker, "ana", null, 100).result);
      }
      expect(results.at(-1)).to.equal("ran-away");
      expect(encounter.ranAway).to.equal(true);
    });

    it("rejects the wrong treat: no roll, but a try is used", () => {
      const elgato = findCat("elgato");
      const encounter = encounterFor("elgato", "calm");
      const outcome = tryCatch(encounter, elgato, "ana", "salmon", 1);
      expect(outcome.result).to.equal("rejected");
      expect(encounter.caughtBy).to.equal(null);
      expect(encounter.triesLeft).to.equal(RARITIES.common.tries - 1);
    });

    it("runs away if the last try was a rejected treat", () => {
      const soupface = findCat("soupface"); // 2 tries, likes salmon
      const encounter = encounterFor("soupface", "calm");
      tryCatch(encounter, soupface, "ana", "tuna", 1);
      const outcome = tryCatch(encounter, soupface, "ana", "tuna", 1);
      expect(outcome.result).to.equal("ran-away");
      expect(encounter.ranAway).to.equal(true);
    });

    it("always catches at 100%", () => {
      const thinker = findCat("thinker");
      const encounter = encounterFor("thinker", "sleepy");
      expect(tryCatch(encounter, thinker, "ana", "salmon", 100, 2).result).to.equal("caught");
    });

    it("can't be caught again once it's over", () => {
      const elgato = findCat("elgato");
      const encounter = encounterFor("elgato", "calm");
      tryCatch(encounter, elgato, "ana", null, 1);
      expect(tryCatch(encounter, elgato, "ben", null, 1).result).to.equal("over");
      expect(encounter.caughtBy).to.equal("ana");
    });
  });

  describe("collections, treats and mewroons", () => {
    it("counts each cat you catch", () => {
      const box = createBox();
      addCat(box, "ana", "elgato");
      expect(addCat(box, "ana", "elgato")).to.equal(2);
      expect(discovered(box, "ana")).to.deep.equal({ found: 1, total: CATS.length });
    });

    it("only lets you use treats you have", () => {
      const box = createBox();
      expect(useTreat(box, "ana", "tuna")).to.equal(false);
      addTreat(box, "ana", "tuna", 2);
      expect(useTreat(box, "ana", "tuna")).to.equal(true);
      expect(player(box, "ana").treats.tuna).to.equal(1);
    });

    it("uses stacked treats all at once, or none if you don't have enough", () => {
      const box = createBox();
      addTreat(box, "ana", "salmon", 2);
      expect(useTreat(box, "ana", "salmon", 3)).to.equal(false);
      expect(treatCount(box, "ana", "salmon")).to.equal(2);
      expect(useTreat(box, "ana", "salmon", 2)).to.equal(true);
      expect(treatCount(box, "ana", "salmon")).to.equal(0);
    });

    it("only lets you spend mewroons you have", () => {
      const bank = createBank();
      expect(getMewroons(bank, "ana")).to.equal(0);
      bank.users.ana.points[MEWROON_KEY] = 15;
      expect(spendMewroons(bank, "ana", TREATS.catnip.price)).to.equal(false); // 20 > 15
      expect(spendMewroons(bank, "ana", TREATS.tuna.price)).to.equal(true); // 10
      expect(getMewroons(bank, "ana")).to.equal(5);
      expect(spendMewroons(bank, "ana", -5)).to.equal(false);
    });
  });
});
