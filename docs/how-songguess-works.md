# How the song guesser code works

`/songguess` is a Heardle-style game. When you type `/songguess`, Discord asks
you to pick a **genre** (Pop, Hip-Hop / Rap, Rock, R&B, Country, Electronic /
Dance, Latin, K-Pop, or General) and an **era** (70s, 80s, 90s, 2000s, 2010s,
2020s, or General). The bot posts a tiny clip of a song that fits. Type `skip`
for a longer one: 0.1, 1, 2, 4, 8, then 16 seconds. There's no timer, so take as
long as you need. The first person to type the title wins.

## Where the songs come from

Songs come from [Deezer's free API](https://developers.deezer.com/api), which
needs no account or key, and every song comes with a 30 second preview MP3.

- **General genre and General era:** a random song from Deezer's top 100 right now.
- **Anything else:** the bot searches Deezer's playlists, for example "80s rock
  hits". It keeps only playlists whose title matches both picks, puts playlists
  made by Deezer's own editors first, and picks a random song from one of the
  best three. If nothing matches (70s K-Pop, say), the bot says so and you can
  pick again.

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
| `src/games/songguess.js` | The rules: clip lengths, genres and eras, checking a guess, cutting a clip, finding a song on Deezer. No Discord code. |
| `src/games/songguessRound.js` | Posts each clip and ends the game. |
| `src/events/songguessCommand.js` | Runs when someone uses `/songguess`. Reads the genre and era, gets a song, and posts the first clip. |
| `src/events/songguessMessages.js` | Runs on every message. During a game, a message is a guess, and `skip` plays the next clip. |
| `src/events/ready.js` | Adds `/songguess` (with its genre and era menus) and `/hangman` to every server the bot is in. |

## What happens during one game

1. Someone types `/songguess` and picks a genre and an era.
2. The bot finds a song that fits, downloads its preview, and posts clip 1 (0.1 seconds).
3. Players type guesses in the channel. A wrong guess gets a ❌ reaction.
4. When someone types `skip`, the bot posts the next, longer clip. Nothing moves on by itself.
5. Someone types the right title and wins. Small typos are fine, and extras like
   "(feat. ...)" or "- Remastered" don't need to be typed.
6. Typing `skip` on the 16 second clip gives up and reveals the song.

## Try it

- `npm test` runs the checks in `tests/songguess.spec.js`.
- `npm start` runs the bot. Type `/songguess` in your server.
- To change the clip lengths, edit `CLIP_SECONDS` at the top of `src/games/songguess.js`.
- To add a genre or era, add a line to `GENRES` or `ERAS` in the same file. The
  menus in Discord update the next time the bot starts.
- The bot needs the **Attach Files** and **Add Reactions** permissions in the channel.
