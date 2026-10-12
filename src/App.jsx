import { useState } from 'react'
import './App.css'

const createTeams = () => [
  {
    name: 'Home side',
    players: [
      { name: 'Home 1', image: '' },
      { name: 'Home 2', image: '' },
    ],
  },
  {
    name: 'Away side',
    players: [
      { name: 'Away 1', image: '' },
      { name: 'Away 2', image: '' },
    ],
  },
]

const rallyOutcomes = [
  { label: 'Shot point', kind: 'winner' },
  { label: 'Drop point', kind: 'winner' },
  { label: 'Serve net', kind: 'error' },
  { label: 'Serve out', kind: 'error' },
  { label: 'Smash out', kind: 'error' },
]

function App() {
  const [format, setFormat] = useState('doubles')
  const [target, setTarget] = useState(21)
  const [teams, setTeams] = useState(createTeams)
  const [openingServe, setOpeningServe] = useState(0)
  const [match, setMatch] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [pointEntry, setPointEntry] = useState(null)

  const playersPerSide = format === 'singles' ? 1 : 2

  const updateTeam = (teamIndex, updates) => {
    setTeams((current) => current.map((team, index) =>
      index === teamIndex ? { ...team, ...updates } : team,
    ))
  }

  const updatePlayer = (teamIndex, playerIndex, updates) => {
    setTeams((current) => current.map((team, index) => {
      if (index !== teamIndex) return team
      return {
        ...team,
        players: team.players.map((player, slot) =>
          slot === playerIndex ? { ...player, ...updates } : player,
        ),
      }
    }))
  }

  const handlePhoto = (event, teamIndex, playerIndex) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => updatePlayer(teamIndex, playerIndex, { image: reader.result })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const startMatch = (event) => {
    event.preventDefault()
    setUndoStack([])
    setMatch({
      format,
      target: Number(target),
      displayOrder: [0, 1],
      teams: teams.map((team) => ({
        ...team,
        players: team.players.slice(0, playersPerSide).map((player, index) => ({
          ...player,
          court: index,
        })),
      })),
      scores: [0, 0],
      serveSide: openingServe,
      firstServe: openingServe,
      rallies: [],
      winner: null,
    })
  }

  const scorePoint = (teamIndex, detail = null) => {
    if (!match || match.winner !== null) return

    setUndoStack((current) => [...current, match])
    setMatch((current) => {
      const scores = [...current.scores]
      scores[teamIndex] += 1

      const updatedTeams = current.teams.map((team, side) => {
        if (side !== teamIndex || side !== current.serveSide || current.format !== 'doubles') return team
        return {
          ...team,
          players: team.players.map((player) => ({ ...player, court: 1 - player.court })),
        }
      })

      const rallies = [
        ...current.rallies,
        { number: current.rallies.length + 1, team: teamIndex, scores: [...scores], detail },
      ]

      return {
        ...current,
        teams: updatedTeams,
        scores,
        serveSide: teamIndex,
        rallies,
        winner: scores[teamIndex] >= current.target ? teamIndex : null,
      }
    })
  }

  const recordOutcome = (outcome) => {
    if (!pointEntry) return

    const player = match.teams[pointEntry.side].players[pointEntry.playerIndex]
    const scoringSide = outcome.kind === 'error' ? 1 - pointEntry.side : pointEntry.side
    scorePoint(scoringSide, {
      outcome: outcome.label,
      outcomeKind: outcome.kind,
      playerName: player.name || 'Unnamed player',
      playerSide: pointEntry.side,
      playerIndex: pointEntry.playerIndex,
    })
    setPointEntry(null)
  }

  const undoPoint = () => {
    if (!undoStack.length) return
    const previousMatch = undoStack[undoStack.length - 1]
    setMatch((current) => ({ ...previousMatch, displayOrder: current.displayOrder }))
    setUndoStack((current) => current.slice(0, -1))
  }

  const switchSides = () => {
    setMatch((current) => ({
      ...current,
      displayOrder: [current.displayOrder[1], current.displayOrder[0]],
    }))
  }

  const resetMatch = () => {
    if (!window.confirm('Reset the score and point log for this game?')) return

    setUndoStack([])
    setPointEntry(null)
    setMatch((current) => ({
      ...current,
      teams: current.teams.map((team) => ({
        ...team,
        players: team.players.map((player, index) => ({ ...player, court: index })),
      })),
      scores: [0, 0],
      displayOrder: [0, 1],
      serveSide: current.firstServe,
      rallies: [],
      winner: null,
    }))
  }

  const getServer = (side) => {
    const team = match.teams[side]
    if (match.format === 'singles') return team.players[0]
    const requiredCourt = match.scores[side] % 2 === 0 ? 0 : 1
    return team.players.find((player) => player.court === requiredCourt)
  }

  const getPlayerPerformance = (side, playerIndex) => {
    const pointsWon = match.rallies.filter((rally) =>
      rally.team === side &&
      rally.detail?.playerSide === side &&
      rally.detail.playerIndex === playerIndex &&
      rally.detail.outcomeKind === 'winner',
    ).length
    const totalGamePoints = match.rallies.length

    return {
      percentage: totalGamePoints ? Math.round((pointsWon / totalGamePoints) * 100) : 0,
      pointsWon,
      totalGamePoints,
    }
  }

  const returnToSetup = () => {
    setMatch(null)
    setUndoStack([])
  }

  if (!match) {
    return (
      <main className="page-shell setup-shell">
        <header className="masthead">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <p className="eyebrow">MBA / shuttle match desk</p>
            <h1>Set up your game</h1>
          </div>
          <span className="status-tag">Ready to play</span>
        </header>

        <form className="setup-layout" onSubmit={startMatch}>
          <section className="setup-main">
            <div className="section-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Match format</h2>
                <p>Choose how many players are on each side.</p>
              </div>
            </div>

            <div className="format-switch" role="group" aria-label="Match format">
              {['singles', 'doubles'].map((option) => (
                <button
                  className={format === option ? 'format-option active' : 'format-option'}
                  key={option}
                  type="button"
                  aria-pressed={format === option}
                  onClick={() => setFormat(option)}
                >
                  <span className="format-icon" aria-hidden="true">{option === 'singles' ? '1v1' : '2v2'}</span>
                  <span>{option[0].toUpperCase() + option.slice(1)}</span>
                </button>
              ))}
            </div>

            <div className="section-heading players-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Players</h2>
                <p>Add a name and photo for each player.</p>
              </div>
            </div>

            <div className="team-setup-grid">
              {teams.map((team, teamIndex) => (
                <section className={`team-setup team-${teamIndex}`} key={teamIndex}>
                  <label className="team-name-label">
                    <span className="team-dot" />
                    <input
                      aria-label={`Side ${teamIndex + 1} name`}
                      value={team.name}
                      onChange={(event) => updateTeam(teamIndex, { name: event.target.value })}
                    />
                  </label>
                  <div className="setup-player-list">
                    {team.players.slice(0, playersPerSide).map((player, playerIndex) => (
                      <div className="setup-player" key={playerIndex}>
                        <label className="photo-picker" title={`Choose photo for ${player.name}`}>
                          {player.image ? (
                            <img src={player.image} alt="" />
                          ) : (
                            <span className="avatar-placeholder">{player.name.trim().charAt(0).toUpperCase() || '+'}</span>
                          )}
                          <span className="photo-plus" aria-hidden="true">+</span>
                          <input
                            type="file"
                            accept="image/*"
                            aria-label={`Choose photo for ${player.name}`}
                            onChange={(event) => handlePhoto(event, teamIndex, playerIndex)}
                          />
                        </label>
                        <label className="player-name-label">
                          <span>Player {playerIndex + 1}</span>
                          <input
                            value={player.name}
                            maxLength={32}
                            onChange={(event) => updatePlayer(teamIndex, playerIndex, { name: event.target.value })}
                            aria-label={`Side ${teamIndex + 1} player ${playerIndex + 1} name`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <aside className="setup-aside">
            <div className="section-heading compact-heading">
              <span className="step-number">03</span>
              <div>
                <h2>Game points</h2>
                <p>Set the winning score before play starts.</p>
              </div>
            </div>
            <div className="target-options" role="group" aria-label="Points to win">
              {[20, 21].map((points) => (
                <button
                  type="button"
                  key={points}
                  className={Number(target) === points ? 'target-option active' : 'target-option'}
                  aria-pressed={Number(target) === points}
                  onClick={() => setTarget(points)}
                >
                  <strong>{points}</strong>
                  <span>points</span>
                </button>
              ))}
            </div>

            <label className="serve-select-label" htmlFor="opening-serve">First serve</label>
            <select id="opening-serve" value={openingServe} onChange={(event) => setOpeningServe(Number(event.target.value))}>
              <option value={0}>{teams[0].name || 'Home side'}</option>
              <option value={1}>{teams[1].name || 'Away side'}</option>
            </select>

            <p className="target-note">First side to {target} wins the game.</p>
            <button className="start-button" type="submit">
              Start match <span aria-hidden="true">-&gt;</span>
            </button>
          </aside>
        </form>
      </main>
    )
  }

  const servingPlayer = getServer(match.serveSide)

  return (
    <main className="page-shell match-shell">
      <header className="match-header">
        <div className="match-title">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <p className="eyebrow">MBA / live match desk</p>
            <h1>{match.format === 'singles' ? 'Singles' : 'Doubles'} scoreboard</h1>
          </div>
        </div>
        <div className="match-header-actions">
          <span className="status-tag">{match.winner === null ? `First to ${match.target}` : 'Game complete'}</span>
          <button className="switch-sides-button" type="button" onClick={switchSides} aria-label="Switch sides">
            <span aria-hidden="true">&#8644;</span> Switch sides
          </button>
          <button className="reset-button" type="button" onClick={resetMatch} title="Reset score and point log">
            <span aria-hidden="true">&#8635;</span> Reset game
          </button>
          <button className="text-button" type="button" onClick={returnToSetup}>Edit setup</button>
        </div>
      </header>

      {match.winner !== null && (
        <div className="winner-banner" role="status">
          <span>Game point</span>
          <strong>{match.teams[match.winner].name} wins</strong>
        </div>
      )}

      <section className="scoreboard" aria-label="Badminton scoreboard">
        {match.displayOrder.map((teamIndex, displayIndex) => {
          const team = match.teams[teamIndex]
          const isServing = match.serveSide === teamIndex
          const activeServer = isServing ? servingPlayer : null

          return (
            <article className={`side-score side-${displayIndex} ${isServing ? 'serving' : ''}`} key={teamIndex}>
              <div className="side-score-top">
                <span className="side-label">Side 0{displayIndex + 1}</span>
                {isServing && <span className="serve-indicator">Serving</span>}
              </div>
              <p className="team-title">{team.name || `Side ${teamIndex + 1}`}</p>
              <div className="score-value" aria-live="polite">{match.scores[teamIndex]}</div>
              <div className="player-boxes">
                {team.players.map((player, playerIndex) => {
                  const isPlayerServing = activeServer === player
                  const courtLabel = player.court === 0 ? 'Right court' : 'Left court'
                  const performance = getPlayerPerformance(teamIndex, playerIndex)
                  return (
                    <div className={`player-box ${isPlayerServing ? 'player-serving' : ''}`} key={playerIndex}>
                      {player.image ? (
                        <img className="player-photo" src={player.image} alt={`${player.name} portrait`} />
                      ) : (
                        <div className="player-photo player-placeholder" aria-hidden="true">
                          {(player.name.trim().charAt(0) || '?').toUpperCase()}
                        </div>
                      )}
                      <span className="player-court">{match.format === 'doubles' ? courtLabel : 'Player'}</span>
                      <button
                        className="player-name player-name-action"
                        type="button"
                        onClick={() => setPointEntry({ side: teamIndex, playerIndex })}
                        disabled={match.winner !== null}
                        aria-label={`Record rally outcome for ${player.name || 'Unnamed player'}`}
                      >
                        {player.name || 'Unnamed player'}
                      </button>
                      <div
                        className="performance-meter"
                        aria-label={`${player.name || 'Unnamed player'} game performance: ${performance.percentage} percent, ${performance.pointsWon} points won out of ${performance.totalGamePoints} total game points`}
                      >
                        <div className="performance-heading">
                          <span>Game performance</span>
                          <strong>{performance.percentage}%</strong>
                        </div>
                        <div className="performance-track" aria-hidden="true">
                          <span style={{ width: `${performance.percentage}%` }} />
                        </div>
                        <span className="performance-count">
                          {performance.pointsWon} points won / {performance.totalGamePoints} played
                        </span>
                      </div>
                      {isPlayerServing && <span className="server-chip">Serve</span>}
                    </div>
                  )
                })}
              </div>
              <button
                className="point-button"
                type="button"
                onClick={() => scorePoint(teamIndex)}
                disabled={match.winner !== null}
                aria-label={`Add one point to ${team.name || `side ${teamIndex + 1}`}`}
              >
                <span className="plus-sign" aria-hidden="true">+</span>
                <span>Add point</span>
              </button>
            </article>
          )
        })}
        <div className="court-net" aria-hidden="true"><span /></div>
      </section>

      <section className="match-footer">
        <div className="serve-summary">
          <span className="serve-dot" />
          <p><strong>{servingPlayer?.name || 'Player'}</strong> serves next</p>
          {match.format === 'doubles' && <span className="serve-court-label">{match.scores[match.serveSide] % 2 === 0 ? 'Right service court' : 'Left service court'}</span>}
        </div>
        <button className="undo-button" type="button" onClick={undoPoint} disabled={!undoStack.length}>
          <span aria-hidden="true">&#8630;</span> Undo point
        </button>
      </section>

      <section className="rally-section">
        <div className="rally-heading">
          <div>
            <p className="eyebrow">Point-by-point</p>
            <h2>Rally log</h2>
          </div>
          <span>{match.rallies.length} {match.rallies.length === 1 ? 'point' : 'points'}</span>
        </div>
        {match.rallies.length ? (
          <ol className="rally-list">
            {[...match.rallies].reverse().map((rally) => (
              <li key={rally.number}>
                <span className="rally-number">{String(rally.number).padStart(2, '0')}</span>
                <span className="rally-description">
                  <strong className="rally-winner">{match.teams[rally.team].name}</strong>
                  <span className="rally-detail">
                    {rally.detail ? `${rally.detail.outcome} · ${rally.detail.playerName}` : 'Point added'}
                  </span>
                </span>
                <span className="rally-score">{rally.scores[0]} - {rally.scores[1]}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rally-empty">No points yet. Tap a side to record the first rally.</p>
        )}
      </section>

      {pointEntry && (
        <div
          className="outcome-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPointEntry(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setPointEntry(null)
          }}
        >
          <section className="outcome-dialog" role="dialog" aria-modal="true" aria-labelledby="outcome-title">
            <div className="outcome-dialog-header">
              <div>
                <p className="eyebrow">Record rally</p>
                <h2 id="outcome-title">Choose point outcome</h2>
                <p className="outcome-player">
                  Player: <strong>{match.teams[pointEntry.side].players[pointEntry.playerIndex].name || 'Unnamed player'}</strong>
                </p>
              </div>
              <button className="dialog-close" type="button" onClick={() => setPointEntry(null)} aria-label="Close outcome picker">×</button>
            </div>
            <div className="outcome-options">
              {rallyOutcomes.map((outcome) => (
                <button
                  className={`outcome-option ${outcome.kind}`}
                  type="button"
                  key={outcome.label}
                  onClick={() => recordOutcome(outcome)}
                >
                  <span>{outcome.label}</span>
                  <small>{outcome.kind === 'error' ? 'Point to opponent' : 'Point to player side'}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
