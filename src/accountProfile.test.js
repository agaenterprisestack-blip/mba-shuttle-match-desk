import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const auth = { currentUser: { uid: 'profile-owner' } }
const db = {}
const timestamp = {}
const getDocFromServer = mock.fn()
const transaction = {
  get: mock.fn(async () => ({ exists: () => false })),
  set: mock.fn(),
}

mock.module('./firebase.js', { namedExports: { auth, db } })
mock.module('firebase/firestore', {
  namedExports: {
    doc: (database, collection, id) => ({ database, collection, id }),
    getDocFromServer,
    runTransaction: async (database, callback) => {
      assert.equal(database, db)
      return callback(transaction)
    },
    serverTimestamp: () => timestamp,
  },
})

const { emptyProfile, normalizeProfile, loadAccountProfile, saveAccountProfile } = await import('./accountProfile.js')

test('requires full name but accepts an empty optional phone, city, and club', () => {
  const profile = { ...emptyProfile, fullName: '  Alex \t Smith ' }
  assert.deepEqual(normalizeProfile(profile), { fullName: 'Alex Smith', phone: '', city: '', club: '' })
  assert.throws(() => normalizeProfile({ ...emptyProfile, fullName: '   ' }), /full name/)
})

test('normalizes optional details and enforces their exact maximum lengths', () => {
  assert.deepEqual(normalizeProfile({
    fullName: 'Alex', phone: ' +91 1234567890 ', city: ' New  Delhi ', club: '  City  Club ',
  }), { fullName: 'Alex', phone: '+91 1234567890', city: 'New Delhi', club: 'City Club' })
  const maximum = { fullName: 'n'.repeat(80), phone: '1'.repeat(32), city: 'c'.repeat(80), club: 't'.repeat(80) }
  assert.deepEqual(normalizeProfile(maximum), maximum)
  for (const key of Object.keys(maximum)) {
    assert.throws(() => normalizeProfile({ ...maximum, [key]: `${maximum[key]}x` }))
  }
})

test('saves owner profile separately from the shared roster without password/email', async () => {
  transaction.set.mock.resetCalls()
  const details = { ...emptyProfile, fullName: ' Alex ', password: 'never-store-this', email: 'not-a-profile-field' }
  const saved = await saveAccountProfile('profile-owner', details)
  assert.deepEqual(saved, { fullName: 'Alex', phone: '', city: '', club: '' })
  assert.deepEqual(transaction.set.mock.calls[0].arguments, [
    { database: db, collection: 'profiles', id: 'profile-owner' },
    { ...saved, createdAt: timestamp },
  ])
})

test('retries do not overwrite an already saved profile', async () => {
  const existing = { ...emptyProfile, fullName: 'Original' }
  transaction.get.mock.mockImplementation(async () => ({ exists: () => true, data: () => existing }))
  transaction.set.mock.resetCalls()
  assert.deepEqual(await saveAccountProfile('profile-owner', { ...emptyProfile, fullName: 'Changed' }), existing)
  assert.equal(transaction.set.mock.callCount(), 0)
})

test('rejects an unauthenticated save or a different account UID', async () => {
  const details = { ...emptyProfile, fullName: 'Alex' }
  await assert.rejects(saveAccountProfile('someone-else', details), /Sign in/)
  const currentUser = auth.currentUser
  auth.currentUser = null
  try {
    await assert.rejects(saveAccountProfile('profile-owner', details), /Sign in/)
  } finally {
    auth.currentUser = currentUser
  }
})

test('loads saved profile from the server and distinguishes missing documents', async () => {
  getDocFromServer.mock.mockImplementation(async () => ({ exists: () => false }))
  assert.equal(await loadAccountProfile('profile-owner'), null)
  assert.deepEqual(getDocFromServer.mock.calls.at(-1).arguments[0],
    { database: db, collection: 'profiles', id: 'profile-owner' })
  const profile = { ...emptyProfile, fullName: 'Saved Name' }
  getDocFromServer.mock.mockImplementation(async () => ({ exists: () => true, data: () => profile }))
  assert.deepEqual(await loadAccountProfile('profile-owner'), profile)
})

test('surfaces profile load and save errors for explicit retry', async () => {
  const failure = new Error('permission-denied')
  getDocFromServer.mock.mockImplementation(async () => { throw failure })
  transaction.get.mock.mockImplementation(async () => { throw failure })
  await assert.rejects(loadAccountProfile('profile-owner'), (error) => error === failure)
  await assert.rejects(saveAccountProfile('profile-owner', { ...emptyProfile, fullName: 'Alex' }),
    (error) => error === failure)
})
