import assert from 'node:assert/strict'
import { test } from 'node:test'
import { availablePlayerNames, duplicatePlayerNames } from './playerNames.js'

test('duplicate player names ignore capitalization and repeated whitespace', () => {
  assert.deepEqual(duplicatePlayerNames(['Arun Kumar', ' arun   KUMAR ', 'Ravi', 'RAVI']), ['arun KUMAR', 'RAVI'])
})

test('duplicate player names identify teammates and opponents without repeating the warning', () => {
  assert.deepEqual(duplicatePlayerNames(['Alex', 'Alex', 'Alex', 'Sam']), ['Alex'])
  assert.deepEqual(duplicatePlayerNames(['Alex', 'Sam', 'Jo', 'Lee']), [])
})

test('empty slots do not count as duplicate player identities and input is unchanged', () => {
  const names = [' ', '', ' Alex ', 'alex']
  assert.deepEqual(duplicatePlayerNames(names), ['alex'])
  assert.deepEqual(names, [' ', '', ' Alex ', 'alex'])
})

test('suggestions exclude names used in other slots using normalized identity', () => {
  const saved = ['Arun Kumar', 'Ravi', 'Bala']
  assert.deepEqual(availablePlayerNames(saved, [' arun   KUMAR ', 'RAVI', '']), ['Bala'])
  assert.deepEqual(saved, ['Arun Kumar', 'Ravi', 'Bala'])
})

test('clearing or replacing another slot restores its previous suggestion', () => {
  const saved = ['Alex', 'Sam', 'Jo']
  assert.deepEqual(availablePlayerNames(saved, ['Alex']), ['Sam', 'Jo'])
  assert.deepEqual(availablePlayerNames(saved, ['']), saved)
  assert.deepEqual(availablePlayerNames(saved, ['Sam']), ['Alex', 'Jo'])
})
