# Arcadia

A Discord bot that turns your server into an arcade of quick minigames.
CSS 360, Group 4.

## Games

| Command | Players | How to play | Status |
| --- | --- | --- | --- |
| `/hangman` | 1+ | Guess the secret word by typing one letter at a time in the channel. Six wrong guesses and you lose. | Playable |
| `/songguess` | 1+ | Name the song from a tiny clip. Every miss plays a longer clip: 0.1, 1, 2, 4, 8, then 16 seconds. | Playable |
| Personality test | 1 | Answer quick questions and get a four letter type like ENFJ. | Planned |

New members get a welcome message in `#general` that points them to the games.

How the code works, file by file: [hangman](docs/how-hangman-works.md), [song guesser](docs/how-songguess-works.md).

## The big idea

Arcadia will run a circuit of short minigames, like Mario Party inside Discord.
Someone starts a session, players join, and the bot picks games that fit how many
people are playing and how much time they have. Points carry across the circuit
and the top scorer wins.

Planned games: Quick Draw, Emoji Decode, Lowest Unique Number, Hot Potato,
Smuggler, Majority Rules and Team Tug.

## Run the bot yourself

You need a GitHub account and a Discord account. Everything runs in the cloud
in a GitHub Codespace, so nothing is installed on your computer.

1. **Open a Codespace.** On this repo's page click **Code**, then **Codespaces**,
   then **Create codespace on main**. (Do this on your own fork for a personal test bot.)
2. **Make your settings file.** In the terminal at the bottom, run:
   ```
   cp -n .env-sample .env
   ```
3. **Create a Discord app.** Go to the
   [Discord Developer Portal](https://discord.com/developers/applications) and
   click **New Application**.
4. **Get the token.** Open the **Bot** tab and click **Reset Token**, then **Copy**.
   On the same page, turn on all three **Privileged Gateway Intents** and save.
5. **Paste the token.** Run `code .env` in the terminal. Replace
   `put-your-token-here` with your token and save. Never share the token or
   commit it. `.env` is ignored by git, so it stays on your Codespace.
6. **Invite the bot.** Copy the **Application ID** from **General Information**
   and open this link with your ID in it:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot+applications.commands&permissions=101440
   ```
   Pick your server and click **Authorize**.
7. **Start it.** Run:
   ```
   npm start
   ```
   It works when you see `Logged in as <your bot>!` and `Added /hangman and /songguess to <your server>`.
   Keep the terminal open. Closing it, or the Codespace going to sleep, takes the bot offline.
8. **Play.** Type `/hangman` or `/songguess` in your server.

Your server needs a text channel named `general` for the welcome message. To use
a different channel, change `CHANNEL_NAME` in `.env`.

## Run the tests

```
npm test
```

## Troubleshooting

| What you see | Fix |
| --- | --- |
| `An invalid token was provided` | Reset the token in the portal and paste the new one into `.env`. |
| `Used disallowed intents` | Turn on all three Privileged Gateway Intents in the **Bot** tab. |
| `/hangman` does not show up | Stop the bot with Ctrl+C and run `npm start` again. If it still says it could not add the command, invite the bot again with the link in step 6. |
| `/songguess` says it couldn't get a song | The bot couldn't reach Deezer. Check your internet connection and try again. |
| Song clips don't show up | Give the bot the **Attach Files** permission, or invite it again with the link in step 6. |
| Typing letters does nothing | Turn on the **Message Content** intent in the **Bot** tab. |

## Credits

Built on the GitHub Education
[memebot_discord](https://github.com/github-education-resources/memebot_discord) template.
