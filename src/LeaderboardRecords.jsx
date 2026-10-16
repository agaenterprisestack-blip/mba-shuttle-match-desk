import { useRef, useState } from 'react'
import { paginateLeaderboard, resultSideNames } from './leaderboard.js'
import { deleteLeaderboardResults } from './leaderboardStore.js'
import { firebaseErrorMessage } from './firebase.js'
import InfoHint from './InfoHint.jsx'

const matchLabel = (result) => resultSideNames(result).join(' vs ')

function LeaderboardRecords({ results, ready, kind = 'games' }) {
  const isSeries = kind === 'series'
  const recordLabel = isSeries ? 'series' : 'match'
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState(null)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const working = useRef(false)
  const pagination = paginateLeaderboard(results, page)

  const requestDelete = (records, reset) => {
    setPending({ ids: records.map((result) => result.id), reset, label: reset ? '' : matchLabel(records[0]) })
    setConfirmation('')
    setError('')
    setMessage('')
  }
  const removeRecords = async () => {
    if (working.current || !ready || !pending || (pending.reset && confirmation !== 'RESET')) return
    working.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const count = await deleteLeaderboardResults(pending.ids, kind)
      setMessage(`${count} selected ${recordLabel} records deleted. Player and doubles-pair standings update automatically.`)
      setPending(null)
    } catch (failure) {
      setError(firebaseErrorMessage(failure))
      setPending(null)
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="leaderboard-records-title">
      <h2 id="leaderboard-records-title">Admin: Saved {isSeries ? 'Challenge series' : 'match'} records</h2>
      <InfoHint label="About record management"><p>These are all saved {isSeries ? 'Challenge series' : 'individual games'}, regardless of the standings view or period above. Deletions are permanent and affect player and pair standings in this competition only. {isSeries ? 'Individual game records' : 'Challenge series records'}, accounts and player suggestions are not deleted.</p></InfoHint>
      {!ready && <p role="status">Record changes require a confirmed server connection.</p>}
      <button className="admin-delete" type="button" disabled={!ready || busy || !results.length}
        onClick={() => requestDelete(results, true)}>{isSeries ? 'Reset Challenge series leaderboard' : 'Reset entire leaderboard'}</button>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="admin-feedback" role="status">{message}</p>}
      {busy && <p role="status">Deleting selected {recordLabel} records...</p>}
      {pending && <section className="admin-confirm" aria-labelledby="delete-records-title">
        <h3 id="delete-records-title">{pending.reset ? (isSeries ? 'Reset the Challenge series leaderboard?' : 'Reset the entire leaderboard?') : `Delete this ${recordLabel} record?`}</h3>
        <p>{pending.reset
          ? `Permanently delete all ${pending.ids.length} currently loaded ${recordLabel} records across every period. Results saved after this confirmation opened are not included.`
          : pending.label}</p>
        <p>This cannot be undone. Saved {isSeries ? 'series' : 'matches'} must be recorded again to restore their results.</p>
        {pending.reset && <label>Type RESET to confirm
          <input value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
        </label>}
        <div className="admin-add-row">
          <button className="admin-delete" type="button"
            disabled={!ready || busy || (pending.reset && confirmation !== 'RESET')}
            onClick={removeRecords}>{pending.reset ? 'Confirm reset' : 'Confirm delete record'}</button>
          <button type="button" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
        </div>
      </section>}
      <ul className="admin-player-list">
        {pagination.players.map((result) => <li key={result.id}>
          <span>{matchLabel(result)} · {result.scores.join(' - ')} · {result.format}
            {isSeries && <> · Best of {result.bestOf}
              <br />Games: {result.games.map((game) => game.scores.join(' - ')).join(', ')}</>}
            <br />Record: {result.id}</span>
          <button className="admin-delete" type="button" disabled={!ready || busy}
            aria-label={`Delete match ${result.id}`} onClick={() => requestDelete([result], false)}>Delete record</button>
        </li>)}
      </ul>
      {ready && !results.length && <p>No saved {recordLabel} records.</p>}
      {results.length > 0 && <nav className="leaderboard-pagination" aria-label="Saved match record pages">
        <button type="button" disabled={busy || pagination.page === 1}
          onClick={() => setPage(pagination.page - 1)}>Previous records</button>
        <p role="status">Records {pagination.first}–{pagination.last} of {results.length}</p>
        <button type="button" disabled={busy || pagination.page === pagination.pageCount}
          onClick={() => setPage(pagination.page + 1)}>Next records</button>
      </nav>}
    </section>
  )
}

export default LeaderboardRecords
