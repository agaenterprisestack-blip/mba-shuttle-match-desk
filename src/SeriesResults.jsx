import { useState } from 'react'
import { paginateLeaderboard, resultSideNames } from './leaderboard.js'
import InfoHint from './InfoHint.jsx'

const savedDate = (result) => result.createdAt instanceof Date
  ? result.createdAt : result.createdAt?.toDate?.()

function SeriesResults({ results, periodLabel }) {
  const [page, setPage] = useState(1)
  const ordered = [...results].sort((a, b) =>
    (savedDate(b)?.getTime() || 0) - (savedDate(a)?.getTime() || 0) || a.id.localeCompare(b.id))
  const pagination = paginateLeaderboard(ordered, page)
  return (
    <section className="series-results" aria-labelledby="series-results-title">
      <h2 id="series-results-title">Challenge series results</h2>
      <p>{periodLabel} · Newest first</p>
      <InfoHint label="Reading series results"><p>Opponent-by-opponent results. Game scores follow the same side order as the opponents. Results are ordered by save date.</p></InfoHint>
      {!results.length && <p>No saved Challenge series for this selection.</p>}
      <ol className="series-results-list" start={pagination.first || 1}>
        {pagination.players.map((result) => {
          const sides = resultSideNames(result)
          const date = savedDate(result)
          return <li key={result.id}>
            <h3>{sides[0]} <span>vs</span> {sides[1]}</h3>
            <p><strong>Series score: {result.scores.join(' - ')}</strong> · Winner: <strong>{sides[result.winner]}</strong></p>
            <p>{result.format === 'doubles' ? 'Doubles' : 'Singles'} · Best of {result.bestOf} · Saved: {date
              ? <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>
              : 'Date not confirmed'}</p>
            <ol aria-label={`Game scores for ${sides.join(' vs ')}`}>
              {result.games.map((game, index) => <li key={index}>
                Game {index + 1}: <strong>{game.scores.join(' - ')}</strong> · Winner: {sides[game.winner]}
              </li>)}
            </ol>
          </li>
        })}
      </ol>
      {results.length > 0 && <nav className="leaderboard-pagination" aria-label="Challenge series result pages">
        <button type="button" disabled={pagination.page === 1}
          onClick={() => setPage(pagination.page - 1)}>Previous results</button>
        <p role="status">Page {pagination.page} of {pagination.pageCount} · Series {pagination.first}–{pagination.last} of {results.length}</p>
        <button type="button" disabled={pagination.page === pagination.pageCount}
          onClick={() => setPage(pagination.page + 1)}>Next results</button>
      </nav>}
    </section>
  )
}

export default SeriesResults
