import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { normalizePlayerName, playerNameKey } from './playerNames.js'

export { normalizePlayerName, playerNameKey } from './playerNames.js'
export const playerDocumentId = (name) => `player-${encodeURIComponent(playerNameKey(name))}`

export const subscribeToPlayerEntries = (onPlayers, onError) => onSnapshot(
  collection(db, 'players'),
  { includeMetadataChanges: true },
  (snapshot) => onPlayers(
    snapshot.docs.map((entry) => ({ id: entry.id, name: entry.data().name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    snapshot.metadata.fromCache,
  ),
  onError,
)

export const subscribeToPlayers = (onPlayers, onError) => subscribeToPlayerEntries(
  (entries, fromCache) => onPlayers(entries.map((entry) => entry.name), fromCache),
  onError,
)

export const savePlayerName = async (value) => {
  const name = normalizePlayerName(value)
  if (!name || name.length > 80) throw new Error('Player names must contain 1 to 80 characters.')
  if (!auth?.currentUser || !db) throw new Error('Sign in to save player names.')

  const id = playerDocumentId(name)
  const player = doc(db, 'players', id)
  const removedPlayer = doc(db, 'removedPlayers', id)
  const uid = auth.currentUser.uid
  await runTransaction(db, async (transaction) => {
    const removed = await transaction.get(removedPlayer)
    if (removed.exists()) return
    const existing = await transaction.get(player)
    if (!existing.exists()) {
      transaction.set(player, { name, createdBy: uid, createdAt: serverTimestamp() })
    }
  })
}
