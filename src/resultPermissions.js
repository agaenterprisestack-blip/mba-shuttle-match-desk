import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'

export const registerSignedInUser = async (fullName) => {
  if (!auth?.currentUser || !db) throw new Error('Sign in to register your user name.')
  await setDoc(doc(db, 'signedInUsers', auth.currentUser.uid), { fullName, lastSeenAt: serverTimestamp() })
}

export const subscribeToResultSaving = (uid, onAccess, onError) => onSnapshot(
  doc(db, 'resultWriters', uid), { includeMetadataChanges: true },
  (snapshot) => onAccess(snapshot.exists() && !snapshot.metadata.fromCache), onError,
)

export const subscribeToPermissionEntries = (collectionName, onEntries, onError) => {
  if (!['signedInUsers', 'resultWriters'].includes(collectionName)) throw new Error('Choose a valid permission list.')
  return onSnapshot(collection(db, collectionName), { includeMetadataChanges: true },
    (snapshot) => onEntries(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })), snapshot.metadata.fromCache), onError)
}

export const changeResultSavingAccess = async (uid, allowed) => {
  if (!auth?.currentUser || !db) throw new Error('Sign in to manage saving access.')
  if (typeof uid !== 'string' || !uid || uid.includes('/') || typeof allowed !== 'boolean') {
    throw new Error('Choose a valid user and permission.')
  }
  const adminUid = auth.currentUser.uid
  await runTransaction(db, async (transaction) => {
    const admin = await transaction.get(doc(db, 'admins', adminUid))
    if (!admin.exists()) throw new Error('Only admins can manage saving access.')
    const user = await transaction.get(doc(db, 'signedInUsers', uid))
    if (!user.exists()) throw new Error('This user is no longer in the signed-in user list.')
    const reference = doc(db, 'resultWriters', uid)
    if (allowed) transaction.set(reference, { grantedBy: adminUid, grantedAt: serverTimestamp() })
    else transaction.delete(reference)
  })
}
