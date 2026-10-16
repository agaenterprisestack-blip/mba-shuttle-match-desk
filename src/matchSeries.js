export const seriesSummary = (series, game) => {
  const games = [...series.games, ...(game.winner === null ? [] : [{ winner: game.winner, scores: game.scores }])]
  const wins = [0, 0]
  for (const entry of games) wins[entry.winner] += 1
  const requiredWins = Math.floor(series.bestOf / 2) + 1
  const winner = wins.findIndex((count) => count >= requiredWins)
  return { games, wins, requiredWins, winner: winner === -1 ? null : winner }
}

export const advanceMatchSeries = (series, game) => {
  if (game.winner === null) throw new Error('Complete the current game before starting the next game.')
  const summary = seriesSummary(series, game)
  if (summary.winner !== null) throw new Error('This series is already complete.')
  return { ...series, games: summary.games.map((entry) => ({ ...entry, scores: [...entry.scores] })) }
}

export const completedSeriesResult = (match) => {
  if (!match.series || ![3, 5].includes(match.series.bestOf)) throw new Error('Choose a valid Challenge series.')
  const summary = seriesSummary(match.series, match)
  if (summary.winner === null || summary.games.length > match.series.bestOf) throw new Error('Complete the Challenge series before saving.')
  const wins = [0, 0]
  for (const game of summary.games) {
    if (wins.some((count) => count >= summary.requiredWins)) throw new Error('A Challenge series cannot continue after it is won.')
    completedMatchResult({ ...match, ...game, rallies: [] })
    wins[game.winner] += 1
  }
  const players = completedMatchResult({ ...match, rallies: [] }).players
  return {
    format: match.format, target: match.target, bestOf: match.series.bestOf,
    scores: wins, winner: summary.winner, players,
    games: summary.games.map((game) => ({ winner: game.winner, scores: [...game.scores] })),
  }
}
import { completedMatchResult } from './leaderboard.js'
