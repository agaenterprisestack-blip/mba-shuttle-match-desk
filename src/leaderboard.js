import { normalizePlayerName, playerNameKey } from './playerNames.js'

export const leaderboardPeriods = [
  { value: 'all', label: 'All time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]

export const resultSideNames = (result) => [0, 1].map((side) => result.players
  .filter((player) => player.side === side).map((player) => player.name).join(' / '))

export const filterLeaderboardResults = (results, period, now = new Date()) => {
  if (!leaderboardPeriods.some((entry) => entry.value === period)) {
    throw new Error('Choose a valid leaderboard period.')
  }
  if (period === 'all') return { results, undatedCount: 0 }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  if (period === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 7)
  } else if (period === 'month') {
    start.setDate(1)
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1)
  } else {
    start.setMonth(0, 1)
    end.setFullYear(start.getFullYear() + 1, 0, 1)
  }
  let undatedCount = 0
  const filtered = results.filter((result) => {
    const timestamp = result.createdAt instanceof Date ? result.createdAt.getTime()
      : result.createdAt?.toMillis?.()
    if (!Number.isFinite(timestamp)) {
      undatedCount += 1
      return false
    }
    return timestamp >= start.getTime() && timestamp < end.getTime()
  })
  return { results: filtered, undatedCount }
}

export const paginateLeaderboard = (players, requestedPage) => {
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(players.length / pageSize))
  const page = Math.max(1, Math.min(requestedPage, pageCount))
  const offset = (page - 1) * pageSize
  return {
    page, pageCount,
    players: players.slice(offset, offset + pageSize),
    first: players.length ? offset + 1 : 0,
    last: Math.min(offset + pageSize, players.length),
  }
}

export const completedMatchResult = (match) => {
  const { scores, winner, format, target } = match
  if (!['singles', 'doubles'].includes(format) || ![20, 14].includes(target)
    || ![0, 1].includes(winner) || scores.length !== 2
    || !scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 30)
    || scores[winner] <= scores[1 - winner]
    || scores[winner] < target + 1
    || (scores[winner] < 30 && scores[winner] - scores[1 - winner] < 2)) {
    throw new Error('Only a completed match with a valid final score can be saved.')
  }
  const count = format === 'singles' ? 1 : 2
  if (match.teams.length !== 2 || match.teams.some((team) => team.players.length !== count)) {
    throw new Error('The match must contain the correct number of players.')
  }
  const players = match.teams.flatMap((team, side) => team.players.map((player, playerIndex) => {
    const name = normalizePlayerName(player.name)
    if (!name || name.length > 80) throw new Error('Every player needs a name containing 1 to 80 characters.')
    const rallies = match.rallies.filter((rally) => rally.detail?.playerSide === side
      && rally.detail.playerIndex === playerIndex)
    return {
      name,
      side,
      pointsWon: rallies.filter((rally) => rally.team === side && rally.detail.outcomeKind === 'winner').length,
      errors: rallies.filter((rally) => rally.team !== side && rally.detail.outcomeKind === 'error').length,
    }
  }))
  if (new Set(players.map((player) => playerNameKey(player.name))).size !== players.length) {
    throw new Error('Use a different name for every player before starting a leaderboard match. Identical names are treated as one player.')
  }
  return { format, target, scores: [...scores], winner, players }
}

export const calculateLeaderboard = (results) => {
  const totals = new Map()
  for (const result of results) {
    for (const player of result.players) {
      const key = playerNameKey(player.name)
      const entry = totals.get(key) || {
        key, name: player.name, played: 0, wins: 0, losses: 0,
        pointsFor: 0, pointsAgainst: 0, pointsWon: 0, errors: 0,
      }
      entry.played += 1
      entry.wins += Number(player.side === result.winner)
      entry.losses += Number(player.side !== result.winner)
      entry.pointsFor += result.scores[player.side]
      entry.pointsAgainst += result.scores[1 - player.side]
      entry.pointsWon += player.pointsWon
      entry.errors += player.errors
      totals.set(key, entry)
    }
  }
  return rankLeaderboard([...totals.values()])
}

export const calculateTeamLeaderboard = (results) => {
  const totals = new Map()
  for (const result of results) {
    if (result.format !== 'doubles') continue
    for (const side of [0, 1]) {
      const members = result.players.filter((player) => player.side === side)
        .map((player) => ({ key: playerNameKey(player.name), name: normalizePlayerName(player.name) }))
        .sort((a, b) => a.key.localeCompare(b.key))
      const key = JSON.stringify(members.map((member) => member.key))
      const entry = totals.get(key) || {
        key, name: members.map((member) => member.name).join(' / '),
        played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
      }
      entry.played += 1
      entry.wins += Number(side === result.winner)
      entry.losses += Number(side !== result.winner)
      entry.pointsFor += result.scores[side]
      entry.pointsAgainst += result.scores[1 - side]
      totals.set(key, entry)
    }
  }
  return rankLeaderboard([...totals.values()])
}

const rankLeaderboard = (totals) => {
  const entries = totals.map((entry) => ({
    ...entry,
    winRate: entry.wins / entry.played,
    difference: entry.pointsFor - entry.pointsAgainst,
  })).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate
    || b.difference - a.difference || a.key.localeCompare(b.key))
  let rank = 0
  return entries.map((entry, index) => {
    const previous = entries[index - 1]
    if (!previous || entry.wins !== previous.wins || entry.winRate !== previous.winRate
      || entry.difference !== previous.difference) rank = index + 1
    return { ...entry, rank }
  })
}
