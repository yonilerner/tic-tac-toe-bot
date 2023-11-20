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
import {RESTPostAPIWebhookWithTokenJSONBody} from 'discord-api-types/v10.js'

const server = express()

const discordClient = new DiscordClient(globals.DISCORD_BASE_URL, globals.DISCORD_TOKEN)

const INVALID_SIGNATURE_MESSAGE = 'INVALID_SIGNATURE'

const interactionTokenByInteractionId = new Map<string, string>()

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
            interactionTokenByInteractionId.set(body.id, body.token)
            if (body.type === InteractionType.ApplicationCommand) {
                if (body.data.name === 'tic-tac-toe') {
                    ;(async () => {
                        const board = makeNewBoard()
                        const response = await discordClient.updateWebhookMessage(
                            globals.DISCORD_APP_ID,
                            body.token,
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
                let messageData: RESTPostAPIWebhookWithTokenJSONBody
                if (winner != null) {
                    messageData = {
                        content: winner === 'tie' ? 'No winners here 😢' : `<@${winner}> Wins!`,
                        components: makeBoardComponents(board),
                        embeds: [],
                    }
                } else {
                    messageData = {
                        components: makeBoardComponents(board),
                    }
                }

                const oldMessageToken = interactionTokenByInteractionId.get(
                    body.message.interaction?.id ?? '',
                )
                if (oldMessageToken) {
                    discordClient
                        .updateWebhookMessage(globals.DISCORD_APP_ID, oldMessageToken, {
                            content: 'Board has moved',
                            embeds: [],
                            components: [],
                        })
                        .catch((e) => console.error('Error updating old message', e))
                }

                response = {
                    type: InteractionResponseType.DeferredChannelMessageWithSource,
                }
                discordClient
                    .updateWebhookMessage(globals.DISCORD_APP_ID, body.token, messageData)
                    .then((newMessage) => {
                        if (newMessage) {
                            saveBoard(newMessage.id, board)
                        }
                    })
                    .catch((e) => console.error('Error updating deferred message', e))
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
