import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'admin-user' } }
const db = {}
const timestamp = {}
const unsubscribe = mock.fn()
const onSnapshot = mock.fn(() => unsubscribe)
let admin = true
let writer = false
let stored = null
const transaction = {
  get: mock.fn(async (reference) => reference.collection === 'admins'
    ? { exists: () => admin }
    : reference.collection === 'resultWriters' ? { exists: () => writer }
      : { exists: () => stored !== null, data: () => stored }),
  set: mock.fn((reference, data) => { stored = data }),
  delete: mock.fn(),
}
mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', { namedExports: {
  collection: (database, path) => ({ database, path }),
  doc: (database, collection, id) => ({ database, collection, id }),
  onSnapshot,
  runTransaction: async (database, callback) => callback(transaction),
  serverTimestamp: () => timestamp,
} })
const { saveLeaderboardResult, saveChallengeSeriesResult, subscribeToMatchResults, deleteLeaderboardResults } = await import('./leaderboardStore.js')
const game = {
  id: 'unique-game', format: 'singles', target: 20, scores: [22, 10], winner: 0,
  teams: [{ players: [{ name: 'Alex' }] }, { players: [{ name: 'Sam' }] }],
  rallies: [],
}

test('saves a final result once with authenticated provenance; retries do not double count', async () => {
  await saveLeaderboardResult(game)
  await saveLeaderboardResult(game)
  assert.equal(transaction.set.mock.callCount(), 1)
  assert.deepEqual(transaction.set.mock.calls[0].arguments[0], { database: db, collection: 'matchResults', id: 'unique-game' })
  assert.equal(stored.createdBy, 'admin-user')
  assert.equal(stored.createdAt, timestamp)
  assert.equal(stored.players.length, 2)
  await assert.rejects(saveLeaderboardResult({ ...game, scores: [22, 12] }), /different saved final result/)
  assert.equal(transaction.set.mock.callCount(), 1)
})

test('rejects unapproved and signed-out saves and invalid match IDs', async () => {
  admin = false
  await assert.rejects(saveLeaderboardResult(game), /grant individual-game saving access/)
  admin = true
  const user = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(saveLeaderboardResult(game), /Sign in/)
  } finally {
    auth.currentUser = user
  }
  await assert.rejects(saveLeaderboardResult({ ...game, id: null }), /identifier/)
})

test('approved users can save individual games but cannot save series or delete records; revocation blocks retries', async () => {
  admin = false
  writer = true
  stored = null
  try {
    await saveLeaderboardResult(game)
    assert.equal(stored.createdBy, auth.currentUser.uid)
    await assert.rejects(saveChallengeSeriesResult({
      ...game, series: { id: 'denied-series', bestOf: 3, games: [{ winner: 0, scores: [21, 10] }] },
    }), /Only admins/)
    await assert.rejects(deleteLeaderboardResults(['unique-game']), /Only admins/)
    writer = false
    await assert.rejects(saveLeaderboardResult(game), /grant individual-game saving access/)
  } finally {
    admin = true
    writer = false
  }
})

test('forwards saved results, cache status and Firebase listener errors', () => {
  const receive = mock.fn()
  const failure = mock.fn()
  assert.equal(subscribeToMatchResults(receive, failure), unsubscribe)
  const [reference, options, callback, onError] = onSnapshot.mock.calls[0].arguments
  assert.equal(reference.path, 'matchResults')
  assert.deepEqual(options, { includeMetadataChanges: true })
  assert.equal(onError, failure)
  callback({ docs: [{ id: 'unique-game', data: () => stored }], metadata: { fromCache: false } })
  assert.deepEqual(receive.mock.calls[0].arguments, [[{ ...stored, id: 'unique-game' }], false])
})

test('does not report success when Firebase rejects the transaction', async () => {
  transaction.get.mock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
  await assert.rejects(saveLeaderboardResult(game), /permission-denied/)
})

test('deletes only selected match records and deduplicates IDs', async () => {
  transaction.delete.mock.resetCalls()
  assert.equal(await deleteLeaderboardResults(['match-a', 'match-a', 'match-b']), 2)
  assert.deepEqual(transaction.delete.mock.calls.map((call) => call.arguments[0]), [
    { database: db, collection: 'matchResults', id: 'match-a' },
    { database: db, collection: 'matchResults', id: 'match-b' },
  ])
})

test('blocks deletion for non-admin, signed-out, and invalid requests', async () => {
  transaction.delete.mock.resetCalls()
  admin = false
  await assert.rejects(deleteLeaderboardResults(['match-a']), /Only admins/)
  admin = true
  const user = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(deleteLeaderboardResults(['match-a']), /Sign in/)
  } finally {
    auth.currentUser = user
  }
  for (const ids of [null, [], [''], [null], ['other/collection']]) {
    await assert.rejects(deleteLeaderboardResults(ids), /valid saved match/)
  }
  assert.equal(transaction.delete.mock.callCount(), 0)
})

test('large resets use bounded transactions and recheck authority for each group', async () => {
  transaction.get.mock.resetCalls()
  transaction.delete.mock.resetCalls()
  const ids = Array.from({ length: 205 }, (_, index) => `match-${index}`)
  assert.equal(await deleteLeaderboardResults(ids), 205)
  assert.equal(transaction.get.mock.callCount(), 3)
  assert.equal(transaction.delete.mock.callCount(), 205)
  assert.ok(transaction.get.mock.calls.every((call) => call.arguments[0].collection === 'admins'))
})

test('deletion failures propagate and partially completed resets report their progress', async () => {
  transaction.get.mock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
  await assert.rejects(deleteLeaderboardResults(['one']), /permission-denied/)
  transaction.get.mock.mockImplementationOnce(async () => ({ exists: () => true }))
  transaction.get.mock.mockImplementationOnce(async () => { throw new Error('connection lost') }, transaction.get.mock.callCount() + 1)
  await assert.rejects(deleteLeaderboardResults(Array.from({ length: 101 }, (_, index) => `result-${index}`)),
    /100 selected records were deleted.*connection lost/)
})

const challenge = { ...game, series: { id: 'series-id', bestOf: 3, games: [{ winner: 0, scores: [21, 10] }] } }

test('Challenge series save uses its stable ID and separate collection with idempotent retries', async () => {
  stored = null
  transaction.set.mock.resetCalls()
  await saveChallengeSeriesResult(challenge)
  await saveChallengeSeriesResult(challenge)
  assert.equal(transaction.set.mock.callCount(), 1)
  assert.deepEqual(transaction.set.mock.calls[0].arguments[0], { database: db, collection: 'seriesResults', id: 'series-id' })
  assert.deepEqual(stored.scores, [2, 0])
  assert.equal(stored.createdAt, timestamp)
  assert.equal(stored.createdBy, 'admin-user')
  await assert.rejects(saveChallengeSeriesResult({ ...challenge, scores: [21, 12] }), /different saved final result/)
  await assert.rejects(saveChallengeSeriesResult({ ...challenge, series: { ...challenge.series, id: null } }), /identifier/)
})

test('Challenge series save rejects non-admin and signed-out callers and propagates backend errors', async () => {
  admin = false
  await assert.rejects(saveChallengeSeriesResult(challenge), /Only admins/)
  admin = true
  const user = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(saveChallengeSeriesResult(challenge), /Sign in/)
  } finally {
    auth.currentUser = user
  }
  transaction.get.mock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
  await assert.rejects(saveChallengeSeriesResult(challenge), /permission-denied/)
})

test('Challenge series subscriptions and deletions are isolated from individual games', async () => {
  const receive = mock.fn()
  subscribeToMatchResults(receive, mock.fn(), 'series')
  const call = onSnapshot.mock.calls.at(-1).arguments
  assert.equal(call[0].path, 'seriesResults')
  call[2]({ docs: [{ id: 'series-id', data: () => stored }], metadata: { fromCache: false } })
  assert.equal(receive.mock.calls[0].arguments[0][0].id, 'series-id')
  transaction.delete.mock.resetCalls()
  await deleteLeaderboardResults(['series-id'], 'series')
  assert.equal(transaction.delete.mock.calls[0].arguments[0].collection, 'seriesResults')
  await assert.rejects(deleteLeaderboardResults(['id'], 'invalid'), /valid leaderboard/)
})
