/*
  MINIGOLF CHAOS CARDS

  Every player holds 3 cards and can play one per hole, on their turn,
  before they shoot. Some cards help you, some mess with one other
  player, and some change the hole for everyone.

  Cards only change the `effects` the physics reads (see
  minigolfPhysics.js), or move balls around. "Next shot" effects are
  used up by the next shot; "this hole" effects last until the hole ends.
*/

export const HAND_SIZE = 3;

export const CARDS = {
  mulligan: { name: "Mulligan", emoji: "↩️", who: "you", text: "Redo your last shot" },
  superPutt: { name: "Super putt", emoji: "💪", who: "you", text: "Your next shot rolls 60% further" },
  ghost: { name: "Ghost ball", emoji: "👻", who: "you", text: "Your next shot goes through walls" },
  magnet: { name: "Magnet cup", emoji: "🧲", who: "you", text: "The cup pulls your ball in from nearby this hole" },
  mirror: { name: "Mirror", emoji: "🪞", who: "someone", text: "Their next shot goes the opposite way they aim" },
  tinyCup: { name: "Tiny cup", emoji: "🤏", who: "someone", text: "Their ball must stop right on the cup this hole" },
  ice: { name: "Ice rink", emoji: "🧊", who: "someone", text: "Their ball slides twice as far this hole" },
  swap: { name: "Swap", emoji: "🔄", who: "someone", text: "Swap ball spots with them" },
  gravityFlip: { name: "Gravity flip", emoji: "🙃", who: "everyone", text: "Slopes push the other way this hole" },
  wind: { name: "Wind gust", emoji: "💨", who: "everyone", text: "Every shot drifts right this hole" },
  bigCup: { name: "Big cup", emoji: "🪣", who: "everyone", text: "Every cup gets bigger this hole" },
  shuffle: { name: "Shuffle", emoji: "🔀", who: "everyone", text: "Everyone passes their hand to the next player" },
};

export function drawCard(random = Math.random) {
  const keys = Object.keys(CARDS);
  return keys[Math.floor(random() * keys.length)];
}

// Top a player's hand back up. Last place gets one extra card to catch up.
export function refillHand(player, size = HAND_SIZE, random = Math.random) {
  while (player.hand.length < size) player.hand.push(drawCard(random));
}

/*
  Play the card at `index` in the player's hand.
  `target` is the other player, for "someone" cards.
  Returns { text } saying what happened, or { error } if it can't be played.
*/
export function playCard(game, player, index, target = null) {
  const key = player.hand[index];
  const card = CARDS[key];
  if (!card) return { error: "That card isn't in your hand anymore." };
  if (player.playedCard) return { error: "You already played a card this hole." };
  if (card.who === "someone" && (!target || target === player)) return { error: "Pick another player for that card." };

  let text = `${player.name} played **${card.name}**`;

  if (key === "mulligan") {
    const last = player.lastShot;
    if (!last || last.hole !== game.holeIndex) return { error: "You haven't shot yet this hole, so there's nothing to redo." };
    player.ball = { ...last.from };
    player.strokes[game.holeIndex] = last.strokesBefore;
    player.lastShot = null;
    text += " and takes their last shot back!";
  } else if (key === "superPutt") {
    player.effects.superPutt = true;
    text += ". Their next shot rolls way further!";
  } else if (key === "ghost") {
    player.effects.ghost = true;
    text += ". Their next shot goes through walls!";
  } else if (key === "magnet") {
    player.effects.cup = "magnet";
    text += ". Their cup is magnetic this hole!";
  } else if (key === "mirror") {
    target.effects.mirror = true;
    text += ` on ${target.name}! Their next shot goes the opposite way.`;
  } else if (key === "tinyCup") {
    target.effects.cup = "tiny";
    text += ` on ${target.name}! Their ball has to stop right on the cup.`;
  } else if (key === "ice") {
    target.effects.ice = true;
    text += ` on ${target.name}! Their ball slides twice as far this hole.`;
  } else if (key === "swap") {
    if (target.done) return { error: `${target.name} already finished this hole, so you can't swap with them.` };
    [player.ball, target.ball] = [target.ball, player.ball];
    text += ` and swapped spots with ${target.name}!`;
  } else if (key === "gravityFlip") {
    game.holeEffects.gravityFlip = !game.holeEffects.gravityFlip;
    text += ". Slopes push the other way this hole!";
  } else if (key === "wind") {
    game.holeEffects.wind = true;
    text += ". Every shot drifts right this hole!";
  } else if (key === "bigCup") {
    for (const p of game.players) if (p.effects.cup !== "magnet") p.effects.cup = "big";
    text += ". Every cup is bigger this hole!";
  }

  player.hand.splice(index, 1);
  player.playedCard = true;

  if (key === "shuffle") {
    // Everyone hands their cards to the next player in the list.
    const hands = game.players.map((p) => p.hand);
    game.players.forEach((p, i) => {
      p.hand = hands[(i - 1 + hands.length) % hands.length];
    });
    text += ". Everyone passed their hand to the next player!";
  }

  return { text };
}
