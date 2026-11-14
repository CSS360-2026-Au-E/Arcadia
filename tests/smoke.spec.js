/*
  SMOKE TEST

  A smoke test is a quick "does it turn on?" check. It doesn't test every
  little rule (the other test files do that). It just runs the main thing
  each part of the bot does, once, and makes sure nothing crashes and the
  answer makes sense. If this file fails, something big is broken.

  It checks:
    1. Every file in src/events/ loads, so the bot can start.
    2. Every game can be played from start to finish.
    3. Points can be turned into dubloons.

  None of this talks to Discord, so it runs without a bot token.
  Run it with: npm test
*/
import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";

import * as hangman from "../src/games/hangman";
import * as hotpotato from "../src/games/hotpotato";
import * as tictactoe from "../src/games/tictactoe";
import * as slots from "../src/games/slots";
import * as poker from "../src/games/poker";
import * as songguess from "../src/games/songguess";
import * as minigolf from "../src/games/minigolf";
import * as horserace from "../src/games/horserace";
import * as wallet from "../src/economy/wallet";
import { RATES } from "../src/economy/rates";

describe("smoke test", () => {
  // ---------------------------------------------------------------------------
  // 1. THE BOT CAN START
  // ---------------------------------------------------------------------------

  it("loads every event file with a name and an execute function", () => {
    // Some event files open the dubloons file when they load. Point them at a
    // throwaway file in the computer's temp folder so the test never touches real dubloons.
    process.env.DUBLOONS_FILE = path.join(os.tmpdir(), `arcadia-smoke-${Date.now()}.json`);

    const folder = path.join(__dirname, "..", "src", "events");
    const files = fs.readdirSync(folder).filter((file) => file.endsWith(".js"));
    expect(files.length).to.be.greaterThan(0);

    for (const file of files) {
      // require() loads the file the same way src/helpers/loadEvents.js does.
      const event = require(path.join(folder, file)).default;
      expect(event, file).to.be.an("object");
      expect(event.name, file).to.be.a("string");
      expect(event.execute, file).to.be.a("function");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. EVERY GAME CAN BE PLAYED
  // ---------------------------------------------------------------------------

  it("plays hangman to a win", () => {
    const game = hangman.createGame("cat");
    expect(hangman.guess(game, "c")).to.equal("hit");
    expect(hangman.guess(game, "a")).to.equal("hit");
    expect(hangman.guess(game, "t")).to.equal("won");
  });

  it("plays hot potato until one player is left", () => {
    const game = hotpotato.createGame();
    hotpotato.join(game, "ana");
    hotpotato.join(game, "ben");
    expect(hotpotato.canStart(game)).to.equal(true);

    const holder = hotpotato.startRound(game);
    const other = holder === "ana" ? "ben" : "ana";
    expect(hotpotato.pass(game, holder, other)).to.equal("passed");

    hotpotato.explode(game); // "other" was holding it
    expect(hotpotato.isOver(game)).to.equal(true);
    expect(hotpotato.winner(game)).to.equal(holder);
  });

  it("plays a turn of tic tac toe and the bot answers", () => {
    const game = tictactoe.createGame("ana", "hard");
    expect(tictactoe.playTurn(game, 4)).to.equal("continue");
    // The player's X and the bot's O are both on the board now.
    expect(game.board.filter((square) => square !== " ")).to.have.length(2);
  });

  it("spins the slot machine", () => {
    const reels = slots.spin();
    expect(reels).to.have.length(3);
    expect(slots.winnings(reels, slots.MIN_BET)).to.be.at.least(0);
  });

  it("deals, draws and pays out a hand of poker", () => {
    const game = poker.createGame("ana", poker.MIN_BET);
    expect(game.hand).to.have.length(5);
    poker.toggleHold(game, 0);
    poker.draw(game);
    expect(poker.isOver(game)).to.equal(true);
    expect(poker.payout(game)).to.be.at.least(0);
  });

  it("checks a song guess", () => {
    // No internet here: we make up the song instead of asking Deezer for one.
    const game = songguess.createGame({ title: "Bohemian Rhapsody - Remastered 2011" });
    expect(songguess.isCorrectGuess(game, "bohemian rhapsody")).to.equal(true);
    expect(songguess.isCorrectGuess(game, "yellow submarine")).to.equal(false);
  });

  it("plays a hole of minigolf", () => {
    // "chaos" mode skips placing traps, so we can shoot right away.
    const game = minigolf.createGame({ hostId: "ana", mode: "chaos", holes: 3 });
    expect(minigolf.addPlayer(game, "ana", "Ana")).to.equal(null);
    expect(minigolf.startHole(game)).to.equal(true);

    // Keep shooting until the hole is over. MAX_STROKES stops it from going forever.
    let holeOver = false;
    for (let shot = 0; shot < minigolf.MAX_STROKES && !holeOver; shot++) {
      holeOver = minigolf.shoot(game, 0, 2).holeOver;
    }
    expect(holeOver).to.equal(true);
    expect(minigolf.winners(game)).to.have.length(1);
  });

  it("runs a horse race from bets to payout", () => {
    const wallets = new Map();
    const game = horserace.createGame();
    expect(horserace.placeBet(game, wallets, "ana", 0)).to.equal("placed");

    while (horserace.finishers(game).length === 0) horserace.moveHorses(game);
    const winner = horserace.pickWinner(game);
    const results = horserace.payOut(game, wallets, winner);

    expect(winner).to.be.within(0, horserace.HORSES.length - 1);
    expect(results).to.have.length(1);
    expect(results[0].coins).to.be.at.least(0);
  });

  // ---------------------------------------------------------------------------
  // 3. THE DUBLOON ECONOMY WORKS
  // ---------------------------------------------------------------------------

  it("turns game points into dubloons", () => {
    const bank = wallet.createBank();
    wallet.addPoints(bank, "ana", "hangman", 200);
    const results = wallet.convert(bank, "ana", RATES);

    expect(results).to.have.length(1);
    expect(wallet.getDubloons(bank, "ana")).to.be.greaterThan(wallet.STARTING_DUBLOONS);
  });
});
