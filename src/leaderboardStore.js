import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { completedMatchResult } from './leaderboard.js'
import { completedSeriesResult } from './matchSeries.js'

export const saveLeaderboardResult = async (match) => {
  return saveResult('matchResults', match.id, completedMatchResult(match))
}

export const saveChallengeSeriesResult = async (match) => {
  return saveResult('seriesResults', match.series?.id, completedSeriesResult(match))
}

const saveResult = async (collectionName, id, result) => {
  if (!auth?.currentUser || !db) throw new Error('Sign in to save a leaderboard result.')
  if (!id) throw new Error('This match has no result identifier. Start a new game.')
  const uid = auth.currentUser.uid
  const reference = doc(db, collectionName, id)
  await runTransaction(db, async (transaction) => {
    const admin = await transaction.get(doc(db, 'admins', uid))
    if (!admin.exists()) {
      if (collectionName !== 'matchResults') throw new Error('Only admins can save Challenge series results.')
      const permission = await transaction.get(doc(db, 'resultWriters', uid))
      if (!permission.exists()) throw new Error('An admin must grant individual-game saving access.')
    }
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      const stored = existing.data()
      if (Object.keys(result).some((key) => JSON.stringify(stored[key]) !== JSON.stringify(result[key]))) {
        throw new Error('This game already has a different saved final result. Start a new game; the existing leaderboard result was not changed.')
      }
      return
    }
    transaction.set(reference, { ...result, createdBy: uid, createdAt: serverTimestamp() })
  })
}

export const subscribeToMatchResults = (onResults, onError, kind = 'games') => onSnapshot(
  collection(db, resultCollection(kind)),
  { includeMetadataChanges: true },
  (snapshot) => onResults(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })), snapshot.metadata.fromCache),
  onError,
)

const resultCollection = (kind) => {
  if (!['games', 'series'].includes(kind)) throw new Error('Choose a valid leaderboard.')
  return kind === 'series' ? 'seriesResults' : 'matchResults'
}

export const deleteLeaderboardResults = async (ids, kind = 'games') => {
  const collectionName = resultCollection(kind)
  if (!auth?.currentUser || !db) throw new Error('Sign in to delete leaderboard records.')
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string' || !id || id.includes('/'))) {
    throw new Error('Choose valid saved match records to delete.')
  }
  const uid = auth.currentUser.uid
  const uniqueIds = [...new Set(ids)]
  let deleted = 0
  try {
    // Keep each transaction below Firestore write limits and recheck admin access for every group.
    for (let offset = 0; offset < uniqueIds.length; offset += 100) {
      const group = uniqueIds.slice(offset, offset + 100)
      await runTransaction(db, async (transaction) => {
        const admin = await transaction.get(doc(db, 'admins', uid))
        if (!admin.exists()) throw new Error('Only admins can delete leaderboard records.')
        for (const id of group) transaction.delete(doc(db, collectionName, id))
      })
      deleted += group.length
    }
  } catch (failure) {
    if (deleted) throw new Error(`${deleted} selected records were deleted before the operation stopped. Refresh the remaining records and try again. ${failure.message}`, { cause: failure })
    throw failure
  }
  return deleted
}
