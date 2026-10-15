import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { normalizePlayerName, playerDocumentId } from './playerRoster.js'

export const subscribeToAdminAccess = (uid, onAccess, onError) => onSnapshot(
  doc(db, 'admins', uid),
  { includeMetadataChanges: true },
  (snapshot) => onAccess(snapshot.exists() && !snapshot.metadata.fromCache),
  onError,
)

export const subscribeToRemovedPlayers = (onPlayers, onError) => onSnapshot(
  collection(db, 'removedPlayers'),
  { includeMetadataChanges: true },
  (snapshot) => onPlayers(
    snapshot.docs.map((entry) => ({ id: entry.id, name: entry.data().name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    snapshot.metadata.fromCache,
  ),
  onError,
)

export const managePlayerName = async (value, { removeId } = {}) => {
  const name = normalizePlayerName(value)
  if (!name || name.length > 80) throw new Error('Player names must contain 1 to 80 characters.')
  if (!auth?.currentUser || !db) throw new Error('Sign in to manage player names.')
  const uid = auth.currentUser.uid
  const player = doc(db, 'players', playerDocumentId(name))
  const removedPlayer = doc(db, 'removedPlayers', playerDocumentId(name))

  await runTransaction(db, async (transaction) => {
    const admin = await transaction.get(doc(db, 'admins', uid))
    if (!admin.exists()) throw new Error('Only designated admins can manage player names.')
    if (removeId) {
      transaction.set(removedPlayer, { name, deletedBy: uid, deletedAt: serverTimestamp() })
      transaction.delete(doc(db, 'players', removeId))
    } else {
      const existing = await transaction.get(player)
      transaction.delete(removedPlayer)
      if (!existing.exists()) {
        transaction.set(player, { name, createdBy: uid, createdAt: serverTimestamp() })
      }
    }
  })
}
