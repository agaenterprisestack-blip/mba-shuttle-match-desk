import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'

export const emptyProfile = { fullName: '', nickname: '', phone: '', city: '', club: '' }

export const needsNickname = (profile) => typeof profile.nickname !== 'string'
  || !profile.nickname.trim() || profile.nickname.length > 80

export const normalizeProfile = (details) => {
  const profile = {
    fullName: details.fullName.trim().replace(/\s+/g, ' '),
    nickname: (details.nickname || '').trim().replace(/\s+/g, ' '),
    phone: details.phone.trim(),
    city: details.city.trim().replace(/\s+/g, ' '),
    club: details.club.trim().replace(/\s+/g, ' '),
  }
  if (!profile.fullName || profile.fullName.length > 80) {
    throw new Error('Enter your full name using 1 to 80 characters.')
  }
  if (needsNickname(profile)) {
    throw new Error('Enter your nickname using 1 to 80 characters.')
  }
  if (profile.phone.length > 32 || profile.city.length > 80 || profile.club.length > 80) {
    throw new Error('Phone number must be at most 32 characters; city and club/team at most 80.')
  }
  return profile
}

export const loadAccountProfile = async (uid) => {
  const snapshot = await getDocFromServer(doc(db, 'profiles', uid))
  return snapshot.exists() ? snapshot.data() : null
}

export const saveAccountProfile = async (uid, details) => {
  const profile = normalizeProfile(details)
  if (!db || auth?.currentUser?.uid !== uid) throw new Error('Sign in to save your profile.')

  const reference = doc(db, 'profiles', uid)
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      const saved = existing.data()
      if (!needsNickname(saved)) return saved
      const completed = { ...saved, nickname: profile.nickname }
      transaction.set(reference, completed)
      return completed
    }
    transaction.set(reference, { ...profile, createdAt: serverTimestamp() })
    return profile
  })
}
