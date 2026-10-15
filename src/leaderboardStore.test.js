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
}
mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', { namedExports: {
  collection: (database, path) => ({ database, path }),
  doc: (database, collection, id) => ({ database, collection, id }),
  onSnapshot,
  runTransaction: async (database, callback) => callback(transaction),
  serverTimestamp: () => timestamp,
} })
const { saveLeaderboardResult, subscribeToMatchResults } = await import('./leaderboardStore.js')
const game = {
  id: 'unique-game', format: 'singles', target: 21, scores: [22, 10], winner: 0,
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
  callback({ docs: [{ data: () => stored }], metadata: { fromCache: false } })
  assert.deepEqual(receive.mock.calls[0].arguments, [[stored], false])
})

test('does not report success when Firebase rejects the transaction', async () => {
  transaction.get.mock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
  await assert.rejects(saveLeaderboardResult(game), /permission-denied/)
})
