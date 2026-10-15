Arcadia: a Discord Minigame Circuit Bot
CSS 360, Group 4. Status: idea / planning stage. Nothing below is built yet.

The idea
Arcadia is a Discord bot that runs a circuit of quick minigames, like Mario Party or WarioWare inside a Discord server. Someone starts a session, players join, and the bot builds a lineup of minigames that fits how many people are playing and how much time the group has. Points carry across the whole circuit, and the player with the most points at the end wins.

How a session works
/arcadia start time:15m opens a lobby. Players join with a button.
The bot builds the circuit from the player count and the time budget. A 5 minute session might be 4 quick games; a 30 minute session might be 10 games plus a finale.
Each minigame runs in the channel. A leaderboard is shown between games.
The final game is worth double points, so anyone can still come back.
The bot announces the winner and final standings.
How the bot picks games
Every minigame is tagged with:

Players: the minimum (and optional maximum) number of players it supports
Length: roughly how long a round takes
Type: speed, brain, social, or luck
The bot fills the time budget with games that fit the current player count and avoids picking the same type twice in a row, so the pace keeps changing.

Planned minigames
Game	Players	Length	Type	How it plays
Quick Draw	2+	~20s	Speed	Bot says "DRAW!" at a random moment. First click wins; clicking early knocks you out.
Emoji Decode	2+	~45s	Brain	Guess the movie or song from a string of emojis.
Lowest Unique Number	3+	~30s	Luck / brain	Everyone DMs a number. The lowest number nobody else picked wins.
Hot Potato	3+	~60s	Social	Pass the bomb with /pass @user before a hidden timer runs out.
Smuggler (short)	4+	~3m	Social	Bot DMs each player a secret word. The group writes a story one sentence at a time and everyone tries to sneak their word in. Points for hiding your word and for catching others.
Majority Rules	5+	~40s	Social	"Pizza or tacos?" You score if you match what most people picked.
Team Tug	6+	~60s	Speed	Players are split into two teams that race to spam a reaction button.
Scoring (draft)
Points from each minigame carry over for the whole circuit.
The final game is worth double.
Last place gets a small catch-up perk, such as picking the next game.
Planned structure
Each minigame is its own module that follows the same interface, so team members can build games independently on separate branches:

start(players): set up and announce the round
handleInput(interaction): react to commands, buttons, or messages
getScores(): return the points earned this round
A circuit manager picks the games, runs them in order, and keeps the leaderboard.

Setup (from the original template)
The instructions below come from the GitHub Discord bot template this repo was created from.


Javascript Discord Welcome MemeBot with GitHub Codespaces

Customize and deploy your own welcome memebot for your Discord server!

This template repository has all the code you need, with a preconfigured Codespaces development environment, to send a welcome message along with a meme when a user joins your Discord server.

How to customize your bot

Step 1: Add a .env file
This template repository requires a .env file to pass variables to your application. The .env file is used to store data that you want to keep private or hidden like API keys or tokens from external services like Discord.

This template repository has a sample .env file, .env-sample, that you can rename to .env or copy and paste the variables in .env-sample into a new .env file.

Step 2: Add your favorite meme
In your .env file you will find a variable named MEME_URL where you can add a URL to your favorite meme.

Step 3: Add a personalized welcome message
In the src directory you will find another directory called events. Open the events directory and you will find the guildMemberAdd.js file. You'll notice that we left helpful comments on where you can update the code to your liking.

To add a welcome message, you can update the getWelcomeMessage function after the content: keyword.


Step 4 (optional): Customize even further
Maybe you want to use an API service to provide random memes or maybe you don't want to share a meme at all. No matter what route you choose, you should take this Discord bot and make it your own. :smiley:

We recommend creating a new branch anytime you tinker so you don't have to worry about making mistakes on your main branch. Once your new branch is in a good state, you can merge your changes to your main branch using a pull request. :rocket:

How to deploy your bot

Step 1: Create a new application on Discord
Visit https://discord.com/developers/applications to create a new application on Discord. Once there, click the new application button. After you click on the new application button, you can then create a new application (Note: That we created a new application called Bot Developer):


Step 2: Open your application
After creating an application you should see the application under My applications. Open your newly created application by clicking on it.


Step 3: Configure your bot user
Select the Bot settings to edit the details. First, click on reset token to generate a new token that you will use in your .env file. Copy the generated token and set the TOKEN variable in your .env file with your newly generated token.

Select the public bot option if you want your bot to be publically available. Select all the Privileged Gateway Intents like PRESENCE INTENT, SERVER MEMBERS INTENT, MESSAGE CONTENT INTENT if your bot needs those intents.(Note: For this application you'll need all of these intents.)


Step 4: Select your bot permissions
Open the OAuth2 setting and then select URL Generator.

Select the bot checkbox under SCOPES. After, select Send Messages, Mention Everyone, and Add Reactions.

Once you have set your bot permissions copy the generated url below.


Step 5: Choose your Discord Server
Visit the generated url from the previous step and choose the server that you want to add the bot to. Once you've selected the server click continue.


Step 6: Run your application
Once the bot is added it will appear on your Discord server in offline mode.

You can now run the code in the repository using the command line by typing the command npm start.
