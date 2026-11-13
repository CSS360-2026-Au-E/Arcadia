/*
  THE BANK THE BOT USES, SAVED TO A FILE

  wallet.js has the rules. This file keeps the one real bank in memory and
  writes it to data/dubloons.json after every change, so dubloons and game
  points survive a restart. The data folder is in .gitignore, so nobody's
  balance ends up in the repo.

  Every game's Discord code uses these helpers instead of touching the file.
*/
import fs from "fs";
import path from "path";
import { RATES } from "./rates";
import * as wallet from "./wallet";

// Where the bank is saved. DUBLOONS_FILE in .env can point somewhere else.
const FILE = process.env.DUBLOONS_FILE || path.join(process.cwd(), "data", "dubloons.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${FILE}, starting a new bank:`, error.message);
    return wallet.createBank();
  }
}

export const bank = load();

// Write to a temporary file first, then swap it in, so a crash halfway
// through saving can't leave a broken file behind.
export function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const temp = `${FILE}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(bank, null, 2));
    fs.renameSync(temp, FILE);
  } catch (error) {
    console.error("Could not save dubloons:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Helpers for the game files. Each one changes the bank, then saves it.
// ---------------------------------------------------------------------------

// Give game points to one player. Gives back their new total for that game.
export function awardPoints(userId, game, points, serverId = null) {
  const total = wallet.addPoints(bank, userId, game, points, serverId);
  save();
  return total;
}

export function getDubloons(userId) {
  return wallet.getDubloons(bank, userId);
}

export function spend(userId, amount, serverId = null) {
  const ok = wallet.spendDubloons(bank, userId, amount, serverId);
  if (ok) save();
  return ok;
}

export function payDubloons(userId, amount, serverId = null) {
  const balance = wallet.addDubloons(bank, userId, amount, serverId);
  save();
  return balance;
}

export function convertPoints(userId, game = null, serverId = null) {
  const results = wallet.convert(bank, userId, RATES, game, serverId);
  if (results.length > 0) save();
  return results;
}

/*
  Horse race keeps its coins in a Map (wallets.get / wallets.set).
  This object acts like that Map but reads and writes dubloons, so the
  horse race rules didn't have to change.
*/
export function dubloonWallets(serverId = null) {
  return {
    has: () => true,
    get: (userId) => wallet.account(bank, userId, serverId).dubloons,
    set: (userId, amount) => {
      wallet.account(bank, userId, serverId).dubloons = amount;
      save();
    },
  };
}

// "🪙 1,250 dubloons"
export function dubloonText(amount) {
  return `🪙 ${amount.toLocaleString("en-US")} dubloon${amount === 1 ? "" : "s"}`;
}
