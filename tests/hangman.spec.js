import { expect } from "chai";
import {
  MAX_WRONG,
  createGame,
  guess,
  isWon,
  hiddenWord,
  WORDS,
  wrongLetters,
} from "../src/games/hangman";

describe("hangman", () => {
  it("starts with every letter hidden", () => {
    const game = createGame("pixel");
    expect(hiddenWord(game)).to.equal("_ _ _ _ _");
  });

  it("picks a random word from the word list", () => {
    expect(WORDS).to.include(createGame().word);
  });

  it("reveals every copy of a correct letter", () => {
    const game = createGame("puzzle");
    expect(guess(game, "z")).to.equal("hit");
    expect(hiddenWord(game)).to.equal("_ _ z z _ _");
  });

  it("is case insensitive", () => {
    const game = createGame("pixel");
    expect(guess(game, "P")).to.equal("hit");
  });

  it("counts wrong guesses and lists them", () => {
    const game = createGame("pixel");
    expect(guess(game, "z")).to.equal("miss");
    expect(game.wrong).to.equal(1);
    expect(wrongLetters(game)).to.deep.equal(["z"]);
  });

  it("does not count repeats or non letters", () => {
    const game = createGame("pixel");
    guess(game, "z");
    expect(guess(game, "z")).to.equal("repeat");
    expect(guess(game, "7")).to.equal("invalid");
    expect(guess(game, "ab")).to.equal("invalid");
    expect(game.wrong).to.equal(1);
  });

  it("is won when every letter is found", () => {
    const game = createGame("ninja");
    guess(game, "n");
    guess(game, "i");
    guess(game, "j");
    expect(guess(game, "a")).to.equal("won");
    expect(isWon(game)).to.equal(true);
  });

  it(`is lost after ${MAX_WRONG} wrong guesses`, () => {
    const game = createGame("pixel");
    const misses = ["a", "b", "c", "d", "f", "g"];
    const outcomes = misses.map((letter) => guess(game, letter));
    expect(outcomes.pop()).to.equal("lost");
    expect(outcomes.every((o) => o === "miss")).to.equal(true);
  });
});
