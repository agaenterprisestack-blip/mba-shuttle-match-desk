import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'test-user' } }
const db = {}
const transaction = {
  get: mock.fn(async () => ({ exists: () => false })),
  set: mock.fn(),
}
const unsubscribe = mock.fn()
const onSnapshot = mock.fn(() => unsubscribe)
const timestamp = {}

mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', {
  namedExports: {
    collection: (database, path) => ({ database, path }),
    doc: (database, collection, id) => ({ database, collection, id }),
    onSnapshot,
    runTransaction: async (database, callback) => {
      assert.equal(database, db)
      return callback(transaction)
    },
    serverTimestamp: () => timestamp,
  },
})

const { normalizePlayerName, playerNameKey, savePlayerName, subscribeToPlayers } = await import('./playerRoster.js')

test('normalizes whitespace and uses case-insensitive player keys', () => {
  assert.equal(normalizePlayerName('  Alex \t Smith  '), 'Alex Smith')
  assert.equal(playerNameKey(' ALEX  Smith '), playerNameKey('alex smith'))
})

test('subscribes to sorted shared names including cache-to-server metadata changes', () => {
  const onPlayers = mock.fn()
  const onError = mock.fn()
  assert.equal(subscribeToPlayers(onPlayers, onError), unsubscribe)
  const [collection, options, onData, errorCallback] = onSnapshot.mock.calls.at(-1).arguments
  assert.deepEqual(collection, { database: db, path: 'players' })
  assert.deepEqual(options, { includeMetadataChanges: true })
  assert.equal(errorCallback, onError)
  const docs = [{ data: () => ({ name: 'Zoe' }) }, { data: () => ({ name: 'Alex' }) }]
  onData({ docs, metadata: { fromCache: true } })
  onData({ docs, metadata: { fromCache: false } })
  assert.deepEqual(onPlayers.mock.calls.map((call) => call.arguments), [
    [['Alex', 'Zoe'], true],
    [['Alex', 'Zoe'], false],
  ])
})

test('stores only normalized name, authenticated creator, and server timestamp', async () => {
  transaction.get.mock.mockImplementation(async () => ({ exists: () => false }))
  transaction.set.mock.resetCalls()
  await savePlayerName('  Alex / Smith  ')
  const [reference, data] = transaction.set.mock.calls[0].arguments
  assert.deepEqual(reference, { database: db, collection: 'players', id: 'player-alex%20%2F%20smith' })
  assert.deepEqual(data, { name: 'Alex / Smith', createdBy: 'test-user', createdAt: timestamp })
})

test('does not overwrite an existing shared player', async () => {
  transaction.get.mock.mockImplementation(async (reference) => ({ exists: () => reference.collection === 'players' }))
  transaction.set.mock.resetCalls()
  await savePlayerName('ALEX')
  assert.equal(transaction.set.mock.callCount(), 0)
})

test('does not recreate an admin-removed name during automatic sign-in sync', async () => {
  transaction.get.mock.mockImplementation(async (reference) => ({ exists: () => reference.collection === 'removedPlayers' }))
  transaction.get.mock.resetCalls()
  transaction.set.mock.resetCalls()
  await savePlayerName(' ALEX ')
  assert.equal(transaction.get.mock.calls[0].arguments[0].id, 'player-alex')
  assert.equal(transaction.get.mock.callCount(), 1)
  assert.equal(transaction.set.mock.callCount(), 0)
})

test('rejects blank, oversized, and unauthenticated saves without writing', async () => {
  transaction.set.mock.resetCalls()
  await assert.rejects(savePlayerName(' \t '), /1 to 80/)
  await assert.rejects(savePlayerName('x'.repeat(81)), /1 to 80/)
  const user = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(savePlayerName('Alex'), /Sign in/)
  } finally {
    auth.currentUser = user
  }
  assert.equal(transaction.set.mock.callCount(), 0)
})

test('surfaces Firebase transaction failures instead of reporting a local save', async () => {
  const failure = new Error('permission-denied')
  transaction.get.mock.mockImplementation(async () => { throw failure })
  await assert.rejects(savePlayerName('Alex'), (error) => error === failure)
})

test('accepts full signup names up to 80 characters without truncation', async () => {
  transaction.get.mock.mockImplementation(async () => ({ exists: () => false }))
  transaction.set.mock.resetCalls()
  const name = 'n'.repeat(80)
  await savePlayerName(name)
  assert.equal(transaction.set.mock.calls[0].arguments[1].name, name)
})
