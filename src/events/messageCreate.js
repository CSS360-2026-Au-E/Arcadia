import { games, guess, showGame } from "../games/hangman";

// "messageCreate" runs every time anyone sends a message the bot can see.
const event = {
  name: "messageCreate",
  async execute(message) {
    // Ignore messages from bots, including our own.
    if (message.author.bot) return;

    // Is there a hangman game in this channel? If not, do nothing.
    const game = games.get(message.channelId);
    if (!game) return;

    // Only one-character messages count as guesses,
    // so people can still chat normally during a game.
    const text = message.content.trim();
    if (text.length !== 1) return;

    const result = guess(game, text);

    if (result === "invalid") return; // like "?" or "7"

    if (result === "repeat") {
      await message.reply(`Someone already guessed "${text}".`);
      return;
    }

    if (result === "won") {
      games.delete(message.channelId); // game over, free the channel
      await message.reply(
        showGame(game) + `\n**${message.author} solved it!** The word was **${game.word}**.`
      );
      return;
    }

    if (result === "lost") {
      games.delete(message.channelId); // game over, free the channel
      await message.reply(showGame(game) + `\n**Game over.** The word was **${game.word}**.`);
      return;
    }

    // Otherwise it was a "hit" or a "miss", so show the updated game.
    const feedback = result === "hit" ? "Yes, that letter is in the word." : "Nope, not in the word.";
    await message.reply(feedback + "\n" + showGame(game));
  },
};

export default event;
