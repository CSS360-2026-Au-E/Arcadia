# How the blackjack code works

Blackjack is one player against the dealer, betting dubloons (see [how dubloons work](how-dubloons-work.md)). Get closer to 21 than the dealer without going over.

## The files

| File | What it does |
|---|---|
| `src/games/blackjack.js` | The rules: the deck, adding up a hand, hit, stand, double, and the payout. No Discord. |
| `src/events/blackjackInteraction.js` | The Discord side: the `/blackjack` command and the Hit, Stand and Double buttons. |
| `tests/blackjack.spec.js` | Checks hand values, aces, the dealer's rule, doubling and every payout. |

## How one hand goes

1. You type `/blackjack bet:50`. The bet comes out of your dubloons right away. If you don't have enough, the bot says so and nothing starts. The smallest bet is 10.
2. `createGame()` shuffles a deck and deals you two cards and the dealer two. One dealer card stays face down (🂠).
3. If you or the dealer has blackjack (an ace and a 10-value card), the hand ends right away.
4. You click **Hit** to take a card, **Stand** to stop, or **Double** to double your bet and take exactly one more card. Double only works on your first two cards and only if you can afford it.
5. If you go over 21 you bust and lose. If you reach exactly 21 you stand on your own.
6. When you stand, the dealer flips their card and takes cards until they have 17 or more.
7. `payout()` works out what you get back and the bot adds it to your dubloons.

If nobody clicks for 3 minutes, the bot stands for you and finishes the hand.

## Card values

Number cards are worth their number. J, Q and K are worth 10. An ace is worth 11, unless that would put you over 21, then it's worth 1. `handValue()` handles this by counting every ace as 11, then turning them into 1s one at a time while the hand is over 21.

## Payouts

These are how much you get back, counting your bet:

| Result | You get back | Bet 20, get |
|---|---|---|
| Blackjack | 2.5x | 50 |
| Win | 2x | 40 |
| Push (tie) | 1x | 20 |
| Lose or bust | 0 | 0 |

## Change how it feels

- `MIN_BET` in `blackjack.js` is the smallest bet.
- `PAYOUTS` in `blackjack.js` sets what each result pays.
- `DEALER_STANDS_ON` in `blackjack.js` is where the dealer stops taking cards (17).

## Try it

- `npm test` runs `tests/blackjack.spec.js`.
- `npm start`, then type `/blackjack bet:20` in your server.
