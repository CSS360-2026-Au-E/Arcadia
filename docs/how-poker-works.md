# How the poker code works

`/poker` is video poker, the "Jacks or Better" kind you see on casino machines. It's one player against the pay table, betting dubloons (see [how dubloons work](how-dubloons-work.md)).

## The files

| File | What it does |
|---|---|
| `src/games/poker.js` | The rules: dealing, holding, drawing, scoring a hand, and the pay table. No Discord. |
| `src/events/pokerInteraction.js` | The Discord side: the `/poker` command, the Hold buttons, Draw and Play again. |
| `tests/poker.spec.js` | Checks every kind of hand, the jacks-or-better rule, low straights, holding and the payout. |

## How one hand goes

1. You type `/poker bet:20`. The bet comes out of your dubloons right away. The smallest bet is 10.
2. `createGame()` shuffles a deck with `newDeck()` and deals you 5 cards. Each card is a button.
3. Click a card to **hold** it. It turns green and says HELD. Click it again to let it go.
4. Click **Draw**. `draw()` swaps every card you didn't hold for a new one from the deck.
5. `scoreHand()` names your final hand and `payout()` pays you from the pay table.
6. **Play again** deals a new hand with the same bet.

If you don't click Draw within 3 minutes, the bot draws for you with whatever you held.

## Scoring a hand

`scoreHand()` turns the cards into numbers (J is 11, Q 12, K 13, A 14) and counts how many of each rank there are. Two of one rank and two of another is two pair. Three and two is a full house. Four of one rank is four of a kind. It also checks whether all five cards are the same suit (a flush) and whether they're five in a row (a straight). A-2-3-4-5 counts as a straight, with the ace low.

## The pay table

How many times your bet you get back, counting the bet itself:

| Hand | Pays | Bet 10, get |
|---|---|---|
| Royal Flush (10 J Q K A, same suit) | 250x | 2,500 |
| Straight Flush | 50x | 500 |
| Four of a Kind | 25x | 250 |
| Full House | 8x | 80 |
| Flush | 5x | 50 |
| Straight | 4x | 40 |
| Three of a Kind | 3x | 30 |
| Two Pair | 2x | 20 |
| Pair of jacks, queens, kings or aces | 1x | 10 (your bet back) |
| Anything else | 0 | 0 |

These are the "8/5" numbers many real machines use. Even with perfect play the machine pays back about 96 dubloons for every 100 bet, so the house wins slowly.

## Change how it feels

- `MIN_BET` in `poker.js` is the smallest bet.
- `PAYOUTS` in `poker.js` is the pay table. Raising the full house to 9 and the flush to 6 makes the game close to break-even for a perfect player, so be careful.

## Try it

- `npm test` runs `tests/poker.spec.js`.
- `npm start`, then type `/poker bet:10` in your server.
