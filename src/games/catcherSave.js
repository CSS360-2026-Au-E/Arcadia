/*
  CATCHER: SAVING EVERYONE'S CATS, TREATS AND MEWROONS

  catcher.js has the rules. This file keeps the one real "box" of everyone's
  cats and treats in memory and writes it to data/catcher.json after every
  change, so collections survive a restart. It works the same way as
  src/economy/bank.js, and the data folder is already in .gitignore.
*/
import fs from "fs";
import path from "path";
import * as catcher from "./catcher";
import { awardPoints, bank, save as saveBank } from "../economy/bank";

// Where the box is saved. CATCHER_FILE in .env can point somewhere else.
const FILE = process.env.CATCHER_FILE || path.join(process.cwd(), "data", "catcher.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return catcher.createBox(); // first run, no file yet

    // The file exists but can't be read. Keep a copy before anything
    // overwrites it, so nobody's collection is lost for good
    // (CODE_ANALYSIS.md, threat model #3).
    console.error(`Could not read ${FILE}. Saving a copy as ${FILE}.broken:`, error.message);
    try {
      fs.copyFileSync(FILE, `${FILE}.broken`);
    } catch (copyError) {
      console.error("Could not copy the broken file:", copyError.message);
    }
    return catcher.createBox();
  }
}

export const box = load();

// Write to a temporary file first, then swap it in, so a crash halfway
// through saving can't leave a broken file behind.
export function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const temp = `${FILE}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(box, null, 2));
    fs.renameSync(temp, FILE);
  } catch (error) {
    console.error("Could not save CATcher data:", error.message);
  }
}

// Helpers for the Discord side. Each one changes the box, then saves it.
export function giveCat(userId, catId) {
  const count = catcher.addCat(box, userId, catId);
  save();
  return count;
}

export function giveTreat(userId, treatId, count = 1) {
  const total = catcher.addTreat(box, userId, treatId, count);
  save();
  return total;
}

export function takeTreat(userId, treatId, count = 1) {
  const ok = catcher.useTreat(box, userId, treatId, count);
  if (ok) save();
  return ok;
}

export function treatsOwned(userId, treatId) {
  return catcher.treatCount(box, userId, treatId);
}

// ---------------------------------------------------------------------------
// Mewroons live in the shared bank (src/economy/bank.js) as CATcher's game
// points, so /points and /convert already know about them.
// ---------------------------------------------------------------------------
export function mewroons(userId) {
  return catcher.getMewroons(bank, userId);
}

export function giveMewroons(userId, amount, serverId = null) {
  return awardPoints(userId, catcher.MEWROON_KEY, amount, serverId);
}

export function spendMewroons(userId, amount) {
  const ok = catcher.spendMewroons(bank, userId, amount);
  if (ok) saveBank();
  return ok;
}
