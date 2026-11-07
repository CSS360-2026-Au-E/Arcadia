/*
  HOT POTATO: THE /hotpotato COMMAND

  This file is the "Discord side" of starting a game. It:
    1. Notices when someone types /hotpotato
    2. Opens joining for 30 seconds
    3. Runs each round: hands out the potato, waits on a secret timer, then BOOM
  The actual rules (who can pass, who's out) live in src/games/hotpotato.js.
  This file just asks those rules what happened and sends messages to match.
*/

// "import" pulls in the settings and rule functions from the rules file,
// so this file can use them. The "../" means "go up one folder first."
import {
  JOIN_SECONDS,
  canStart,
  createGame,
  explode,
  fuseSeconds,
  games,
  isOver,
  join,
  startRound,
  winner,
} from "../games/hotpotato";

// ---------------------------------------------------------------------------
// SMALL HELPERS
// The "=>" is a short way to write a tiny function.
// ---------------------------------------------------------------------------

// Discord turns text like <@123456> into a clickable @name that pings the person.
// This builds that text from a user's ID.
const mention = (userId) => `<@${userId}>`;

// setTimeout (the timer tool) measures time in milliseconds, not seconds.
// 1 second = 1000 milliseconds, so this converts seconds into milliseconds.
const toMs = (seconds) => seconds * 1000;

// ---------------------------------------------------------------------------
// ONE ROUND OF THE GAME
// ---------------------------------------------------------------------------

/*
  Play one round: hand out the potato, wait for the secret timer, then BOOM.

  setTimeout(stepsToDo, howLong) means: "wait this long, THEN do these steps."
  While the bot waits, it keeps reading chat, so players can pass the potato
  around during the wait. (That part is handled in hotpotatoMessages.js.)
*/
function playRound(channel, game) {
  // Give the potato to a random player and announce it.
  const holder = startRound(game);
  channel.send(
    `🥔 ${mention(holder)} has the potato! ` +
      "Pass it by **@mentioning** another player. It could explode any second..."
  );

  // Start the secret timer. fuseSeconds() picks a random length (10-30 seconds).
  setTimeout(() => {
    // Safety check: if this game was removed while we were waiting,
    // stop here so we don't send messages about a game that no longer exists.
    if (games.get(channel.id) !== game) return;

    // Time's up! Knock out whoever is holding the potato and announce it.
    const loser = explode(game);
    channel.send(`💥 **BOOM!** The potato exploded on ${mention(loser)}. You're out!`);

    // Is only one player left? Then announce the winner and end the game.
    if (isOver(game)) {
      games.delete(channel.id); // remove the game so the channel can start a new one
      channel.send(`🏆 ${mention(winner(game))} is the last one standing and **wins Hot Potato!**`);
      return; // stop here, no more rounds
    }

    // Still players left: wait 3 seconds so people can read, then play
    // another round. playRound calling itself is how the rounds repeat.
    setTimeout(() => playRound(channel, game), toMs(3));
  }, toMs(fuseSeconds()));
}

// ---------------------------------------------------------------------------
// THE EVENT: what happens when someone types /hotpotato
// ---------------------------------------------------------------------------

/*
  Every file in src/events/ is loaded automatically when the bot starts.
  Each one is an "event" object with:
    name    - which Discord event to listen for
    execute - the steps to run when that event happens

  "interactionCreate" fires every time ANYONE uses ANY slash command,
  so the first job is to ignore everything that isn't /hotpotato.

  "async" and "await": talking to Discord takes a moment. "await" means
  "wait for Discord to finish this before moving on," and any function that
  uses await has to be marked "async."
*/
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    // Ignore anything that isn't a slash command, or is a different command
    // (like /hangman, which another file handles).
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "hotpotato") return;

    // Only one hot potato game per channel at a time.
    if (games.has(interaction.channelId)) {
      await interaction.reply({
        content: "A hot potato game is already running in this channel.",
        ephemeral: true, // only the person who typed the command sees this
      });
      return;
    }

    // Make a new game, put the person who started it in automatically,
    // and save it under this channel's ID.
    const game = createGame();
    join(game, interaction.user.id);
    games.set(interaction.channelId, game);

    // Announce the game so others can join.
    await interaction.reply(
      `🥔 **Hot Potato!** Type **join** in the next ${JOIN_SECONDS} seconds to play.\n` +
        `${mention(interaction.user.id)} is in.`
    );

    // Start the joining timer. When it runs out, either start or cancel.
    const channel = interaction.channel;
    setTimeout(() => {
      // Same safety check as in playRound.
      if (games.get(channel.id) !== game) return;

      // Not enough players? Cancel and free up the channel.
      if (!canStart(game)) {
        games.delete(channel.id);
        channel.send("Not enough players joined, so the game was cancelled. You need at least 2.");
        return;
      }

      // Enough players: list everyone, then start the first round.
      // .map() turns each ID in the list into an @mention, and .join(", ")
      // glues them into one line like "@Ana, @Ben, @Cat".
      const names = game.players.map(mention).join(", ");
      channel.send(`Joining is closed! Players: ${names}`);
      playRound(channel, game);
    }, toMs(JOIN_SECONDS));
  },
};

// Hand this event to the bot's loader (src/helpers/loadEvents.js).
export default event;
