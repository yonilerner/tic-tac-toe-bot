import express, {type NextFunction, type Request, type Response} from 'express'
import {
    type APIInteraction,
    type APIInteractionResponse,
    InteractionResponseType,
    InteractionType,
    MessageFlags,
} from 'discord-api-types/v10'
import {verifyKeyMiddleware} from 'discord-interactions'
import {globals} from './globals.js'
import {getBoard, makeBoardComponents, makeMove, makeNewBoard, saveBoard} from './board.js'
import {DiscordClient} from './discord-client.js'

const server = express()

const discordClient = new DiscordClient(globals.DISCORD_BASE_URL, globals.DISCORD_TOKEN)

const INVALID_SIGNATURE_MESSAGE = 'INVALID_SIGNATURE'

server.use(
    '/discord-interactions',
    verifyKeyMiddleware(globals.DISCORD_APP_PUBLIC_KEY),
    async (
        request: Request<Record<string, unknown>, APIInteractionResponse, APIInteraction>,
        res,
    ) => {
        const {body} = request
        if (body.type === InteractionType.Ping) {
            res.send({type: InteractionResponseType.Pong})
            return
        }

        try {
            let response: APIInteractionResponse | undefined
            if (body.type === InteractionType.ApplicationCommand) {
                if (body.data.name === 'tic-tac-toe') {
                    ;(async () => {
                        const board = makeNewBoard()
                        const response = await discordClient.executeWebhook(
                            'PATCH',
                            globals.DISCORD_APP_ID,
                            request.body.token,
                            {
                                embeds: [
                                    {
                                        title: 'Tic Tac Toe',
                                    },
                                ],
                                components: makeBoardComponents(board),
                            },
                        )
                        if (!response) {
                            throw new Error('Could not create webhook')
                        }

                        saveBoard(response.id, board)
                    })().catch((error) => {
                        console.error(error)
                    })
                    response = {
                        type: InteractionResponseType.DeferredChannelMessageWithSource,
                    }
                }
            } else if (body.type === InteractionType.MessageComponent) {
                const board = getBoard(body.message.id)
                const userId = body.member?.user.id ?? body.user?.id
                if (userId == null) {
                    throw new Error(`Could not get user ID from interaction ${body.id}`)
                }

                const winner = makeMove(board, userId, body.data.custom_id)
                if (winner) {
                    response = {
                        type: InteractionResponseType.UpdateMessage,
                        data: {
                            content: winner === 'tie' ? 'No winners here 😢' : `<@${winner}> Wins!`,
                            components: makeBoardComponents(board),
                            embeds: [],
                        },
                    }
                } else {
                    response = {
                        type: InteractionResponseType.UpdateMessage,
                        data: {
                            components: makeBoardComponents(board),
                        },
                    }
                }
            } else {
                res.sendStatus(400)
                res.send()
                return
            }

            if (response) {
                res.send(response)
            } else {
                res.send({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        flags: MessageFlags.Ephemeral,
                        content: '```' + JSON.stringify(body, null, 2) + '```',
                    },
                })
            }
        } catch (error: unknown) {
            let errorMessage: string
            if (error instanceof Error) {
                errorMessage = error.message
            } else {
                errorMessage = 'Unknown error'
            }
            res.send({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {flags: MessageFlags.Ephemeral, content: errorMessage},
            })
        }
    },
)

server.use((e: Error, request: Request, res: Response, next: NextFunction) => {
    if (e.message !== INVALID_SIGNATURE_MESSAGE) {
        next(e)
    }
})

server.listen(globals.NODE_PORT, () => {
    console.log(`Listening on ${globals.NODE_PORT}`)
})
