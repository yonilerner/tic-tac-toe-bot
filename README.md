# tic-tac-toe-bot

## Public Invite Link
TODO

## Setup
- Clone the repo
- `cp .env.example .env`
- Fill out `.env`
    - `NODE_PORT` - whatever port you want your server to run on
    - `DISCORD_APP_ID` - your Discord applications client ID (from developer dashboard)
    - `DISCORD_APP_PUBLIC_KEY` - your Discord applications public key (from developer dashboard)
    - `DISCORD_TOKEN` - your Discord applications bot token (from developer dashboard)
    - `DISCORD_BASE_URL` - probably leave default
- `npm ci` to install packages
- `npm run build` to compile (or `run run watch` for watch mode)
- `npm run create-commands` (to create the slash command)
- `npm start` - To run the server
