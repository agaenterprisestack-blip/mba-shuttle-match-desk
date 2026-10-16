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

const { emptyProfile, needsNickname, normalizeProfile, loadAccountProfile, saveAccountProfile } = await import('./accountProfile.js')

test('requires full name and nickname but accepts empty optional details', () => {
  const profile = { ...emptyProfile, fullName: '  Alex \t Smith ', nickname: ' Ace \t Alex ' }
  assert.deepEqual(normalizeProfile(profile), { fullName: 'Alex Smith', nickname: 'Ace Alex', phone: '', city: '', club: '' })
  assert.throws(() => normalizeProfile({ ...emptyProfile, fullName: '   ' }), /full name/)
  for (const nickname of ['', '   ', undefined, 'n'.repeat(81)]) {
    assert.throws(() => normalizeProfile({ ...profile, nickname }), /nickname/)
  }
})

test('normalizes optional details and enforces their exact maximum lengths', () => {
  assert.deepEqual(normalizeProfile({
    fullName: 'Alex', nickname: ' Ace ', phone: ' +91 1234567890 ', city: ' New  Delhi ', club: '  City  Club ',
  }), { fullName: 'Alex', nickname: 'Ace', phone: '+91 1234567890', city: 'New Delhi', club: 'City Club' })
  const maximum = { fullName: 'n'.repeat(80), nickname: 'a'.repeat(80), phone: '1'.repeat(32), city: 'c'.repeat(80), club: 't'.repeat(80) }
  assert.deepEqual(normalizeProfile(maximum), maximum)
  for (const key of Object.keys(maximum)) {
    assert.throws(() => normalizeProfile({ ...maximum, [key]: `${maximum[key]}x` }))
  }
})

test('saves owner profile separately from the shared roster without password/email', async () => {
  transaction.set.mock.resetCalls()
  const details = { ...emptyProfile, fullName: ' Alex ', nickname: ' Ace ', password: 'never-store-this', email: 'not-a-profile-field' }
  const saved = await saveAccountProfile('profile-owner', details)
  assert.deepEqual(saved, { fullName: 'Alex', nickname: 'Ace', phone: '', city: '', club: '' })
  assert.deepEqual(transaction.set.mock.calls[0].arguments, [
    { database: db, collection: 'profiles', id: 'profile-owner' },
    { ...saved, createdAt: timestamp },
  ])
})

test('retries do not overwrite an already saved profile', async () => {
  const existing = { ...emptyProfile, fullName: 'Original', nickname: 'Original Nick' }
  transaction.get.mock.mockImplementation(async () => ({ exists: () => true, data: () => existing }))
  transaction.set.mock.resetCalls()
  assert.deepEqual(await saveAccountProfile('profile-owner', { ...emptyProfile, fullName: 'Changed', nickname: 'Changed Nick' }), existing)
  assert.equal(transaction.set.mock.callCount(), 0)
})

test('rejects an unauthenticated save or a different account UID', async () => {
  const details = { ...emptyProfile, fullName: 'Alex', nickname: 'Ace' }
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
  const profile = { ...emptyProfile, fullName: 'Saved Name', nickname: 'Saved Nick' }
  getDocFromServer.mock.mockImplementation(async () => ({ exists: () => true, data: () => profile }))
  assert.deepEqual(await loadAccountProfile('profile-owner'), profile)
})

test('surfaces profile load and save errors for explicit retry', async () => {
  const failure = new Error('permission-denied')
  getDocFromServer.mock.mockImplementation(async () => { throw failure })
  transaction.get.mock.mockImplementation(async () => { throw failure })
  await assert.rejects(loadAccountProfile('profile-owner'), (error) => error === failure)
  await assert.rejects(saveAccountProfile('profile-owner', { ...emptyProfile, fullName: 'Alex', nickname: 'Ace' }),
    (error) => error === failure)
})

test('identifies legacy profiles without inventing a nickname from the full name', () => {
  assert.equal(needsNickname({ fullName: 'Alex' }), true)
  assert.equal(needsNickname({ nickname: '   ' }), true)
  assert.equal(needsNickname({ nickname: 'n'.repeat(81) }), true)
  assert.equal(needsNickname({ nickname: 'Ace' }), false)
})

test('completes legacy profiles once, preserving original fields and creation time', async () => {
  const legacy = { fullName: 'Original Name', phone: '123', city: 'Original City', club: 'Original Club', createdAt: 'original-time' }
  transaction.get.mock.mockImplementation(async () => ({ exists: () => true, data: () => legacy }))
  transaction.set.mock.resetCalls()
  const completed = await saveAccountProfile('profile-owner', {
    ...emptyProfile, fullName: 'Changed Name', nickname: ' Ace ', phone: '456',
  })
  assert.deepEqual(completed, { ...legacy, nickname: 'Ace' })
  assert.deepEqual(transaction.set.mock.calls[0].arguments[1], completed)
  transaction.get.mock.mockImplementation(async () => ({ exists: () => true, data: () => completed }))
  transaction.set.mock.resetCalls()
  assert.deepEqual(await saveAccountProfile('profile-owner', {
    ...emptyProfile, fullName: 'Changed', nickname: 'Another Nick',
  }), completed)
  assert.equal(transaction.set.mock.callCount(), 0)
})
