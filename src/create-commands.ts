import {type RESTPostAPIApplicationCommandsJSONBody} from 'discord-api-types/v10'
import {globals} from './globals.js'
import {DiscordClient} from './discord-client.js'

const discordClient = new DiscordClient(globals.DISCORD_BASE_URL, globals.DISCORD_TOKEN)

async function run() {
    const command: RESTPostAPIApplicationCommandsJSONBody = {
        name: 'tic-tac-toe',
        description: 'Create a tic-tac-toe game',
        contexts: [0, 1, 2],
        integration_types: [0, 1],
    } as any // TODO Fix once types are updated
    const createdCommand = await discordClient.createApplicationCommand(
        globals.DISCORD_APP_ID,
        command,
    )

    console.log(`Created:\n${JSON.stringify(createdCommand, null, 2)})}`)
}

run().catch(console.error)
