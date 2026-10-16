import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateLeaderboard, calculateTeamLeaderboard, completedMatchResult, filterLeaderboardResults, paginateLeaderboard, resultSideNames } from './leaderboard.js'

const game = (overrides = {}) => ({
  id: 'test-game', format: 'singles', target: 20, scores: [22, 15], winner: 0,
  teams: [{ players: [{ name: ' Alex ' }] }, { players: [{ name: 'Sam' }] }],
  rallies: [
    { team: 0, detail: { playerSide: 0, playerIndex: 0, outcomeKind: 'winner' } },
    { team: 1, detail: { playerSide: 0, playerIndex: 0, outcomeKind: 'error' } },
    { team: 0 },
  ],
  ...overrides,
})

test('opponent labels preserve score-side order for singles and doubles even with interleaved players', () => {
  const singles = completedMatchResult(game())
  assert.deepEqual(resultSideNames(singles), ['Alex', 'Sam'])
  const doubles = {
    winner: 1, scores: [1, 2],
    players: [
      { name: 'Ravi', side: 1 }, { name: 'Arun', side: 0 },
      { name: 'Kumar', side: 1 }, { name: 'Bala', side: 0 },
    ],
  }
  const sides = resultSideNames(doubles)
  assert.deepEqual(sides, ['Arun / Bala', 'Ravi / Kumar'])
  assert.equal(sides[doubles.winner], 'Ravi / Kumar')
})

test('captures normalized final scores and only attributed player rallies', () => {
  const result = completedMatchResult(game())
  assert.deepEqual(result, {
    format: 'singles', target: 20, scores: [22, 15], winner: 0,
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
    { scores: [10, 22] }, { target: 10 }, { target: 21 }, { format: 'triples' },
    { teams: [{ players: [{ name: ' ' }] }, { players: [{ name: 'Sam' }] }] },
    { teams: [{ players: [{ name: 'x'.repeat(81) }] }, { players: [{ name: 'Sam' }] }] },
    { teams: [{ players: [{ name: ' ALEX ' }] }, { players: [{ name: 'alex' }] }] },
    { format: 'doubles' },
  ]) assert.throws(() => completedMatchResult(game(values)))
})

test('accepts 20 and 14 game-point thresholds, deuce, and the 30-point cap', () => {
  for (const values of [
    { target: 20, scores: [21, 10] },
    { target: 14, scores: [15, 10] },
    { target: 14, scores: [17, 15] },
    { scores: [26, 24] },
    { scores: [30, 29] },
    { scores: [29, 30], winner: 1 },
  ]) assert.doesNotThrow(() => completedMatchResult(game(values)))
  assert.throws(() => completedMatchResult(game({ target: 14, scores: [14, 10] })))
  assert.throws(() => completedMatchResult(game({ target: 14, scores: [15, 14] })))
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

const doublesResult = (names = [['Alex', 'Lee'], ['Sam', 'Jo']], overrides = {}) => completedMatchResult(game({
  format: 'doubles',
  teams: names.map((players) => ({ players: players.map((name) => ({ name })) })),
  ...overrides,
}))

test('pair standings count each team score once and exclude singles', () => {
  const entries = calculateTeamLeaderboard([completedMatchResult(game()), doublesResult()])
  assert.deepEqual(entries.map((entry) => [
    entry.name, entry.played, entry.wins, entry.losses, entry.pointsFor, entry.pointsAgainst, entry.difference, entry.rank,
  ]), [
    ['Alex / Lee', 1, 1, 0, 22, 15, 7, 1],
    ['Jo / Sam', 1, 0, 1, 15, 22, -7, 2],
  ])
  assert.deepEqual(calculateTeamLeaderboard([completedMatchResult(game())]), [])
  assert.deepEqual(calculateTeamLeaderboard([]), [])
})

test('pair identity ignores case, whitespace, player order, and court side but not partner changes', () => {
  const entries = calculateTeamLeaderboard([
    doublesResult(),
    doublesResult([['jo', 'SAM'], [' lee ', ' ALEX ']]),
    doublesResult([['Alex', 'Sam'], ['Jo', 'Lee']]),
  ])
  const pair = entries.find((entry) => entry.name === 'Alex / Lee')
  assert.deepEqual([pair.played, pair.wins, pair.losses, pair.pointsFor, pair.pointsAgainst, pair.difference], [2, 1, 1, 37, 37, 0])
  assert.equal(entries.length, 4)
  assert.equal(entries.find((entry) => entry.name === 'Alex / Sam').played, 1)
})

test('pair keys do not collide when names contain the display separator', () => {
  const entries = calculateTeamLeaderboard([
    doublesResult([['A', 'B / C'], ['A / B', 'C']]),
  ])
  assert.equal(entries.length, 2)
  assert.notEqual(entries[0].key, entries[1].key)
})

test('pairs share player ranking rules, calendar filtering, and ten-entry pagination', () => {
  const results = [
    { ...doublesResult(), createdAt: new Date(2026, 8, 1) },
    ...Array.from({ length: 6 }, (_, index) => ({
      ...doublesResult([[`Winner ${index}`, `Partner ${index}`], [`Loser ${index}`, `Other ${index}`]]),
      createdAt: new Date(2026, 9, 15),
    })),
  ]
  const entries = calculateTeamLeaderboard(filterLeaderboardResults(results, 'month', new Date(2026, 9, 20)).results)
  assert.equal(entries.length, 12)
  assert.deepEqual(entries.map((entry) => entry.rank), [1, 1, 1, 1, 1, 1, 7, 7, 7, 7, 7, 7])
  assert.equal(paginateLeaderboard(entries, 1).players.length, 10)
  assert.equal(paginateLeaderboard(entries, 2).players.length, 2)
  const ranked = calculateTeamLeaderboard([
    doublesResult(),
    doublesResult([['Alex', 'Lee'], ['Sam', 'Jo']], { scores: [10, 22], winner: 1 }),
    doublesResult([['Perfect', 'Narrow'], ['Loss', 'Opponent A']], { scores: [22, 20] }),
    doublesResult([['Perfect', 'Wide'], ['Loss', 'Opponent B']]),
    doublesResult([['Two', 'Wins'], ['Loss', 'Once']]),
    doublesResult([['Two', 'Wins'], ['Loss', 'Twice']]),
  ])
  assert.deepEqual(ranked.slice(0, 3).map((entry) => entry.name), ['Two / Wins', 'Perfect / Wide', 'Narrow / Perfect'])
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

  test('calendar week includes Monday midnight through Sunday and excludes next Monday', () => {
    const now = new Date(2026, 9, 18, 15)
    const dates = [
      new Date(2026, 9, 11, 23, 59, 59, 999),
      new Date(2026, 9, 12),
      new Date(2026, 9, 18, 23, 59, 59, 999),
      new Date(2026, 9, 19),
    ]
    const results = dates.map((date, id) => ({ id, createdAt: { toMillis: () => date.getTime() } }))
    assert.deepEqual(filterLeaderboardResults(results, 'week', now).results.map((entry) => entry.id), [1, 2])
    assert.deepEqual(filterLeaderboardResults(results, 'week', new Date(2026, 9, 19)).results.map((entry) => entry.id), [3])
  })

  test('month and year filters use exact calendar boundaries, including leap years', () => {
    const dates = [
      new Date(2023, 11, 31, 23, 59, 59, 999),
      new Date(2024, 0, 1),
      new Date(2024, 1, 1),
      new Date(2024, 1, 29, 23, 59, 59, 999),
      new Date(2024, 2, 1),
      new Date(2024, 11, 31, 23, 59, 59, 999),
      new Date(2025, 0, 1),
    ]
    const results = dates.map((createdAt, id) => ({ id, createdAt }))
    const now = new Date(2024, 1, 15)
    assert.deepEqual(filterLeaderboardResults(results, 'month', now).results.map((entry) => entry.id), [2, 3])
    assert.deepEqual(filterLeaderboardResults(results, 'year', now).results.map((entry) => entry.id), [1, 2, 3, 4, 5])
  })

  test('week filtering spans year boundaries without mutating dates or source results', () => {
    const now = new Date(2027, 0, 1)
    const before = now.getTime()
    const results = [
      { createdAt: new Date(2026, 11, 27, 23, 59, 59, 999) },
      { createdAt: new Date(2026, 11, 28) },
      { createdAt: new Date(2027, 0, 3, 23, 59, 59, 999) },
      { createdAt: new Date(2027, 0, 4) },
    ]
    assert.deepEqual(filterLeaderboardResults(results, 'week', now).results, results.slice(1, 3))
    assert.equal(now.getTime(), before)
    assert.equal(results.length, 4)
  })

  test('undated results stay in all-time but are explicitly counted as excluded from date filters', () => {
    const results = [{}, { createdAt: null }, { createdAt: new Date('invalid') }]
    assert.deepEqual(filterLeaderboardResults(results, 'all'), { results, undatedCount: 0 })
    assert.deepEqual(filterLeaderboardResults(results, 'week'), { results: [], undatedCount: 3 })
    assert.throws(() => filterLeaderboardResults(results, 'invalid'), /valid leaderboard period/)
  })

  test('period filtering recalculates performance instead of filtering already aggregated ranks', () => {
    const oldResult = { ...completedMatchResult(game()), createdAt: new Date(2026, 8, 1) }
    const currentResult = {
      ...completedMatchResult(game({ scores: [10, 21], winner: 1 })),
      createdAt: new Date(2026, 9, 15),
    }
    const filtered = filterLeaderboardResults([oldResult, currentResult], 'month', new Date(2026, 9, 20))
    const players = calculateLeaderboard(filtered.results)
    assert.equal(players[0].name, 'Sam')
    assert.equal(players[0].played, 1)
    assert.equal(players[0].wins, 1)
    assert.equal(players[0].difference, 11)
  })

  test('pagination displays exactly ten players per page and preserves overall ranks', () => {
    const players = Array.from({ length: 23 }, (_, index) => ({ rank: index + 1 }))
    assert.deepEqual(paginateLeaderboard(players, 1), {
      page: 1, pageCount: 3, players: players.slice(0, 10), first: 1, last: 10,
    })
    assert.deepEqual(paginateLeaderboard(players, 2), {
      page: 2, pageCount: 3, players: players.slice(10, 20), first: 11, last: 20,
    })
    assert.deepEqual(paginateLeaderboard(players, 3), {
      page: 3, pageCount: 3, players: players.slice(20), first: 21, last: 23,
    })
    assert.equal(paginateLeaderboard(players.slice(0, 10), 2).pageCount, 1)
  })

  test('pagination clamps stale pages after live updates and handles empty results', () => {
    assert.deepEqual(paginateLeaderboard([], 5), {
      page: 1, pageCount: 1, players: [], first: 0, last: 0,
    })
    const players = [{ rank: 1 }]
    assert.equal(paginateLeaderboard(players, 3).page, 1)
    assert.equal(paginateLeaderboard(players, 0).page, 1)
  })
