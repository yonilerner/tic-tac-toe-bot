import {
    ComponentType,
    ButtonStyle,
    type Snowflake,
    type RESTPostAPIWebhookWithTokenJSONBody,
} from 'discord-api-types/v10'

const BOARD_SIZE = 9
const X = '❌'
const O = '⭕'

type Cell = typeof O | typeof X | null
type Board = {
    cells: Cell[]
    player1: Snowflake | null
    player2: Snowflake | null
    lastPlayer: Snowflake | null
}

const boards: Record<Snowflake, Board> = {}

export function makeNewBoard(): Board {
    return {
        cells: Array.from({length: BOARD_SIZE}).fill(null) as Cell[],
        lastPlayer: null,
        player1: null,
        player2: null,
    }
}

export function getBoard(boardId: Snowflake) {
    return boards[boardId]
}

export function saveBoard(boardId: Snowflake, board: Board) {
    boards[boardId] = board
}

function getCellLabel(cell: Cell): string {
    if (cell === null) {
        return '​'
    }

    return cell
}

export function makeBoardComponents(
    board: Board,
): RESTPostAPIWebhookWithTokenJSONBody['components'] {
    const [winner, winningIndices] = hasWinner(board)
    const winnerLabel = winner ? (winner === board.player1 ? X : O) : null
    const slices = [board.cells.slice(0, 3), board.cells.slice(3, 6), board.cells.slice(6)]
    function getCellStyle(cell: Cell, i: number, j: number) {
        const index = i * slices.length + j
        const cellLabel = getCellLabel(cell)
        if (winnerLabel === cellLabel && winningIndices.includes(index)) {
            return ButtonStyle.Success
        }

        if (cellLabel) {
            return ButtonStyle.Secondary
        }

        return ButtonStyle.Primary
    }

    return slices.map((slice, i) => ({
        type: ComponentType.ActionRow,
        components: slice.map((cell, j) => ({
            type: ComponentType.Button,
            custom_id: `c${i * slices.length + j}`,
            style: getCellStyle(cell, i, j),
            label: getCellLabel(cell),
            disabled: cell !== null || Boolean(winner),
        })),
    }))
}

function hasWinner(board: Board): [Snowflake | null, number[]] {
    const {cells} = board

    let winner: Cell = null
    let winningIndices: number[] = []
    if (cells[0] === cells[1] && cells[1] === cells[2]) {
        winner = cells[0]
        winningIndices = [0, 1, 2]
    } else if (cells[3] === cells[4] && cells[4] === cells[5]) {
        winner = cells[3]
        winningIndices = [3, 4, 5]
    } else if (cells[6] === cells[7] && cells[7] == cells[8]) {
        winner = cells[6]
        winningIndices = [6, 7, 8]
    }

    if (winner) {
        return [winner === X ? board.player1! : board.player2!, winningIndices]
    }

    if (cells[0] === cells[3] && cells[3] === cells[6]) {
        winner = cells[0]
        winningIndices = [0, 3, 6]
    } else if (cells[1] === cells[4] && cells[4] === cells[7]) {
        winner = cells[1]
        winningIndices = [1, 4, 7]
    } else if (cells[2] === cells[5] && cells[5] === cells[8]) {
        winner = cells[2]
        winningIndices = [2, 5, 8]
    }

    if (winner) {
        return [winner === X ? board.player1! : board.player2!, winningIndices]
    }

    if (cells[0] === cells[4] && cells[4] === cells[8]) {
        winner = cells[0]
        winningIndices = [0, 4, 8]
    } else if (cells[2] === cells[4] && cells[4] === cells[6]) {
        winner = cells[4]
        winningIndices = [2, 4, 6]
    }

    if (winner) {
        return [winner === X ? board.player1! : board.player2!, winningIndices]
    }

    return [null, winningIndices]
}

export function makeMove(
    board: Board,
    userId: Snowflake,
    customId: string,
): Snowflake | 'tie' | null {
    const cellIndex = Number.parseInt(customId.slice(1))
    const cell = board.cells[cellIndex]
    if (cell !== null) {
        throw new Error('Move is already taken')
    }

    if (board.lastPlayer === userId) {
        throw new Error('Its not your turn')
    }

    if (!board.player1) {
        board.player1 = userId
    } else if (!board.player2 && board.player1 !== userId) {
        board.player2 = userId
    } else if (userId !== board.player1 && userId !== board.player2) {
        throw new Error('Who are you and why are you clicking these buttons?!?')
    }

    board.lastPlayer = userId
    board.cells[cellIndex] = userId === board.player1 ? X : O

    const winner = hasWinner(board)[0]
    if (winner != null) {
        return winner
    }

    if (board.cells.every((cell) => cell !== null)) {
        return 'tie'
    }

    return null
}
