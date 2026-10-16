import { useEffect, useState } from 'react'
import { managePlayerName, subscribeToAdminAccess } from './adminRoster.js'
import { subscribeToPlayerEntries } from './playerRoster.js'
import { firebaseErrorMessage } from './firebase.js'
import Leaderboard from './Leaderboard.jsx'
import ResultPermissions from './ResultPermissions.jsx'
import { subscribeToResultSaving } from './resultPermissions.js'
import InfoHint from './InfoHint.jsx'
import { ClipboardList, ShieldCheck, Trophy, Users } from 'lucide-react'

function PlayerAdminPage() {
  const [players, setPlayers] = useState([])
  const [playersReady, setPlayersReady] = useState(false)
  const [name, setName] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const unsubscribePlayers = subscribeToPlayerEntries((entries, fromCache) => {
      setPlayers(entries)
      setPlayersReady(!fromCache)
    }, (failure) => {
      setPlayersReady(false)
      setLoadError(firebaseErrorMessage(failure))
    })
    return unsubscribePlayers
  }, [retry])

  const ready = playersReady && !loadError
  const changePlayer = async (value, removeId) => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await managePlayerName(value, { removeId })
      setMessage(removeId ? `"${value}" removed from suggestions.` : `"${value.trim()}" is available in suggestions.`)
      setPendingDelete(null)
      if (!removeId) setName('')
    } catch (failure) {
      setError(firebaseErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-shell admin-page">
      <p className="eyebrow">Administration</p>
      <h1>Manage player names</h1>
      <InfoHint label="About player suggestions"><p>Add names to the shared suggestions or remove them for everyone. This does not delete accounts or change names in an existing match.</p></InfoHint>
      {loadError ? (
        <div className="auth-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => {
            setLoadError('')
            setPlayersReady(false)
            setRetry((current) => current + 1)
          }}>Retry loading players</button>
        </div>
      ) : !ready && <p role="status">Connecting to the shared roster. Changes require a server connection.</p>}
      <form className="admin-add-form" onSubmit={(event) => {
        event.preventDefault()
        changePlayer(name)
      }}>
        <label htmlFor="admin-player-name">Player name</label>
        <div className="admin-add-row">
          <input id="admin-player-name" value={name} maxLength={80} required pattern={'.*\\S.*'}
            disabled={busy || !ready} onChange={(event) => setName(event.target.value)} />
          <button type="submit" disabled={busy || !ready}>Add player</button>
        </div>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="admin-feedback" role="status">{message}</p>}
      {busy && <p role="status">Saving roster change...</p>}
      <section aria-labelledby="active-players-title">
        <h2 id="active-players-title">Player suggestions ({players.length})</h2>
        {ready && players.length === 0 && <p>No player names yet. Add one above.</p>}
        <ul className="admin-player-list">
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <button className="admin-delete" type="button" disabled={busy || !ready}
                aria-label={`Delete ${player.name}`} onClick={() => {
                  setError('')
                  setMessage('')
                  setPendingDelete(player)
                }}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
      {pendingDelete && (
        <section className="admin-confirm" aria-labelledby="delete-player-title">
          <h2 id="delete-player-title">Delete "{pendingDelete.name}"?</h2>
          <p>This name will stay removed even after sign-in.</p>
          <div className="admin-add-row">
            <button className="admin-delete" type="button" disabled={busy || !ready}
              onClick={() => changePlayer(pendingDelete.name, pendingDelete.id)}>Confirm delete</button>
            <button type="button" disabled={busy} onClick={() => setPendingDelete(null)}>Cancel</button>
          </div>
        </section>
      )}
    </main>
  )
}

function AdminWorkspace({ uid, children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState('match')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => subscribeToAdminAccess(uid, setIsAdmin, (failure) => {
    setIsAdmin(false)
    setError(firebaseErrorMessage(failure))
  }), [uid, retry])
  const [canSaveGames, setCanSaveGames] = useState(false)
  useEffect(() => subscribeToResultSaving(uid, setCanSaveGames, (failure) => {
    setCanSaveGames(false)
    setError(firebaseErrorMessage(failure))
  }), [uid, retry])

  const showingAdmin = isAdmin && page === 'admin'
  const showingPermissions = isAdmin && page === 'permissions'
  return (
    <>
      {error && (
        <div className="account-welcome auth-error" role="alert">
          <p>Workspace permissions could not be checked. {error}</p>
          <button type="button" onClick={() => {
            setError('')
            setRetry((current) => current + 1)
          }}>Retry workspace permissions</button>
        </div>
      )}
        <nav className="admin-navigation" aria-label="Workspace">
          <button type="button" aria-current={page === 'match' || (['admin', 'permissions'].includes(page) && !isAdmin) ? 'page' : undefined}
            onClick={() => setPage('match')}><ClipboardList size={18} aria-hidden="true" />Match desk</button>
          <button type="button" aria-current={page === 'leaderboard' ? 'page' : undefined}
            onClick={() => setPage('leaderboard')}><Trophy size={18} aria-hidden="true" />Leaderboard</button>
          {isAdmin && <button type="button" aria-current={showingAdmin ? 'page' : undefined}
            onClick={() => setPage('admin')}><Users size={18} aria-hidden="true" />Admin: Players</button>}
          {isAdmin && <button type="button" aria-current={showingPermissions ? 'page' : undefined}
            onClick={() => setPage('permissions')}><ShieldCheck size={18} aria-hidden="true" />Admin: Saving access</button>}
        </nav>
      <div hidden={showingAdmin || showingPermissions || page === 'leaderboard'}>{children(isAdmin, isAdmin || canSaveGames)}</div>
      {showingAdmin && <PlayerAdminPage />}
      {showingPermissions && <ResultPermissions />}
      {page === 'leaderboard' && <Leaderboard isAdmin={isAdmin} />}
    </>
  )
}

export default AdminWorkspace
