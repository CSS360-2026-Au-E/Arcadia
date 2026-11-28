import { expect } from "chai";
import { RATES } from "../src/economy/rates";
import {
  hangmanPoints,
  hotpotatoPoints,
  tictactoePoints,
  mbtiPoints,
} from "../src/economy/earnings";

// Whole dubloons a number of game points is worth at that game's rate.
// (Leftover points stay in the game, so this rounds down.)
function dubloonsFor(game, points) {
  const rate = RATES[game];
  return Math.floor((points * rate.dubloons) / rate.points);
}

describe("dubloon rates for each game", () => {
  it("hangman: 100 points = 10 dubloons, so a win is 10 to 16", () => {
    expect(dubloonsFor("hangman", 100)).to.equal(10);
    expect(dubloonsFor("hangman", hangmanPoints({ wrong: 6 }, 6))).to.equal(10);
    expect(dubloonsFor("hangman", hangmanPoints({ wrong: 0 }, 6))).to.equal(16);
  });

  it("hot potato: 10 points = 1 dubloon, so a win is 30 and playing is 10", () => {
    expect(dubloonsFor("hotpotato", 10)).to.equal(1);
    const [win, played] = hotpotatoPoints({ out: ["ana"] }, "ben");
    expect(dubloonsFor("hotpotato", win.points)).to.equal(30);
    expect(dubloonsFor("hotpotato", played.points)).to.equal(10);
  });

  it("tic tac toe: 100 points = 1 dubloon, so a hard win is 3", () => {
    expect(dubloonsFor("tictactoe", 100)).to.equal(1);
    expect(dubloonsFor("tictactoe", tictactoePoints("hard", "won"))).to.equal(3);
    expect(dubloonsFor("tictactoe", tictactoePoints("medium", "won"))).to.equal(1);
  });

  it("CATcher: 1 mewroon = 1 dubloon", () => {
    expect(dubloonsFor("catcher", 1)).to.equal(1);
    expect(dubloonsFor("catcher", 50)).to.equal(50);
  });

  it("personality quiz: finishing is 100 points = 1 dubloon", () => {
    expect(mbtiPoints()).to.equal(100);
    expect(dubloonsFor("mbti", mbtiPoints())).to.equal(1);
  });

  it("horse race has no rate because you bet dubloons on it directly", () => {
    expect(RATES).to.not.have.property("horserace");
  });
});
