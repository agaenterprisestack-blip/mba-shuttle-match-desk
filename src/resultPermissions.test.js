import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'admin' } }
const db = {}
const timestamp = {}
const setDoc = mock.fn()
const onSnapshot = mock.fn(() => () => {})
let admin = true
let userExists = true
const transaction = {
  get: mock.fn(async (reference) => ({ exists: () => reference.collection === 'admins' ? admin : userExists })),
  set: mock.fn(),
  delete: mock.fn(),
}
mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', { namedExports: {
  doc: (database, collection, id) => ({ database, collection, id }),
  collection: (database, path) => ({ database, path }),
  setDoc, onSnapshot, serverTimestamp: () => timestamp,
  runTransaction: async (database, callback) => callback(transaction),
} })
const { registerSignedInUser, changeResultSavingAccess, subscribeToResultSaving, subscribeToPermissionEntries } = await import('./resultPermissions.js')

test('directory registration includes only the current UID, name and server timestamp', async () => {
  await registerSignedInUser('Alex')
  assert.deepEqual(setDoc.mock.calls[0].arguments, [
    { database: db, collection: 'signedInUsers', id: 'admin' },
    { fullName: 'Alex', lastSeenAt: timestamp },
  ])
})

test('saving permission is fail-closed for cached results and forwards errors', () => {
  const access = mock.fn()
  const failure = mock.fn()
  subscribeToResultSaving('user', access, failure)
  const [reference, , receive, error] = onSnapshot.mock.calls.at(-1).arguments
  assert.equal(reference.collection, 'resultWriters')
  assert.equal(reference.id, 'user')
  receive({ exists: () => true, metadata: { fromCache: true } })
  receive({ exists: () => true, metadata: { fromCache: false } })
  receive({ exists: () => false, metadata: { fromCache: false } })
  assert.deepEqual(access.mock.calls.map((call) => call.arguments[0]), [false, true, false])
  assert.equal(error, failure)
})

test('admins grant and revoke only selected registered user permissions', async () => {
  await changeResultSavingAccess('user', true)
  assert.deepEqual(transaction.set.mock.calls[0].arguments, [
    { database: db, collection: 'resultWriters', id: 'user' },
    { grantedBy: 'admin', grantedAt: timestamp },
  ])
  await changeResultSavingAccess('user', false)
  assert.equal(transaction.delete.mock.calls[0].arguments[0].id, 'user')
  assert.ok(transaction.get.mock.calls.some((call) => call.arguments[0].collection === 'signedInUsers'))
})

test('nonadmins, missing users, malformed requests and signed-out users cannot change permissions', async () => {
  admin = false
  await assert.rejects(changeResultSavingAccess('user', true), /Only admins/)
  admin = true
  userExists = false
  await assert.rejects(changeResultSavingAccess('user', true), /no longer/)
  userExists = true
  for (const [uid, allowed] of [['', true], ['bad/path', true], ['user', 'true']]) {
    await assert.rejects(changeResultSavingAccess(uid, allowed), /valid user/)
  }
  const currentUser = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(changeResultSavingAccess('user', true), /Sign in/)
    await assert.rejects(registerSignedInUser('Alex'), /Sign in/)
  } finally {
    auth.currentUser = currentUser
  }
})

test('directory subscriptions forward entries, cache state and errors without accessing profiles', () => {
  const receive = mock.fn()
  const error = mock.fn()
  subscribeToPermissionEntries('signedInUsers', receive, error)
  const [reference, , callback, failure] = onSnapshot.mock.calls.at(-1).arguments
  assert.equal(reference.path, 'signedInUsers')
  callback({ docs: [{ id: 'user', data: () => ({ fullName: 'Alex' }) }], metadata: { fromCache: false } })
  assert.deepEqual(receive.mock.calls[0].arguments, [[{ id: 'user', fullName: 'Alex' }], false])
  assert.equal(failure, error)
  assert.throws(() => subscribeToPermissionEntries('profiles', receive, error), /valid permission list/)
})
