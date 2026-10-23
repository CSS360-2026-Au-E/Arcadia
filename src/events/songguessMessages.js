import { CLIP_SECONDS, games, isCorrectGuess } from "../games/songguess";
import { describe, endGame, nextClip, secondsText } from "../games/songguessRound";

// Runs on every message. If a song game is running in the channel,
// the message counts as a guess. (Hangman guesses are in messageCreate.js.)
const event = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    const game = games.get(message.channelId);
    if (!game || game.over || !game.mp3) return; // no game, or still loading

    const text = message.content.trim();

    if (text.toLowerCase() === "skip") {
      await nextClip(message.channel, game);
      return;
    }

    if (isCorrectGuess(game, text)) {
      endGame(message.channel, game);
      const clip = secondsText(CLIP_SECONDS[game.stage]);
      await message.reply(
        `🎉 **${message.author} got it from ${clip}!** It was ${describe(game.song)}.`
      );
      return;
    }

    // Wrong guess: a quick ❌ instead of a message, so the chat stays readable.
    await message.react("❌").catch(() => {});
  },
};

export default event;
