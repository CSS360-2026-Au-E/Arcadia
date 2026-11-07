import { expect } from "chai";
import { createGame, checkWinner, botMove, playTurn } from "../src/games/tictactoe";

describe("tic tac toe", () => {
  it("detects a row win", () => {
    expect(checkWinner(["X", "X", "X", " ", " ", " ", " ", " ", " "])).to.equal("X");
  });

  it("detects a draw", () => {
    expect(checkWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).to.equal("draw");
  });

  it("returns null while the game is still going", () => {
    expect(checkWinner(Array(9).fill(" "))).to.equal(null);
  });

  it("rejects a taken square", () => {
    const game = createGame("user1");
    game.board[4] = "O";
    expect(playTurn(game, 4)).to.equal("invalid");
  });

  it("lets the player win", () => {
    const game = createGame("user1");
    game.board = ["X", "X", " ", "O", "O", " ", " ", " ", " "];
    expect(playTurn(game, 2)).to.equal("won");
  });

  it("hard bot blocks an obvious win", () => {
    const game = createGame("user1", "hard");
    game.board = ["X", "X", " ", " ", "O", " ", " ", " ", " "];
    expect(botMove(game)).to.equal(2);
  });
});
