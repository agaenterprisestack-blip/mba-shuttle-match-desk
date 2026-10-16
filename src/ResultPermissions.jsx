import { useEffect, useRef, useState } from 'react'
import { changeResultSavingAccess, subscribeToPermissionEntries } from './resultPermissions.js'
import { firebaseErrorMessage } from './firebase.js'
import { paginateLeaderboard } from './leaderboard.js'
import InfoHint from './InfoHint.jsx'

function ResultPermissions() {
  const [users, setUsers] = useState([])
  const [writers, setWriters] = useState([])
  const [ready, setReady] = useState({ users: false, writers: false })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [page, setPage] = useState(1)
  const working = useRef(false)
  useEffect(() => {
    const fail = (failure) => {
      setReady({ users: false, writers: false })
      setError(firebaseErrorMessage(failure))
    }
    const usersOff = subscribeToPermissionEntries('signedInUsers', (entries, cached) => {
      setUsers(entries.sort((a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id)))
      setReady((current) => ({ ...current, users: !cached }))
    }, fail)
    const writersOff = subscribeToPermissionEntries('resultWriters', (entries, cached) => {
      setWriters(entries.map((entry) => entry.id))
      setReady((current) => ({ ...current, writers: !cached }))
    }, fail)
    return () => { usersOff(); writersOff() }
  }, [retry])
  const connected = ready.users && ready.writers && !error
  const pagination = paginateLeaderboard(users, page)
  const changeAccess = async (user, allowed) => {
    if (working.current || !connected) return
    working.current = true
    setBusy(true)
    setMessage('')
    try {
      await changeResultSavingAccess(user.id, allowed)
      setMessage(`${user.fullName}: individual-game saving access ${allowed ? 'granted' : 'revoked'}. Admin access is unchanged.`)
    } catch (failure) {
      setError(firebaseErrorMessage(failure))
    } finally {
      working.current = false
      setBusy(false)
    }
  }
  return <main className="page-shell admin-page">
    <p className="eyebrow">Administration</p>
    <h1>Leaderboard saving access</h1>
    <InfoHint label="About saving permissions">
      <p>Selected users can save individual-game results only. Challenge series saving, deletion, resets, and permission management remain admin-only. Admins always retain saving access.</p>
      <p>Users appear after their next sign-in or app reload with a completed profile. Names and user IDs identify accounts; this is not an online-user list.</p>
    </InfoHint>
    {error && <div className="auth-error" role="alert"><p>{error}</p>
      <button type="button" disabled={busy} onClick={() => {
        setError(''); setReady({ users: false, writers: false }); setRetry((current) => current + 1)
      }}>Retry user permissions</button>
    </div>}
    {!connected && !error && <p role="status">Connecting to Firebase. Permission changes require a server connection.</p>}
    {message && <p className="admin-feedback" role="status">{message}</p>}
    {busy && <p role="status">Saving permission...</p>}
    {connected && !users.length && <p>No users have registered in this list yet.</p>}
    <ul className="admin-player-list">
      {pagination.players.map((user) => <li key={user.id}>
        <span><strong>{user.fullName}</strong><br />User ID: {user.id}<br />
          Individual-game saving: {writers.includes(user.id) ? 'Allowed' : 'Not granted (admins still have access)'}</span>
        <button type="button" disabled={!connected || busy}
          aria-label={`${writers.includes(user.id) ? 'Revoke' : 'Allow'} individual-game saving for ${user.fullName} (${user.id})`}
          onClick={() => changeAccess(user, !writers.includes(user.id))}>
          {writers.includes(user.id) ? 'Revoke saving' : 'Allow saving'}
        </button>
      </li>)}
    </ul>
    {users.length > 0 && <nav className="leaderboard-pagination" aria-label="User permission pages">
      <button type="button" disabled={pagination.page === 1 || busy} onClick={() => setPage(pagination.page - 1)}>Previous users</button>
      <p role="status">Users {pagination.first}–{pagination.last} of {users.length}</p>
      <button type="button" disabled={pagination.page === pagination.pageCount || busy} onClick={() => setPage(pagination.page + 1)}>Next users</button>
    </nav>}
  </main>
}

export default ResultPermissions
