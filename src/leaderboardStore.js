import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { completedMatchResult } from './leaderboard.js'

export const saveLeaderboardResult = async (match) => {
  if (!auth?.currentUser || !db) throw new Error('Sign in to save a leaderboard result.')
  if (!match.id) throw new Error('This match has no result identifier. Start a new game.')
  const result = completedMatchResult(match)
  const uid = auth.currentUser.uid
  const reference = doc(db, 'matchResults', match.id)
  await runTransaction(db, async (transaction) => {
    const admin = await transaction.get(doc(db, 'admins', uid))
    if (!admin.exists()) throw new Error('Only admins can save leaderboard results.')
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

export const subscribeToMatchResults = (onResults, onError) => onSnapshot(
  collection(db, 'matchResults'),
  { includeMetadataChanges: true },
  (snapshot) => onResults(snapshot.docs.map((entry) => entry.data()), snapshot.metadata.fromCache),
  onError,
)
