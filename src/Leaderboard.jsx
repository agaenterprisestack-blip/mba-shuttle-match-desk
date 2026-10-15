import { useEffect, useState } from 'react'
import { calculateLeaderboard } from './leaderboard.js'
import { subscribeToMatchResults } from './leaderboardStore.js'
import { firebaseErrorMessage } from './firebase.js'

function Leaderboard() {
  const [results, setResults] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => subscribeToMatchResults((entries, fromCache) => {
    setResults(entries)
    setReady(!fromCache)
  }, (failure) => {
    setReady(false)
    setError(firebaseErrorMessage(failure))
  }), [retry])
  const players = calculateLeaderboard(results)
  return (
    <main className="page-shell admin-page">
      <p className="eyebrow">All-time player performance</p>
      <h1>Leaderboard</h1>
      <p>Ranked by match wins, then win percentage, then team points difference. Only completed results saved by an admin count.</p>
      <p>Singles and doubles are combined. Each teammate receives the team result and score. Names identify players: use distinct names for different people.</p>
      {error ? <div className="auth-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => {
          setError('')
          setRetry((current) => current + 1)
        }}>Retry leaderboard</button>
      </div> : !ready && <p role="status">Connecting to Firebase. Any displayed standings may be cached.</p>}
      <p role="status">{results.length} saved matches · {players.length} players</p>
      {ready && players.length === 0 && <p>No results yet. An admin can save a completed game from its final-result panel.</p>}
      {players.length > 0 && <div className="leaderboard-scroll" role="region" aria-label="Player standings" tabIndex={0}>
        <table className="leaderboard-table">
          <caption>Player standings across all saved matches</caption>
          <thead><tr>
            {['Rank', 'Player', 'Played', 'Wins', 'Losses', 'Win %', 'Points for', 'Points against', '+/-', 'Player points', 'Errors'].map((title) => <th scope="col" key={title}>{title}</th>)}
          </tr></thead>
          <tbody>{players.map((player) => <tr key={player.key}>
            <td>{player.rank}</td><th scope="row">{player.name}</th>
            <td>{player.played}</td><td>{player.wins}</td><td>{player.losses}</td>
            <td>{(player.winRate * 100).toFixed(1)}%</td>
            <td>{player.pointsFor}</td><td>{player.pointsAgainst}</td><td>{player.difference > 0 ? '+' : ''}{player.difference}</td>
            <td>{player.pointsWon}</td><td>{player.errors}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p>Player points and errors count only rallies attributed to that player. Team-only points affect the score but not individual rally statistics. Removing a roster suggestion does not erase past performance.</p>
    </main>
  )
}

export default Leaderboard
