import process from 'node:process'
import {config} from 'dotenv'

config()

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Couldnt get env var ${name}`)
    }

    return value
}

export const globals = {
    DISCORD_APP_ID: requireEnv('DISCORD_APP_ID'),
    DISCORD_APP_PUBLIC_KEY: requireEnv('DISCORD_APP_PUBLIC_KEY'),
    DISCORD_TOKEN: requireEnv('DISCORD_TOKEN'),
    NODE_PORT: Number.parseInt(requireEnv('NODE_PORT'), 10),
    DISCORD_BASE_URL: requireEnv('DISCORD_BASE_URL'),
}
