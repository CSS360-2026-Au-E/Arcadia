import { expect } from "chai";
import { createGame, checkWinner, botMove, playTurn } from "../src/games/tictactoe";

/*
Extra unit tests for tic tac toe (Bot Project Task 5, job 7).
The first spec file only checks a row win and the hard bot blocking.
These cover the other win lines, the bot winning, the easy bot, and
every result playTurn can return.
*/

describe("tic tac toe edge cases", () => {
  it("starts a new game on hard with an empty board", () => {
    const game = createGame("user1");
    expect(game.difficulty).to.equal("hard");
    expect(game.playerId).to.equal("user1");
    expect(game.board).to.deep.equal(Array(9).fill(" "));
  });

  it("detects a column win", () => {
    expect(checkWinner(["X", " ", " ", "X", " ", " ", "X", " ", " "])).to.equal("X");
  });

  it("detects both diagonal wins", () => {
    expect(checkWinner(["O", " ", " ", " ", "O", " ", " ", " ", "O"])).to.equal("O");
    expect(checkWinner([" ", " ", "X", " ", "X", " ", "X", " ", " "])).to.equal("X");
  });

  it("detects a win for the bot (O)", () => {
    expect(checkWinner([" ", "O", " ", " ", "O", " ", " ", "O", " "])).to.equal("O");
  });

  it("easy bot always picks an open square", () => {
    const board = ["X", "O", "X", " ", "O", "X", "O", " ", "X"];
    for (let i = 0; i < 50; i++) {
      const move = botMove({ board, difficulty: "easy" });
      expect([3, 7]).to.include(move);
    }
  });

  it("hard bot takes a winning square instead of blocking", () => {
    const board = ["O", "O", " ", "X", "X", " ", "X", " ", " "];
    expect(botMove({ board, difficulty: "hard" })).to.equal(2);
  });

  it("returns continue after a normal move and the bot answers once", () => {
    const game = createGame("user1");
    expect(playTurn(game, 0)).to.equal("continue");
    expect(game.board.filter((c) => c === "X")).to.have.length(1);
    expect(game.board.filter((c) => c === "O")).to.have.length(1);
  });

  it("returns lost when the player does not block the bot", () => {
    const game = createGame("user1");
    game.board = [" ", "X", " ", "O", "O", " ", "X", " ", " "];
    expect(playTurn(game, 0)).to.equal("lost");
    expect(game.board[5]).to.equal("O");
  });

  it("returns draw when the last square fills the board with no winner", () => {
    const game = createGame("user1");
    game.board = ["X", "O", "X", "X", "O", "O", "O", "X", " "];
    expect(playTurn(game, 8)).to.equal("draw");
  });

  it("counts a win on the last square as a win, not a draw", () => {
    const game = createGame("user1");
    game.board = ["X", "O", "X", "O", "O", "X", "O", "X", " "];
    expect(playTurn(game, 8)).to.equal("won");
  });
});
