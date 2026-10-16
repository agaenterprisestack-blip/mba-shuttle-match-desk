import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advanceMatchSeries, completedSeriesResult, seriesSummary } from './matchSeries.js'
import { calculateLeaderboard, calculateTeamLeaderboard, filterLeaderboardResults, paginateLeaderboard } from './leaderboard.js'

const game = (winner, scores = [21, 10]) => ({ winner, scores })

test('best of three finishes at two wins, including a straight-games win', () => {
  let series = { bestOf: 3, games: [] }
  assert.deepEqual(seriesSummary(series, game(null)).wins, [0, 0])
  series = advanceMatchSeries(series, game(0))
  assert.equal(seriesSummary(series, game(0)).winner, 0)
  assert.deepEqual(seriesSummary(series, game(0)).wins, [2, 0])
  assert.throws(() => advanceMatchSeries(series, game(0)), /already complete/)
})

test('best of three permits a deciding third game and tracks both sides', () => {
  let series = { bestOf: 3, games: [] }
  series = advanceMatchSeries(series, game(0))
  series = advanceMatchSeries(series, game(1, [10, 21]))
  assert.equal(seriesSummary(series, game(null)).winner, null)
  assert.deepEqual(seriesSummary(series, game(1, [10, 21])).wins, [1, 2])
  assert.equal(seriesSummary(series, game(1, [10, 21])).winner, 1)
})

test('best of five stops at three wins and supports all five games', () => {
  let series = { bestOf: 5, games: [] }
  for (const winner of [0, 1, 0, 1]) series = advanceMatchSeries(series, game(winner))
  const summary = seriesSummary(series, game(0))
  assert.equal(summary.requiredWins, 3)
  assert.equal(summary.games.length, 5)
  assert.equal(summary.winner, 0)
  const straight = { bestOf: 5, games: [game(1), game(1)] }
  assert.equal(seriesSummary(straight, game(1)).winner, 1)
})

test('undo or reset of the current game removes only its provisional series win', () => {
  const series = { bestOf: 3, games: [game(0)] }
  assert.equal(seriesSummary(series, game(0)).winner, 0)
  assert.deepEqual(seriesSummary(series, game(null)).wins, [1, 0])
  assert.equal(series.games.length, 1)
  assert.throws(() => advanceMatchSeries(series, game(null)), /Complete the current game/)
})

test('advancing copies scores without mutating previous game history', () => {
  const series = { bestOf: 5, games: [] }
  const current = game(0)
  const next = advanceMatchSeries(series, current)
  current.scores[0] = 0
  assert.equal(next.games[0].scores[0], 21)
  assert.equal(series.games.length, 0)
  assert.deepEqual(seriesSummary(next, game(null)).wins, [1, 0])
})

const finalSeries = (overrides = {}) => ({
  id: 'final-game', format: 'doubles', target: 20, winner: 0, scores: [21, 10], rallies: [],
  teams: [
    { players: [{ name: ' Alex ' }, { name: 'Lee' }] },
    { players: [{ name: 'Sam' }, { name: 'Jo' }] },
  ],
  series: { id: 'challenge-id', bestOf: 3, games: [game(0)] },
  ...overrides,
})

test('completed Challenge series captures every game but counts one series result per player and pair', () => {
  const result = completedSeriesResult(finalSeries())
  assert.deepEqual(result.scores, [2, 0])
  assert.equal(result.games.length, 2)
  assert.deepEqual(result.games, [game(0), game(0)])
  assert.equal(result.players[0].name, 'Alex')
  assert.ok(result.players.every((player) => player.pointsWon === 0 && player.errors === 0))
  const players = calculateLeaderboard([result])
  assert.equal(players[0].wins, 1)
  assert.equal(players[0].played, 1)
  assert.equal(players[0].pointsFor, 2)
  const pairs = calculateTeamLeaderboard([result])
  assert.equal(pairs.length, 2)
  assert.deepEqual(pairs.map((pair) => [pair.wins, pair.losses, pair.pointsFor, pair.pointsAgainst]), [[1, 0, 2, 0], [0, 1, 0, 2]])
})

test('best of five persists a deciding-game series with the winning side and exact game scores', () => {
  const result = completedSeriesResult(finalSeries({
    winner: 1, scores: [10, 15], target: 14,
    series: { bestOf: 5, games: [game(0, [15, 10]), game(1, [10, 15]), game(0, [15, 12]), game(1, [13, 15])] },
  }))
  assert.deepEqual(result.scores, [2, 3])
  assert.equal(result.winner, 1)
  assert.equal(result.games.length, 5)
})

test('rejects unfinished series, extra games after victory, invalid scores, unsupported lengths, and duplicate players', () => {
  for (const match of [
    finalSeries({ series: null }),
    finalSeries({ series: { bestOf: 7, games: [] } }),
    finalSeries({ series: { bestOf: 3, games: [] } }),
    finalSeries({ winner: null }),
    finalSeries({ series: { bestOf: 3, games: [game(0), game(0)] } }),
    finalSeries({ series: { bestOf: 3, games: [game(0, [20, 19])] } }),
    finalSeries({ teams: [{ players: [{ name: 'Alex' }, { name: 'alex' }] }, { players: [{ name: 'Jo' }, { name: 'Sam' }] }] }),
  ]) assert.throws(() => completedSeriesResult(match))
})

test('Challenge standings retain calendar filters and pagination without merging game results', () => {
  const result = completedSeriesResult(finalSeries())
  const records = [
    { ...result, createdAt: new Date(2026, 8, 1) },
    { ...result, createdAt: new Date(2026, 9, 16) },
  ]
  const filtered = filterLeaderboardResults(records, 'month', new Date(2026, 9, 20))
  const entries = calculateLeaderboard(filtered.results)
  assert.equal(entries[0].played, 1)
  assert.equal(paginateLeaderboard(entries, 1).players.length, 4)
})
