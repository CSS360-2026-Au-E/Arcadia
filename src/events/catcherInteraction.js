/*
  CATCHER: THE DISCORD SIDE

  Three commands:
    /explore     a random wild cat appears in the channel, with buttons to catch it
    /catventory  shows your collection, treats and mewroons
    /catshop     buy treats with mewroons (only you see the shop)

  The rules live in src/games/catcher.js. Saving collections and mewroons
  lives in src/games/catcherSave.js.
*/
import fs from "fs";
import path from "path";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import {
  CATS,
  MOODS,
  RARITIES,
  TREATS,
  catchChance,
  createEncounter,
  discovered,
  findCat,
  isOver,
  likes,
  mostUseful,
  pickCat,
  player,
  roll,
  treatBonus,
  tryCatch,
} from "../games/catcher";
import {
  box,
  giveCat,
  giveMewroons,
  giveTreat,
  mewroons,
  spendMewroons,
  takeTreat,
  treatsOwned,
} from "../games/catcherSave";

// ---------------------------------------------------------------------------
// THE SLASH COMMANDS (registered in ready.js)
// ---------------------------------------------------------------------------
export const CATCHER_COMMANDS = [
  new SlashCommandBuilder().setName("explore").setDescription("CATcher: look for a wild cat to catch"),
  new SlashCommandBuilder().setName("catventory").setDescription("CATcher: see your cats, treats and mewroons"),
  new SlashCommandBuilder().setName("catshop").setDescription("CATcher: buy treats with mewroons"),
];

// ---------------------------------------------------------------------------
// SETTINGS AND SMALL HELPERS
// ---------------------------------------------------------------------------

// How long a wild cat waits before wandering off, if nobody catches it.
const CAT_STAYS_SECONDS = 90;

// Where the cat drawings go, named like elgato-sleepy.png or elgato.png
const ART_FOLDER = path.join(process.cwd(), "assets", "catcher");

// Mentions show a name but never ping anyone.
const quiet = { allowedMentions: { parse: [] } };
const mention = (userId) => `<@${userId}>`;

// "🐾 25 mewroons"
const mewroonText = (amount) => `🐾 ${amount.toLocaleString("en-US")} mewroon${amount === 1 ? "" : "s"}`;

// The wild cat in each channel:
// channel ID -> { encounter, round, message, timer, explorerId, hasPicture }
// "round" goes up every time a new cat appears, so treat buttons from an
// old cat can't be used on a new one.
const wildCats = new Map();
let nextRound = 1;

// The cat's picture for its mood. Looks for elgato-sleepy.png first, then
// the plain elgato.png. If neither exists, it's null and the message shows
// the cat's emoji instead.
function catPicture(cat, mood) {
  for (const name of [`${cat.id}-${mood}.png`, `${cat.id}.png`]) {
    const file = path.join(ART_FOLDER, name);
    if (fs.existsSync(file)) return new AttachmentBuilder(file, { name });
  }
  return null;
}

// "⚪ Common"
const rarityText = (cat) => `${RARITIES[cat.rarity].emoji} ${RARITIES[cat.rarity].name}`;

// "😴 Sleepy (+30)" or "😾 Angry (-30)"
function moodText(moodKey) {
  const mood = MOODS[moodKey];
  const sign = mood.bonus > 0 ? "+" : "";
  return `${mood.emoji} ${mood.name} (${sign}${mood.bonus})`;
}

// "✨ Golden Salmon" or "2 ✨ Golden Salmon"
function treatText(treatId, count = 1) {
  const t = TREATS[treatId];
  return `${count > 1 ? `${count} ` : ""}${t.emoji} ${t.name}`;
}

// ---------------------------------------------------------------------------
// THE WILD CAT MESSAGE
// ---------------------------------------------------------------------------

// One row of buttons: pspsps (no treat), one button per treat, and skip.
// The button ID says what to do, like "catcher:catch:tuna".
function catButtons(disabled = false) {
  const none = new ButtonBuilder()
    .setCustomId("catcher:catch:none")
    .setLabel("Pspsps")
    .setEmoji("🫳")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);

  const treats = Object.entries(TREATS).map(([id, treat]) =>
    new ButtonBuilder()
      .setCustomId(`catcher:catch:${id}`)
      .setLabel(treat.name)
      .setEmoji(treat.emoji)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );

  const skip = new ButtonBuilder()
    .setCustomId("catcher:skip")
    .setLabel("Skip")
    .setEmoji("⏭️")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabled);

  return [new ActionRowBuilder().addComponents(none, ...treats, skip)];
}

// The text of the wild cat message. "lastTry" is a line about the most
// recent attempt, if there was one.
function wildCatText(cat, encounter, explorerId, hasPicture, lastTry = "") {
  const lines = [
    `${hasPicture ? "🐾" : cat.emoji} ${mention(explorerId)} found a wild **${cat.name}**! ${rarityText(cat)}`,
    `Mood: **${moodText(encounter.mood)}**`,
    `*${cat.hint}*`,
    `Catch chance: **${catchChance(cat, encounter)}%** with pspsps · Tries left: **${encounter.triesLeft}**`,
  ];
  if (lastTry) lines.push("", lastTry);
  lines.push(
    "",
    "Try pspsps, or offer the treat this cat likes. It rejects any other treat: you keep it, but it uses a try.",
    "You can stack its favorite treat to raise your chance, all the way to 100%. Buy treats with `/catshop`.",
    `Only ${mention(explorerId)} can skip this cat.`
  );
  return lines.join("\n");
}

// Pick a new cat and build everything the message needs.
function newWildCat(explorerId) {
  const cat = pickCat();
  const encounter = createEncounter(cat);
  const picture = catPicture(cat, encounter.mood);
  return {
    cat,
    encounter,
    picture,
    message: {
      content: wildCatText(cat, encounter, explorerId, Boolean(picture)),
      files: picture ? [picture] : [],
      components: catButtons(),
      ...quiet,
    },
  };
}

// If nobody catches the cat in time, it wanders off.
function startTimer(channelId, encounter, cat, message) {
  return setTimeout(async () => {
    const state = wildCats.get(channelId);
    if (!state || state.encounter !== encounter) return;
    wildCats.delete(channelId);
    encounter.ranAway = true;
    try {
      await message.edit({
        content: `💨 The **${cat.name}** got bored and wandered off. Use \`/explore\` to find another cat.`,
        components: catButtons(true),
      });
    } catch (error) {
      console.error("CATcher: could not edit the wild cat message:", error.message);
    }
  }, CAT_STAYS_SECONDS * 1000);
}

// Put a new wild cat in the channel's slot and start its timer.
function placeCat(channelId, explorerId, message, cat, encounter, picture) {
  wildCats.set(channelId, {
    encounter,
    round: nextRound++,
    message,
    explorerId,
    hasPicture: Boolean(picture),
    timer: startTimer(channelId, encounter, cat, message),
  });
}

// ---------------------------------------------------------------------------
// /explore
// ---------------------------------------------------------------------------
async function explore(interaction) {
  // Only one wild cat per channel at a time.
  if (wildCats.has(interaction.channelId)) {
    await interaction.reply({
      content: "A wild cat is already here! Try catching it, or the explorer can skip it. 🐾",
      ephemeral: true,
    });
    return;
  }

  const explorerId = interaction.user.id;
  const { cat, encounter, picture, message: content } = newWildCat(explorerId);
  await interaction.reply(content);
  // Get the real message, so button clicks can be matched to this cat.
  // (Newer discord.js ignores reply's old fetchReply option.)
  const message = await interaction.fetchReply();
  placeCat(interaction.channelId, explorerId, message, cat, encounter, picture);
}

// ---------------------------------------------------------------------------
// THE SKIP BUTTON: the explorer swaps this cat for a new one
// ---------------------------------------------------------------------------
async function skip(interaction) {
  const state = wildCats.get(interaction.channelId);
  if (!state || state.message.id !== interaction.message.id || isOver(state.encounter)) {
    await interaction.reply({ content: "This cat isn't here anymore. Use `/explore` to find another.", ephemeral: true });
    return;
  }

  // Only the person who found the cat can skip it.
  if (interaction.user.id !== state.explorerId) {
    await interaction.reply({ content: `Only ${mention(state.explorerId)} can skip this cat.`, ephemeral: true, ...quiet });
    return;
  }

  // The old cat leaves, and a new one takes its place in the same message.
  clearTimeout(state.timer);
  state.encounter.ranAway = true;

  const { cat, encounter, picture, message: content } = newWildCat(state.explorerId);
  // attachments: [] removes the old cat's picture before adding the new one.
  await interaction.update({ ...content, attachments: [] });
  placeCat(interaction.channelId, state.explorerId, state.message, cat, encounter, picture);
}

// ---------------------------------------------------------------------------
// ONE TRY: roll, then build the new wild cat message
// Used by pspsps, wrong treats and the Throw button. "treatId" is null for
// pspsps. Gives back the message to show, or null if the cat is already gone.
// ---------------------------------------------------------------------------
function takeATry(channelId, guildId, userId, treatId, count) {
  const state = wildCats.get(channelId);
  if (!state || isOver(state.encounter)) return null;

  const { encounter, explorerId, hasPicture } = state;
  const cat = findCat(encounter.catId);
  const theRoll = roll();
  const outcome = tryCatch(encounter, cat, userId, treatId, theRoll, count);
  const offered = treatId ? `offered ${treatText(treatId, count)}` : "tried pspsps";
  const finished = (content) => {
    clearTimeout(state.timer);
    wildCats.delete(channelId);
    return { content, components: catButtons(true), ...quiet };
  };

  if (outcome.result === "caught") {
    const countNow = giveCat(userId, cat.id);
    const earned = RARITIES[cat.rarity].mewroons;
    giveMewroons(userId, earned, guildId);
    const extra = countNow > 1 ? ` (you now have ${countNow})` : " (new to your collection!)";
    const yum = treatId ? " It's this cat's favorite! 💖" : "";
    return finished(
      `💕 ${mention(userId)} ${offered}.${yum}\n` +
        `The **${cat.name}** headbutts their hand. **Caught!** ${rarityText(cat)}${extra}\n` +
        `+${mewroonText(earned)}. See your cats with \`/catventory\`.`
    );
  }

  // What happened on this try, in one line.
  let tryLine;
  if (outcome.result === "rejected" || outcome.rejected) {
    tryLine = `🙅 ${mention(userId)} ${offered}. The **${cat.name}** sniffed it and turned away. (They kept the treat.)`;
  } else {
    // A roll within 10 of the chance counts as "so close".
    const close = theRoll - outcome.chance <= 10 ? " So close!" : "";
    tryLine = `😿 ${mention(userId)} ${offered}. Rolled **${theRoll}**, needed **${outcome.chance}** or less.${close}`;
  }

  if (outcome.result === "ran-away") {
    return finished(`${tryLine}\n🙀 The **${cat.name}** hissed and ran away! Use \`/explore\` to find another.`);
  }

  // The cat is still here: show the tries left.
  return {
    content: wildCatText(cat, encounter, explorerId, hasPicture, tryLine),
    components: catButtons(),
    ...quiet,
  };
}

// The same cat that this button was made for? (Not caught, not skipped.)
function sameCat(state, round) {
  return state && !isOver(state.encounter) && state.round === round;
}

const goneText = "This cat isn't here anymore. Use `/explore` to find another.";

// ---------------------------------------------------------------------------
// THE PSPSPS AND TREAT BUTTONS on the wild cat message
// ---------------------------------------------------------------------------
async function tryToCatch(interaction, treatId) {
  const state = wildCats.get(interaction.channelId);

  // The button belongs to a cat that's already gone.
  if (!state || state.message.id !== interaction.message.id || isOver(state.encounter)) {
    await interaction.reply({ content: goneText, ephemeral: true });
    return;
  }

  const userId = interaction.user.id;

  // Pspsps: no treat, roll right away.
  if (treatId === "none") {
    await interaction.update(takeATry(interaction.channelId, interaction.guildId, userId, null, 1));
    return;
  }

  // A treat. They need at least one to offer it.
  const owned = treatsOwned(userId, treatId);
  if (owned === 0) {
    await interaction.reply({
      content: `You don't have any ${treatText(treatId)}. Buy some with \`/catshop\`.`,
      ephemeral: true,
    });
    return;
  }

  // The wrong treat: the cat rejects it. They keep the treat, but it uses a try.
  const cat = findCat(state.encounter.catId);
  if (!likes(cat, treatId)) {
    await interaction.update(takeATry(interaction.channelId, interaction.guildId, userId, treatId, 1));
    return;
  }

  // The right treat! Ask (privately) how many to stack before throwing.
  await interaction.reply({ ...stackPicker(state, cat, userId, treatId, 1), ephemeral: true });
}

// ---------------------------------------------------------------------------
// STACKING: the private "how many?" picker
// Button IDs look like "catcher:stack:<round>:<treat>:<count>".
// ---------------------------------------------------------------------------
function stackPicker(state, cat, userId, treatId, count) {
  const owned = treatsOwned(userId, treatId);
  // The most they can stack: what they own, and no more than reaches 100%.
  const most = Math.min(owned, mostUseful(cat, state.encounter, treatId));
  count = Math.max(1, Math.min(count, most));
  const chance = catchChance(cat, state.encounter, treatId, count);
  const id = (action, n) => `catcher:${action}:${state.round}:${treatId}:${n}`;

  const less = new ButtonBuilder()
    .setCustomId(id("stack", count - 1))
    .setEmoji("➖")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(count <= 1);
  const more = new ButtonBuilder()
    .setCustomId(id("stack", count + 1))
    .setEmoji("➕")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(count >= most);
  const toss = new ButtonBuilder()
    .setCustomId(id("throw", count))
    .setLabel(`Throw ${count}`)
    .setEmoji(TREATS[treatId].emoji)
    .setStyle(ButtonStyle.Success);
  const cancel = new ButtonBuilder()
    .setCustomId(id("cancel", count))
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);

  const lines = [
    `💖 The **${cat.name}** perks up. It likes ${treatText(treatId)}!`,
    `You have **${owned}**. Each one adds **+${treatBonus(treatId)}%**.`,
    `Offering **${count}** → catch chance **${chance}%**`,
  ];
  if (count >= most && chance >= 100) lines.push("That's a sure catch. More treats wouldn't help.");

  return { content: lines.join("\n"), components: [new ActionRowBuilder().addComponents(less, more, toss, cancel)] };
}

// ➖ / ➕ / Throw / Cancel on the private picker
async function stackButton(interaction, action, round, treatId, count) {
  const state = wildCats.get(interaction.channelId);
  if (!sameCat(state, round)) {
    await interaction.update({ content: goneText, components: [] });
    return;
  }
  const cat = findCat(state.encounter.catId);
  const userId = interaction.user.id;

  // The picker only exists for the cat's favorite treat.
  if (!likes(cat, treatId)) {
    await interaction.update({ content: goneText, components: [] });
    return;
  }

  if (action === "cancel") {
    await interaction.update({ content: "You put your treats away.", components: [] });
    return;
  }

  if (action === "stack") {
    await interaction.update(stackPicker(state, cat, userId, treatId, count));
    return;
  }

  // Throw: take all the treats at once (or none, if they no longer have enough).
  if (!takeTreat(userId, treatId, count)) {
    await interaction.update({
      content: `You don't have ${treatText(treatId, count)} anymore. Buy more with \`/catshop\`.`,
      components: [],
    });
    return;
  }
  const result = takeATry(interaction.channelId, interaction.guildId, userId, treatId, count);
  await interaction.update({ content: `You threw ${treatText(treatId, count)}!`, components: [] });
  try {
    await state.message.edit(result);
  } catch (error) {
    console.error("CATcher: could not edit the wild cat message:", error.message);
  }
}

// ---------------------------------------------------------------------------
// /catventory
// ---------------------------------------------------------------------------
export function collectionText(userId) {
  const p = player(box, userId);
  const { found, total } = discovered(box, userId);
  const lines = [`🐾 **${mention(userId)}'s catventory** (${found}/${total} found)`];

  // One line per rarity. Cats you haven't found show as ???
  for (const [rarity, r] of Object.entries(RARITIES)) {
    const cats = CATS.filter((cat) => cat.rarity === rarity).map((cat) =>
      p.cats[cat.id] ? `${cat.emoji} ${cat.name} ×${p.cats[cat.id]}` : "❔ ???"
    );
    lines.push(`${r.emoji} **${r.name}:** ${cats.join(" · ")}`);
  }

  const treats = Object.entries(TREATS)
    .filter(([id]) => p.treats[id] > 0)
    .map(([id, t]) => `${t.emoji} ${t.name} ×${p.treats[id]}`);
  lines.push(
    "",
    `**Treats:** ${treats.length ? treats.join(" · ") : "none yet. Buy some with `/catshop`."}`,
    `**Wallet:** ${mewroonText(mewroons(userId))}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// /catshop and its buy buttons
// ---------------------------------------------------------------------------
function shopText(userId, status = "") {
  const p = player(box, userId);
  const lines = [
    "🛒 **CATcher Treat Shop**",
    `You have ${mewroonText(mewroons(userId))}. Earn more by catching cats.`,
    "",
    ...Object.entries(TREATS).map(
      ([id, t]) => `${t.emoji} **${t.name}**: ${t.price} mewroons, +${treatBonus(id)}% catch chance each (you have ${p.treats[id] || 0})`
    ),
    "",
    "Each cat only eats its favorite treat, so watch for hints! Stack several on one try for a bigger chance.",
  ];
  if (status) lines.push("", status);
  return lines.join("\n");
}

function shopButtons() {
  return [
    new ActionRowBuilder().addComponents(
      ...Object.entries(TREATS).map(([id, t]) =>
        new ButtonBuilder()
          .setCustomId(`catcher:buy:${id}`)
          .setLabel(`Buy (${t.price})`)
          .setEmoji(t.emoji)
          .setStyle(ButtonStyle.Success)
      )
    ),
  ];
}

async function buy(interaction, treatId) {
  const userId = interaction.user.id;
  const treat = TREATS[treatId];

  // spendMewroons() only takes them if the player has enough.
  let status;
  if (spendMewroons(userId, treat.price)) {
    giveTreat(userId, treatId);
    status = `✅ Bought 1 ${treat.emoji} ${treat.name}!`;
  } else {
    status = `❌ You need ${treat.price} mewroons for ${treat.name}. Catch more cats to earn them.`;
  }

  await interaction.update({ content: shopText(userId, status), components: shopButtons() });
}

// ---------------------------------------------------------------------------
// THE EVENT: every slash command and button click comes through here.
// ---------------------------------------------------------------------------
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "explore") await explore(interaction);
        if (interaction.commandName === "catventory") {
          await interaction.reply({ content: collectionText(interaction.user.id), ...quiet });
        }
        if (interaction.commandName === "catshop") {
          await interaction.reply({
            content: shopText(interaction.user.id),
            components: shopButtons(),
            ephemeral: true, // only you see your shop
          });
        }
        return;
      }

      // Buttons: "catcher:catch:tuna", "catcher:skip", "catcher:buy:tuna",
      // and the stacking picker's "catcher:stack:<round>:<treat>:<count>"
      // (also "throw" and "cancel").
      if (interaction.isButton() && interaction.customId.startsWith("catcher:")) {
        const [, action, value, treatId, count] = interaction.customId.split(":");
        if (action === "catch" && (value === "none" || TREATS[value])) await tryToCatch(interaction, value);
        if (action === "skip") await skip(interaction);
        if (action === "buy" && TREATS[value]) await buy(interaction, value);
        if (["stack", "throw", "cancel"].includes(action) && TREATS[treatId]) {
          await stackButton(interaction, action, Number(value), treatId, Number(count));
        }
      }
    } catch (error) {
      console.error("CATcher error:", error);
    }
  },
};

export default event;
