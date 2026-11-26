# How the CATcher code works

CATcher is a cat-collecting game. Someone types `/explore` and a random wild
cat appears in a random mood. Anyone in the channel can try to catch it with
pspsps or a treat, and the person who found it can skip it for a new cat.
Each cat only eats its **favorite** treat and rejects the rest. Players can
stack several favorite treats on one try. Each try rolls a number from 1 to
100, and the cat is caught if the roll is at or below its catch chance.
Caught cats go into your collection (`/catventory`, which also shows your
treats and mewroons), and catching earns **mewroons**, CATcher's own
currency. Mewroons buy treats in `/catshop`, and `/convert` turns them into
dubloons, 1 for 1.

## The files

| File | What it does |
| --- | --- |
| `src/games/catcher.js` | The rules: cats, rarities, moods, treats, picking a cat, catch chance, catching, collections, spending mewroons. No Discord code. |
| `src/games/catcherSave.js` | Saves everyone's cats and treats to `data/catcher.json`. Mewroons are saved in the shared bank (`data/dubloons.json`) as CATcher's game points. |
| `src/events/catcherInteraction.js` | `/explore`, `/catventory`, `/catshop`, and the catch, skip and buy buttons. |
| `src/events/ready.js` | Adds the three commands to every server. |
| `src/economy/rates.js` | CATcher's rate: 1 mewroon = 1 dubloon. |
| `assets/catcher/` | The cat drawings, one PNG per cat and mood (see its README). |
| `tests/catcher.spec.js` | 28 tests for the rules. |

## Rarities

The same numbers decide how often a rarity appears and how likely it is to
be caught. They add up to 101, so a mythical cat shows up about once every
101 explores.

| Rarity | How often | Starting catch chance | Tries before it runs | Mewroons for catching |
| --- | --- | --- | --- | --- |
| Common | 60 | 60% | 5 | 5 |
| Rare | 30 | 30% | 4 | 10 |
| Legendary | 10 | 10% | 3 | 20 |
| Mythical | 1 | 1% | 2 | 50 |

## Cats

| Cat | Rarity | Favorite treat |
| --- | --- | --- |
| El Gato | Common | Tuna |
| Know-It-All Nerd Cat | Common | Catnip |
| 1000 Stare Cat | Rare | Tuna |
| Clapping Hand Cat | Rare | Catnip |
| Thinker Cat | Legendary | Golden Salmon |
| Full of Soup Cat | Legendary | Catnip |
| Cat with White Soup on Face | Mythical | Golden Salmon |

## Moods and treats

Each cat gets a random mood: **Sleepy +30**, **Calm +15** or **Angry −30**.

| Treat | Price | Bonus for each one the cat eats |
| --- | --- | --- |
| 🐟 Tuna | 10 mewroons | +15 (5 + 10 favorite bonus) |
| 🌿 Catnip | 20 mewroons | +20 (10 + 10 favorite bonus) |
| ✨ Golden Salmon | 100 mewroons | +40 (30 + 10 favorite bonus) |

- **Only the favorite works.** The hint under the cat's name gives a clue.
- **Wrong treat:** the cat sniffs it and turns away. The player keeps the
  treat, but the try is used up (no roll).
- **Stacking:** clicking the right treat opens a private picker (➖ ➕) to
  choose how many to throw on one try. The picker stops at the number that
  reaches 100%, or at how many the player owns. The treats are only used
  when the player presses **Throw**.

## Catch chance, step by step

1. Start with the rarity's chance.
2. Add the mood's bonus (angry takes 30 away).
3. Add the bonus for each favorite treat thrown.
4. Keep the result between 1 and 100. 1 means no cat is impossible, and
   100 means a sure catch.

Example: Thinker Cat is legendary (10) and sleepy (+30), so it starts at 40.
One Golden Salmon (+40) makes it 80. Two make it 120, which stops at **100**.

Another: an angry Full of Soup Cat starts at 10 − 30 = −20. It takes 6
Catnip (+20 each) to reach 100.

## Design choices

- **Rules are separate from Discord**, like the other games. `pickCat`,
  `pickMood` and `roll` take a `random` function so the tests can pass in
  fixed numbers.
- **One wild cat per channel**, and only the explorer can skip it, so one
  player can't flood a channel or skip someone else's find.
- **Mewroons are CATcher's game points** in the shared bank, so `/points`
  and `/convert` already work with them. The shop spends them directly.
- **Collections are saved to their own file.** If `data/catcher.json` can't
  be read, a copy is saved as `catcher.json.broken` before anything
  overwrites it (CODE_ANALYSIS.md, threat model #3).
- **The shop is private** (only you see it), but catching happens in the
  open so everyone can watch.
- **Art matches the mood.** The bot shows `thinker-sleepy.png` for a sleepy
  Thinker Cat. If that file is missing it uses `thinker.png`, and a cat with
  no picture at all shows its emoji. The Dockerfile
  copies `assets/` so the pictures also work in the deployed bot.

## Limitations

- A wild cat lives in memory, so restarting the bot makes it disappear.
  Collections, treats and mewroons are saved.
- `/convert` with no game picked converts every game's points, including
  mewroons. Players who want to keep mewroons for treats should convert one
  game at a time.
- Like the dubloons file, `data/catcher.json` is lost when the Docker
  container is replaced, unless the data folder is kept outside it
  (threat model #8).
