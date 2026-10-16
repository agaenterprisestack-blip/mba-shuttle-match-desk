import { useEffect, useState } from 'react'
import { emptyProfile, loadAccountProfile, needsNickname, saveAccountProfile } from './accountProfile.js'
import { firebaseErrorMessage } from './firebase.js'
import ProfileFields from './ProfileFields.jsx'
import { savePlayerName } from './playerRoster.js'
import { registerSignedInUser } from './resultPermissions.js'

function AccountProfileGate({ uid, initialDetails, onComplete, children }) {
  const [profile, setProfile] = useState(null)
  const [details, setDetails] = useState(initialDetails || emptyProfile)
  const [loading, setLoading] = useState(true)
  const [addingNickname, setAddingNickname] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [rosterError, setRosterError] = useState('')
  const [rosterRetry, setRosterRetry] = useState(0)
  const [directoryError, setDirectoryError] = useState('')
  const [directoryRetry, setDirectoryRetry] = useState(0)

  useEffect(() => {
    if (!profile) return
    let active = true
    registerSignedInUser(profile.fullName).catch((failure) => {
      if (active) setDirectoryError(firebaseErrorMessage(failure))
    })
    return () => { active = false }
  }, [profile, directoryRetry])

  useEffect(() => {
    if (!profile) return
    let active = true
    savePlayerName(profile.nickname).catch((saveError) => {
      if (active) setRosterError(firebaseErrorMessage(saveError))
    })
    return () => { active = false }
  }, [profile, rosterRetry])

  useEffect(() => {
    let active = true
    loadAccountProfile(uid).then((savedProfile) => {
      if (!active) return
      if (savedProfile && needsNickname(savedProfile)) {
        setDetails({ ...emptyProfile, ...savedProfile, nickname: '' })
        setAddingNickname(true)
        setProfile(null)
      } else {
        setProfile(savedProfile)
        setAddingNickname(false)
      }
      setLoading(false)
    }).catch((loadError) => {
      if (!active) return
      setError(firebaseErrorMessage(loadError))
      setLoading(false)
    })
    return () => { active = false }
  }, [uid, retry])

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      setProfile(await saveAccountProfile(uid, details))
      onComplete()
    } catch (saveError) {
      setError(firebaseErrorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="auth-loading" role="status">Loading your profile...</main>
  if (profile) return (
    <>
      {directoryError && <div className="account-welcome auth-error" role="alert">
        <p>Your name could not be registered in the admin saving-access list. {directoryError}</p>
        <button type="button" onClick={() => {
          setDirectoryError(''); setDirectoryRetry((current) => current + 1)
        }}>Retry registering my name</button>
      </div>}
      {rosterError && (
        <div className="account-welcome auth-error" role="alert">
          <p>Your profile is saved, but your name could not be added to player suggestions. {rosterError}</p>
          <button type="button" onClick={() => {
            setRosterError('')
            setRosterRetry((current) => current + 1)
          }}>Retry adding my name</button>
        </div>
      )}
      {children(profile)}
    </>
  )

  return (
    <main className="profile-setup">
      <h1>{addingNickname ? 'Add your player nickname' : 'Complete your profile'}</h1>
      <p>{addingNickname
        ? 'Choose the nickname to show in player suggestions. Your existing profile details will stay unchanged.'
        : 'Your account is signed in. Save your details to continue; no need to create another account.'}</p>
      <form className="login-form" onSubmit={handleSave}>
        <ProfileFields value={details} onChange={setDetails} disabled={busy} nicknameOnly={addingNickname} />
        {error && (
          <div className="auth-error" role="alert">
            <p>{error} Your details have not been confirmed saved.</p>
            <button type="button" disabled={busy} onClick={() => {
              setError('')
              setLoading(true)
              setRetry((current) => current + 1)
            }}>Retry loading profile</button>
          </div>
        )}
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? 'Saving profile...' : 'Save profile and continue'}
        </button>
      </form>
    </main>
  )
}

export default AccountProfileGate
