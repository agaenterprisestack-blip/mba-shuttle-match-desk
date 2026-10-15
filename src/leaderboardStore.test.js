import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'admin-user' } }
const db = {}
const timestamp = {}
const unsubscribe = mock.fn()
const onSnapshot = mock.fn(() => unsubscribe)
let admin = true
let stored = null
const transaction = {
  get: mock.fn(async (reference) => reference.collection === 'admins'
    ? { exists: () => admin }
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
const { saveLeaderboardResult, subscribeToMatchResults, deleteLeaderboardResults } = await import('./leaderboardStore.js')
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

test('rejects non-admin and signed-out saves and invalid match IDs', async () => {
  admin = false
  await assert.rejects(saveLeaderboardResult(game), /Only admins/)
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
