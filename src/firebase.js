import { getAuth } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)
const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null

export const firebaseErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Sign in or reset your password.'
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Enable Email/Password sign-in in Firebase Authentication for this project.'
    case 'auth/network-request-failed':
    case 'unavailable':
      return 'Firebase could not be reached. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait before trying again.'
    case 'permission-denied':
      return 'Firebase data access was denied. Check the Firestore rules and your sign-in.'
    default:
      return `Firebase request failed (${error.code || error.message}). Please try again.`
  }
}
