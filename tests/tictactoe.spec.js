import { createGame, checkWinner, botMove, playTurn } from "../src/games/tictactoe";

describe("tic tac toe", () => {
  it("detects a row win", () => {
    expect(checkWinner(["X", "X", "X", " ", " ", " ", " ", " ", " "])).toBe("X");
  });

  it("detects a draw", () => {
    expect(checkWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");
  });

  it("returns null while the game is still going", () => {
    expect(checkWinner(Array(9).fill(" "))).toBe(null);
  });

  it("rejects a taken square", () => {
    const game = createGame("user1");
    game.board[4] = "O";
    expect(playTurn(game, 4)).toBe("invalid");
  });

  it("lets the player win", () => {
    const game = createGame("user1");
    game.board = ["X", "X", " ", "O", "O", " ", " ", " ", " "];
    expect(playTurn(game, 2)).toBe("won");
  });

  it("hard bot blocks an obvious win", () => {
    const game = createGame("user1", "hard");
    game.board = ["X", "X", " ", " ", "O", " ", " ", " ", " "];
    expect(botMove(game)).toBe(2);
  });
});