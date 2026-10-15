import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateLeaderboard, completedMatchResult } from './leaderboard.js'

const game = (overrides = {}) => ({
  id: 'test-game', format: 'singles', target: 21, scores: [22, 15], winner: 0,
  teams: [{ players: [{ name: ' Alex ' }] }, { players: [{ name: 'Sam' }] }],
  rallies: [
    { team: 0, detail: { playerSide: 0, playerIndex: 0, outcomeKind: 'winner' } },
    { team: 1, detail: { playerSide: 0, playerIndex: 0, outcomeKind: 'error' } },
    { team: 0 },
  ],
  ...overrides,
})

test('captures normalized final scores and only attributed player rallies', () => {
  const result = completedMatchResult(game())
  assert.deepEqual(result, {
    format: 'singles', target: 21, scores: [22, 15], winner: 0,
    players: [
      { name: 'Alex', side: 0, pointsWon: 1, errors: 1 },
      { name: 'Sam', side: 1, pointsWon: 0, errors: 0 },
    ],
  })
  assert.deepEqual(calculateLeaderboard([result]).map((entry) => [entry.name, entry.wins, entry.losses, entry.difference, entry.pointsWon, entry.errors]), [
    ['Alex', 1, 0, 7, 1, 1], ['Sam', 0, 1, -7, 0, 0],
  ])
})

test('rejects unfinished, invalid-score, blank, oversized, and duplicate-player games', () => {
  for (const values of [
    { winner: null }, { scores: [21, 20] }, { scores: [31, 29] }, { scores: [22.5, 10] },
    { scores: [10, 22] }, { target: 10 }, { format: 'triples' },
    { teams: [{ players: [{ name: ' ' }] }, { players: [{ name: 'Sam' }] }] },
    { teams: [{ players: [{ name: 'x'.repeat(81) }] }, { players: [{ name: 'Sam' }] }] },
    { teams: [{ players: [{ name: ' ALEX ' }] }, { players: [{ name: 'alex' }] }] },
    { format: 'doubles' },
  ]) assert.throws(() => completedMatchResult(game(values)))
})

test('accepts 20-point threshold, deuce, and the 30-point cap', () => {
  for (const values of [
    { target: 20, scores: [21, 10] },
    { scores: [26, 24] },
    { scores: [30, 29] },
    { scores: [29, 30], winner: 1 },
  ]) assert.doesNotThrow(() => completedMatchResult(game(values)))
})

test('doubles credits both teammates once and keeps their individual performance separate', () => {
  const result = completedMatchResult(game({
    format: 'doubles',
    teams: [
      { players: [{ name: 'Alex' }, { name: 'Lee' }] },
      { players: [{ name: 'Sam' }, { name: 'Jo' }] },
    ],
  }))
  const entries = calculateLeaderboard([result])
  assert.equal(entries.length, 4)
  assert.deepEqual(entries.map((entry) => [entry.name, entry.wins, entry.losses, entry.pointsFor, entry.pointsAgainst]), [
    ['Alex', 1, 0, 22, 15], ['Lee', 1, 0, 22, 15],
    ['Jo', 0, 1, 15, 22], ['Sam', 0, 1, 15, 22],
  ])
  assert.deepEqual(entries.map((entry) => entry.rank), [1, 1, 3, 3])
  assert.equal(entries.find((entry) => entry.name === 'Lee').pointsWon, 0)
})

test('accumulates repeated case-insensitive names across matches without rounding ranking ratios', () => {
  const a = completedMatchResult(game())
  const b = completedMatchResult(game({
    teams: [{ players: [{ name: 'alex' }] }, { players: [{ name: 'Sam' }] }],
    scores: [10, 22], winner: 1, rallies: [],
  }))
  const alex = calculateLeaderboard([a, b]).find((entry) => entry.key === 'alex')
  assert.equal(alex.played, 2)
  assert.equal(alex.wins, 1)
  assert.equal(alex.losses, 1)
  assert.equal(alex.winRate, 0.5)
  assert.equal(alex.difference, -5)
})

test('ranks by wins then exact win percentage then points difference with shared ties', () => {
  const result = (name, winner, score = [22, 10]) => ({
    scores: score, winner,
    players: [{ name, side: 0, pointsWon: 0, errors: 0 }],
  })
  const entries = calculateLeaderboard([
    result('Two wins', 0), result('Two wins', 0), result('Two wins', 1, [10, 22]),
    result('Half', 0), result('Half', 1, [10, 22]),
    result('Perfect narrow', 0, [22, 20]), result('Perfect wide', 0),
    result('Perfect tie', 0),
  ])
  assert.deepEqual(entries.map((entry) => [entry.name, entry.rank]), [
    ['Two wins', 1], ['Perfect tie', 2], ['Perfect wide', 2], ['Perfect narrow', 4], ['Half', 5],
  ])
  assert.deepEqual(calculateLeaderboard([]), [])
})
