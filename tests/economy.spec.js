import { expect } from "chai";
import { GAME_KEYS, RATES } from "../src/economy/rates";
import {
  STARTING_DUBLOONS,
  account,
  addDubloons,
  addPoints,
  convert,
  createBank,
  exchange,
  getDubloons,
  getPoints,
  leaderboard,
  rankOf,
  spendDubloons,
} from "../src/economy/wallet";
import {
  hangmanPoints,
  hotpotatoPoints,
  minigolfPoints,
  songguessPoints,
  tictactoePoints,
} from "../src/economy/earnings";

describe("dubloon exchange rates", () => {
  // If this fails, someone typed a rate that isn't a whole number above 0.
  for (const key of GAME_KEYS) {
    it(`${key} has a valid rate`, () => {
      const rate = RATES[key];
      expect(rate.name, "name").to.be.a("string").and.not.empty;
      expect(Number.isInteger(rate.points) && rate.points > 0, "points").to.equal(true);
      expect(Number.isInteger(rate.dubloons) && rate.dubloons > 0, "dubloons").to.equal(true);
    });
  }
});

describe("wallet", () => {
  it("starts new players with some dubloons and no points", () => {
    const bank = createBank();
    expect(getDubloons(bank, "ana")).to.equal(STARTING_DUBLOONS);
    expect(getPoints(bank, "ana", "hangman")).to.equal(0);
  });

  it("keeps each game's points separate", () => {
    const bank = createBank();
    addPoints(bank, "ana", "hangman", 120);
    addPoints(bank, "ana", "minigolf", 300);
    addPoints(bank, "ana", "hangman", 40);
    expect(getPoints(bank, "ana", "hangman")).to.equal(160);
    expect(getPoints(bank, "ana", "minigolf")).to.equal(300);
  });

  it("only lets you spend dubloons you have", () => {
    const bank = createBank();
    expect(spendDubloons(bank, "ana", 30)).to.equal(true);
    expect(getDubloons(bank, "ana")).to.equal(STARTING_DUBLOONS - 30);
    expect(spendDubloons(bank, "ana", 1000)).to.equal(false);
    expect(spendDubloons(bank, "ana", -5)).to.equal(false);
    expect(spendDubloons(bank, "ana", 2.5)).to.equal(false);
    expect(getDubloons(bank, "ana")).to.equal(STARTING_DUBLOONS - 30);
  });

  it("exchanges points at a rate and keeps the leftovers", () => {
    expect(exchange(250, { points: 100, dubloons: 10 })).to.deep.equal({ dubloons: 25, used: 250 });
    expect(exchange(105, { points: 100, dubloons: 10 })).to.deep.equal({ dubloons: 10, used: 100 });
    expect(exchange(99, { points: 100, dubloons: 1 })).to.deep.equal({ dubloons: 0, used: 0 });
    // 50 points at 100 -> 3 is 1.5 dubloons, so 1 dubloon for 34 points.
    expect(exchange(50, { points: 100, dubloons: 3 })).to.deep.equal({ dubloons: 1, used: 34 });
  });

  it("converts every game's points into dubloons", () => {
    const bank = createBank();
    const rates = { hangman: { points: 100, dubloons: 10 }, minigolf: { points: 100, dubloons: 5 } };
    addPoints(bank, "ana", "hangman", 160);
    addPoints(bank, "ana", "minigolf", 520);
    const results = convert(bank, "ana", rates);
    expect(results).to.deep.equal([
      { game: "hangman", points: 160, dubloons: 16, left: 0 },
      { game: "minigolf", points: 520, dubloons: 26, left: 0 },
    ]);
    expect(getDubloons(bank, "ana")).to.equal(STARTING_DUBLOONS + 42);
    expect(getPoints(bank, "ana", "hangman")).to.equal(0);
  });

  it("can convert just one game", () => {
    const bank = createBank();
    const rates = { hangman: { points: 100, dubloons: 10 }, minigolf: { points: 100, dubloons: 5 } };
    addPoints(bank, "ana", "hangman", 100);
    addPoints(bank, "ana", "minigolf", 100);
    convert(bank, "ana", rates, "minigolf");
    expect(getPoints(bank, "ana", "hangman")).to.equal(100);
    expect(getPoints(bank, "ana", "minigolf")).to.equal(0);
    expect(getDubloons(bank, "ana")).to.equal(STARTING_DUBLOONS + 5);
  });

  it("ranks one server's players by dubloons", () => {
    const bank = createBank();
    account(bank, "ana", "server1");
    addDubloons(bank, "ben", 500, "server1");
    addDubloons(bank, "cat", 900, "server2"); // a different server
    expect(leaderboard(bank, "server1")).to.deep.equal([
      { id: "ben", dubloons: STARTING_DUBLOONS + 500 },
      { id: "ana", dubloons: STARTING_DUBLOONS },
    ]);
    expect(rankOf(bank, "server1", "ana")).to.equal(2);
    expect(rankOf(bank, "server1", "cat")).to.equal(0);
  });
});

describe("points each game hands out", () => {
  it("hangman: 100 plus 10 for each life left", () => {
    expect(hangmanPoints({ wrong: 0 }, 6)).to.equal(160);
    expect(hangmanPoints({ wrong: 5 }, 6)).to.equal(110);
  });

  it("song guesser: more for shorter clips", () => {
    expect(songguessPoints(0)).to.equal(300);
    expect(songguessPoints(5)).to.equal(50);
    expect(songguessPoints(0)).to.be.greaterThan(songguessPoints(3));
  });

  it("minigolf: points per hole, plus a bonus for the top finishers", () => {
    const players = [
      { id: "ana", strokes: [1, 2] }, // 100 + 60, 1st: +300
      { id: "ben", strokes: [3, 3] }, // 40 + 40, 2nd: +150
      { id: "cat", strokes: [8, 5] }, // 0 + 10, last: no bonus
    ];
    expect(minigolfPoints(players)).to.deep.equal([
      { id: "ana", points: 460 },
      { id: "ben", points: 230 },
      { id: "cat", points: 10 },
    ]);
  });

  it("minigolf: no place bonus when you play alone", () => {
    expect(minigolfPoints([{ id: "ana", strokes: [2, 2] }])).to.deep.equal([{ id: "ana", points: 120 }]);
  });

  it("minigolf: players who tie share the better place", () => {
    const players = [
      { id: "ana", strokes: [2] },
      { id: "ben", strokes: [2] },
      { id: "cat", strokes: [4] },
    ];
    const points = minigolfPoints(players).map((p) => p.points);
    expect(points).to.deep.equal([60 + 300, 60 + 300, 20]);
  });

  it("hot potato: 20 a round survived, 200 for the winner", () => {
    const game = { out: ["ana", "ben", "cat"] };
    expect(hotpotatoPoints(game, "dan")).to.deep.equal([
      { id: "ben", points: 20 },
      { id: "cat", points: 40 },
      { id: "dan", points: 200 + 60 },
    ]);
  });

  it("tic tac toe: wins pay more on harder levels", () => {
    expect(tictactoePoints("easy", "won")).to.equal(50);
    expect(tictactoePoints("hard", "won")).to.equal(300);
    expect(tictactoePoints("hard", "draw")).to.equal(30);
    expect(tictactoePoints("hard", "lost")).to.equal(0);
    expect(tictactoePoints("hard", "continue")).to.equal(0);
  });
});
