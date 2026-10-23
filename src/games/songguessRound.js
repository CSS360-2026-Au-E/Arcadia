/*
  SONG GUESSER, THE DISCORD SIDE

  Sends the clips to the channel and moves the game along.
  Used by src/events/songguessCommand.js (starts a game) and
  src/events/songguessMessages.js (checks guesses).
*/
import { AttachmentBuilder } from "discord.js";
import {
  CLIP_SECONDS,
  SECONDS_PER_CLIP,
  cutClip,
  games,
  isLastClip,
} from "./songguess";

// Post the clip for the stage the game is on, then start the countdown
// to the next one. `send` is how to post: a channel's send, or a reply.
export async function playClip(channel, game, send = (msg) => channel.send(msg)) {
  const seconds = CLIP_SECONDS[game.stage];
  const clip = cutClip(game.mp3, seconds);
  const file = new AttachmentBuilder(clip, { name: `clip-${game.stage + 1}.mp3` });

  const hint = isLastClip(game)
    ? "Last clip!"
    : `Next clip in ${SECONDS_PER_CLIP}s, or type \`skip\` for it now.`;

  await send({
    content:
      `🎵 **Clip ${game.stage + 1}/${CLIP_SECONDS.length}: ${secondsText(seconds)}.** ` +
      `Type the song title to guess. ${hint}`,
    files: [file],
  });

  clearTimeout(game.timer);
  game.timer = setTimeout(() => nextClip(channel, game), SECONDS_PER_CLIP * 1000);
}

// Nobody got it: play a longer clip, or reveal the song after the last one.
export async function nextClip(channel, game) {
  // Ignore extra skips while the next clip is still being posted.
  if (game.over || game.busy) return;
  game.busy = true;

  if (isLastClip(game)) {
    endGame(channel, game);
    await channel.send(`⏱️ **Nobody got it.** The song was ${describe(game.song)}.`);
    return;
  }

  game.stage = game.stage + 1;
  try {
    await playClip(channel, game);
  } finally {
    game.busy = false;
  }
}

// Stop the countdown and free the channel for a new game.
export function endGame(channel, game) {
  game.over = true;
  clearTimeout(game.timer);
  games.delete(channel.id);
}

// "**Dracula (with JENNIE)** by Tame Impala" with a link to the song.
export function describe(song) {
  return `**${song.title}** by ${song.artist} (<${song.link}>)`;
}

// "1 second", "0.1 seconds", "4 seconds"
export function secondsText(seconds) {
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}
