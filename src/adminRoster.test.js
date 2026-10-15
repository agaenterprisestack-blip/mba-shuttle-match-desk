import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'admin-user' } }
const db = {}
const timestamp = {}
const unsubscribe = mock.fn()
const onSnapshot = mock.fn(() => unsubscribe)
let adminExists = true
let playerExists = false
const transaction = {
  get: mock.fn(async (reference) => ({
    exists: () => reference.collection === 'admins' ? adminExists : playerExists,
  })),
  set: mock.fn(),
  delete: mock.fn(),
}
mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', { namedExports: {
  doc: (database, collection, id) => ({ database, collection, id }),
  collection: (database, path) => ({ database, path }),
  onSnapshot,
  serverTimestamp: () => timestamp,
  runTransaction: async (database, callback) => {
    assert.equal(database, db)
    return callback(transaction)
  },
} })
const { managePlayerName, subscribeToAdminAccess, subscribeToRemovedPlayers } = await import('./adminRoster.js')
const reset = () => {
  adminExists = true
  playerExists = false
  transaction.get.mock.resetCalls()
  transaction.set.mock.resetCalls()
  transaction.delete.mock.resetCalls()
}

test('only grants UI access from a server-confirmed admin document', () => {
  const access = mock.fn()
  const failure = mock.fn()
  assert.equal(subscribeToAdminAccess('admin-user', access, failure), unsubscribe)
  const [reference, options, callback, onError] = onSnapshot.mock.calls.at(-1).arguments
  assert.equal(reference.id, 'admin-user')
  assert.deepEqual(options, { includeMetadataChanges: true })
  assert.equal(onError, failure)
  callback({ exists: () => true, metadata: { fromCache: true } })
  callback({ exists: () => true, metadata: { fromCache: false } })
  callback({ exists: () => false, metadata: { fromCache: false } })
  assert.deepEqual(access.mock.calls.map((call) => call.arguments[0]), [false, true, false])
})

test('adds normalized names and removes their deletion marker atomically', async () => {
  reset()
  await managePlayerName(' Alex  Smith ')
  assert.deepEqual(transaction.set.mock.calls[0].arguments, [
    { database: db, collection: 'players', id: 'player-alex%20smith' },
    { name: 'Alex Smith', createdBy: 'admin-user', createdAt: timestamp },
  ])
  assert.equal(transaction.delete.mock.calls[0].arguments[0].collection, 'removedPlayers')
})

test('deletes the exact listed player ID and records a canonical name suppression', async () => {
  reset()
  await managePlayerName('ALEX', { removeId: 'legacy-alex' })
  assert.deepEqual(transaction.delete.mock.calls[0].arguments[0], {
    database: db, collection: 'players', id: 'legacy-alex',
  })
  assert.deepEqual(transaction.set.mock.calls[0].arguments, [
    { database: db, collection: 'removedPlayers', id: 'player-alex' },
    { name: 'ALEX', deletedBy: 'admin-user', deletedAt: timestamp },
  ])
})

test('does not overwrite a duplicate player while clearing suppression', async () => {
  reset()
  playerExists = true
  await managePlayerName('Alex')
  assert.equal(transaction.set.mock.callCount(), 0)
  assert.equal(transaction.delete.mock.callCount(), 1)
})

test('rejects non-admins before making any writes', async () => {
  reset()
  adminExists = false
  await assert.rejects(managePlayerName('Alex'), /Only designated admins/)
  await assert.rejects(managePlayerName('Alex', { removeId: 'player-alex' }), /Only designated admins/)
  assert.equal(transaction.set.mock.callCount(), 0)
  assert.equal(transaction.delete.mock.callCount(), 0)
})

test('rejects invalid names and signed-out writes', async () => {
  reset()
  await assert.rejects(managePlayerName('  '), /1 to 80/)
  await assert.rejects(managePlayerName('x'.repeat(81)), /1 to 80/)
  const user = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(managePlayerName('Alex'), /Sign in/)
  } finally {
    auth.currentUser = user
  }
  assert.equal(transaction.get.mock.callCount(), 0)
})

test('subscribes to sorted removed names and forwards listener errors', () => {
  const receive = mock.fn()
  const failure = mock.fn()
  assert.equal(subscribeToRemovedPlayers(receive, failure), unsubscribe)
  const [reference, , callback, onError] = onSnapshot.mock.calls.at(-1).arguments
  assert.equal(reference.path, 'removedPlayers')
  assert.equal(onError, failure)
  callback({ docs: [
    { id: 'z', data: () => ({ name: 'Zoe' }) },
    { id: 'a', data: () => ({ name: 'Alex' }) },
  ], metadata: { fromCache: false } })
  assert.deepEqual(receive.mock.calls[0].arguments, [[{ id: 'a', name: 'Alex' }, { id: 'z', name: 'Zoe' }], false])
})

test('propagates transaction failures without reporting success', async () => {
  reset()
  const failure = new Error('unavailable')
  transaction.get.mock.mockImplementationOnce(async () => { throw failure })
  await assert.rejects(managePlayerName('Alex'), (error) => error === failure)
  assert.equal(transaction.set.mock.callCount(), 0)
})
