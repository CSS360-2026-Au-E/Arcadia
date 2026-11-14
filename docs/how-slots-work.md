# How the slots code works

Slots is a three-reel slot machine that bets dubloons (see [how dubloons work](how-dubloons-work.md)).

## The files

| File | What it does |
|---|---|
| `src/games/slots.js` | The rules: the symbols, spinning the reels, and the payout. No Discord. |
| `src/events/slotsInteraction.js` | The Discord side: the `/slots` command, the reels stopping one at a time, and the **Spin again** button. |
| `tests/slots.spec.js` | Checks the payouts and that the machine pays back about 95% over time. |

## How one spin goes

1. You type `/slots bet:20`. The bet comes out of your dubloons. The smallest bet is 10.
2. `spin()` picks three symbols. Each reel is picked on its own, and some symbols come up more often than others.
3. The bot edits its message so the reels stop one at a time, left to right.
4. `winnings()` works out the prize and adds it to your dubloons.
5. **Spin again** spins with the same bet.

## Symbols and payouts

| Symbol | How often (out of 97) | Three in a row pays |
|---|---|---|
| 🍒 Cherry | 30 | 7x |
| 🍋 Lemon | 25 | 10x |
| 🔔 Bell | 18 | 15x |
| ⭐ Star | 12 | 25x |
| 💎 Diamond | 8 | 50x |
| 7️⃣ Seven | 4 | 100x |

Two cherries anywhere pays 2x. Everything else loses the bet.

## Why it pays back 95%

`averageReturn()` adds up every possible spin and how often it happens. With these numbers a player gets back about 95 dubloons for every 100 they bet, so the house wins slowly, like a real machine. A test checks it stays between 85% and 100%. If you change a weight or a payout, run `npm test` to make sure the machine can't be beaten.

## Try it

- `npm test` runs `tests/slots.spec.js`.
- `npm start`, then type `/slots bet:10` in your server.
