import { useEffect, useState } from 'react'
import { calculateLeaderboard, calculateTeamLeaderboard, filterLeaderboardResults, leaderboardPeriods, paginateLeaderboard } from './leaderboard.js'
import { subscribeToMatchResults } from './leaderboardStore.js'
import { firebaseErrorMessage } from './firebase.js'
import LeaderboardRecords from './LeaderboardRecords.jsx'

function Leaderboard({ isAdmin = false }) {
  const [results, setResults] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [period, setPeriod] = useState('all')
  const [view, setView] = useState('players')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setNow(new Date()), Math.max(1, nextDay.getTime() - Date.now()))
    return () => clearTimeout(timer)
  }, [now])
  useEffect(() => subscribeToMatchResults((entries, fromCache) => {
    setResults(entries)
    setReady(!fromCache)
  }, (failure) => {
    setReady(false)
    setError(firebaseErrorMessage(failure))
  }), [retry])
  const isTeams = view === 'teams'
  const scopedResults = isTeams ? results.filter((result) => result.format === 'doubles') : results
  const filtered = filterLeaderboardResults(scopedResults, period, now)
  const players = isTeams ? calculateTeamLeaderboard(filtered.results) : calculateLeaderboard(filtered.results)
  const pagination = paginateLeaderboard(players, page)
  const periodLabel = leaderboardPeriods.find((entry) => entry.value === period).label
  const standingsLabel = isTeams ? 'Doubles-pair standings' : 'Player standings'
  return (
    <main className="page-shell admin-page">
      <p className="eyebrow">{periodLabel} {isTeams ? 'team' : 'player'} performance</p>
      <h1>Leaderboard</h1>
      <p>Ranked by match wins, then win percentage, then team points difference. Only completed results saved by an admin count.</p>
      <p>{isTeams
        ? 'Each doubles pair is ranked together, regardless of player order or court side. A different partner forms a separate pair. Singles do not count in this view.'
        : 'Singles and doubles are combined. Each teammate receives the team result and score.'} Names identify players: use distinct names for different people.</p>
      <div className="leaderboard-filters">
        <label htmlFor="leaderboard-view">Standings</label>
        <select id="leaderboard-view" value={view} onChange={(event) => {
          setView(event.target.value)
          setPage(1)
        }}>
          <option value="players">Players</option>
          <option value="teams">Doubles pairs</option>
        </select>
        <label htmlFor="leaderboard-period">Period</label>
        <select id="leaderboard-period" value={period} onChange={(event) => {
          setPeriod(event.target.value)
          setPage(1)
          setNow(new Date())
        }}>
          {leaderboardPeriods.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
        </select>
      </div>
      <p>Periods use the date the result was saved, in your local time zone. Weeks run Monday through Sunday.</p>
      {error ? <div className="auth-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => {
          setError('')
          setRetry((current) => current + 1)
        }}>Retry leaderboard</button>
      </div> : !ready && <p role="status">Connecting to Firebase. Any displayed standings may be cached.</p>}
      <p role="status">{filtered.results.length} saved {isTeams ? 'doubles ' : ''}matches · {players.length} {isTeams ? 'pairs' : 'players'} · {periodLabel}</p>
      {filtered.undatedCount > 0 && <p role="status">{filtered.undatedCount} results without a confirmed save date are excluded from this period. They remain visible under All time.</p>}
      {ready && players.length === 0 && <p>No {isTeams ? 'doubles ' : ''}results for this period. An admin can save a completed {isTeams ? 'doubles ' : ''}game from its final-result panel.</p>}
      {players.length > 0 && <div className="leaderboard-scroll" role="region" aria-label={standingsLabel} tabIndex={0}>
        <table className="leaderboard-table">
          <caption>{standingsLabel}: {periodLabel}</caption>
          <thead><tr>
            {['Rank', isTeams ? 'Doubles pair' : 'Player', 'Played', 'Wins', 'Losses', 'Points for', 'Points against', '+/-', ...(!isTeams ? ['Player points', 'Errors'] : [])].map((title) => <th scope="col" key={title}>{title}</th>)}
          </tr></thead>
          <tbody>{pagination.players.map((player) => <tr key={player.key}>
            <td>{player.rank}</td><th scope="row">{player.name}</th>
            <td>{player.played}</td><td>{player.wins}</td><td>{player.losses}</td>
            <td>{player.pointsFor}</td><td>{player.pointsAgainst}</td><td>{player.difference > 0 ? '+' : ''}{player.difference}</td>
            {!isTeams && <><td>{player.pointsWon}</td><td>{player.errors}</td></>}
          </tr>)}</tbody>
        </table>
      </div>}
      {players.length > 0 && <nav className="leaderboard-pagination" aria-label="Leaderboard pages">
        <button type="button" disabled={pagination.page === 1}
          onClick={() => setPage(pagination.page - 1)}>Previous</button>
        <p role="status">Page {pagination.page} of {pagination.pageCount} · {isTeams ? 'Pairs' : 'Players'} {pagination.first}–{pagination.last} of {players.length}</p>
        <button type="button" disabled={pagination.page === pagination.pageCount}
          onClick={() => setPage(pagination.page + 1)}>Next</button>
      </nav>}
      <p>{isTeams
        ? 'Each saved doubles match counts once per pair, with the team score counted once rather than once per teammate.'
        : 'Player points and errors count only rallies attributed to that player. Team-only points affect the score but not individual rally statistics.'} Removing a roster suggestion does not erase past performance.</p>
      {isAdmin && <LeaderboardRecords results={results} ready={ready && !error} />}
    </main>
  )
}

export default Leaderboard
