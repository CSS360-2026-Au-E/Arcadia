# How the song guesser code works

`/songguess` is a Heardle-style game. The bot posts a tiny clip of a popular
song. If nobody names it, the next clip is longer: 0.1, 1, 2, 4, 8, then 16
seconds. The first person to type the title wins.

## Where the songs come from

Songs come from [Deezer's free API](https://developers.deezer.com/api), which
needs no account or key. The bot picks a random song from Deezer's top 100
chart, and every song comes with a 30 second preview MP3.

We first planned to use Spotify, but Spotify stopped giving preview clips to new
apps in November 2024, so a new Spotify app has no audio to play.

## How the clips are made

The bot downloads the 30 second preview once. For each clip it keeps only the
start of the file. An MP3 is a short header followed by the sound, and the sound
uses about the same number of bytes every second, so "the first 2 seconds" is
just the header plus 2 seconds' worth of bytes. No extra tools are needed.

The clip is posted as an `.mp3` file, and Discord shows it with a play button.

## The files

| File | What it does |
| --- | --- |
| `src/games/songguess.js` | The rules: clip lengths, checking a guess, cutting a clip, getting a song from Deezer. No Discord code. |
| `src/games/songguessRound.js` | Posts each clip, counts down to the next one, and ends the game. |
| `src/events/songguessCommand.js` | Runs when someone uses `/songguess`. Gets a song and posts the first clip. |
| `src/events/songguessMessages.js` | Runs on every message. During a game, a message is a guess, and `skip` plays the next clip now. |
| `src/events/ready.js` | Adds `/songguess` (and `/hangman`) to every server the bot is in. |

## What happens during one game

1. Someone types `/songguess`.
2. The bot gets a random chart song, downloads its preview, and posts clip 1 (0.1 seconds).
3. Players type guesses in the channel. A wrong guess gets a ❌ reaction.
4. After 20 seconds, or when someone types `skip`, the bot posts the next, longer clip.
5. Someone types the right title and wins. Small typos are fine, and extras like
   "(feat. ...)" or "- Remastered" don't need to be typed.
6. If nobody gets it after the 16 second clip, the bot reveals the song.

## Try it

- `npm test` runs the checks in `tests/songguess.spec.js`.
- `npm start` runs the bot. Type `/songguess` in your server.
- To change the clip lengths or the time per clip, edit `CLIP_SECONDS` and
  `SECONDS_PER_CLIP` at the top of `src/games/songguess.js`.
- The bot needs the **Attach Files** and **Add Reactions** permissions in the channel.
