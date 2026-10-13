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

const createTournamentTeam = (index) => ({
  id: `entrant-${index + 1}`,
  name: `Side ${index + 1}`,
  players: [
    { name: `Player ${index * 2 + 1}`, image: '' },
    { name: `Player ${index * 2 + 2}`, image: '' },
  ],
})

const createTournamentTeams = (count = 8) => Array.from({ length: count }, (_, index) => createTournamentTeam(index))

const RESULT_CARD_WIDTH = 1080
const RESULT_CARD_HEIGHT = 1350

const fitCanvasText = (context, text, maxWidth, fontSize, fontFamily) => {
  let size = fontSize
  context.font = `700 ${size}px ${fontFamily}`
  while (context.measureText(text).width > maxWidth && size > 30) {
    size -= 2
    context.font = `700 ${size}px ${fontFamily}`
  }
  return size
}

const calculatePlayerPerformance = (match, side, playerIndex) => {
  const pointsWon = match.rallies.filter((rally) =>
    rally.team === side &&
    rally.detail?.playerSide === side &&
    rally.detail.playerIndex === playerIndex &&
    rally.detail.outcomeKind === 'winner',
  ).length
  const pointsMissed = match.rallies.filter((rally) =>
    rally.team !== side &&
    rally.detail?.playerSide === side &&
    rally.detail.playerIndex === playerIndex &&
    rally.detail.outcomeKind === 'error',
  ).length
  const totalGamePoints = match.rallies.length

  return {
    percentage: totalGamePoints ? Math.round((pointsWon / totalGamePoints) * 100) : 0,
    pointsWon,
    pointsMissed,
    totalGamePoints,
  }
}

const createResultCardCanvas = (match, roundName) => {
  const canvas = document.createElement('canvas')
  canvas.width = RESULT_CARD_WIDTH
  canvas.height = RESULT_CARD_HEIGHT
  const context = canvas.getContext('2d')
  const winner = match.teams[match.winner]
  const loser = match.teams[1 - match.winner]
  const formatName = match.format === 'singles' ? 'SINGLES' : 'DOUBLES'
  const playerLine = (team) => team.players.map((player) => player.name.trim() || 'Unnamed player').join('  ·  ')

  context.fillStyle = '#123d30'
  context.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)
  context.fillStyle = '#d9ef68'
  context.fillRect(0, 0, RESULT_CARD_WIDTH, 18)
  context.strokeStyle = '#416b55'
  context.lineWidth = 3
  context.strokeRect(44, 44, RESULT_CARD_WIDTH - 88, RESULT_CARD_HEIGHT - 88)
  context.beginPath()
  context.moveTo(540, 44)
  context.lineTo(540, RESULT_CARD_HEIGHT - 44)
  context.moveTo(44, 675)
  context.lineTo(RESULT_CARD_WIDTH - 44, 675)
  context.moveTo(210, 44)
  context.lineTo(210, RESULT_CARD_HEIGHT - 44)
  context.moveTo(870, 44)
  context.lineTo(870, RESULT_CARD_HEIGHT - 44)
  context.stroke()

  context.textAlign = 'center'
  context.fillStyle = '#d9ef68'
  context.font = '800 27px Arial, sans-serif'
  context.fillText('MBA  /  SHUTTLE MATCH DESK', 540, 126)
  context.fillStyle = '#f3f4e9'
  context.font = '700 22px Arial, sans-serif'
  context.fillText([roundName, formatName].filter(Boolean).join('  ·  ').toUpperCase(), 540, 179)

  context.fillStyle = '#ffffff'
  context.font = '700 37px Arial, sans-serif'
  context.fillText('MATCH COMPLETE', 540, 310)
  context.fillStyle = '#d9ef68'
  context.font = '700 30px Arial, sans-serif'
  context.fillText('WINNER', 540, 386)

  const winnerFontSize = fitCanvasText(context, winner.name, 820, 76, 'Georgia, serif')
  context.fillStyle = '#f3f4e9'
  context.font = `700 ${winnerFontSize}px Georgia, serif`
  context.fillText(winner.name, 540, 493)
  const winnerPlayersSize = fitCanvasText(context, playerLine(winner), 800, 31, 'Arial, sans-serif')
  context.fillStyle = '#c5d5c7'
  context.font = `500 ${winnerPlayersSize}px Arial, sans-serif`
  context.fillText(playerLine(winner), 540, 555)

  context.fillStyle = '#d9ef68'
  context.font = '700 150px Georgia, serif'
  context.fillText(`${match.scores[match.winner]} - ${match.scores[1 - match.winner]}`, 540, 710)
  context.fillStyle = '#f3f4e9'
  const loserFontSize = fitCanvasText(context, loser.name, 780, 43, 'Arial, sans-serif')
  context.font = `700 ${loserFontSize}px Arial, sans-serif`
  context.fillText(`vs  ${loser.name}`, 540, 789)
  const loserPlayersSize = fitCanvasText(context, playerLine(loser), 780, 27, 'Arial, sans-serif')
  context.fillStyle = '#c5d5c7'
  context.font = `500 ${loserPlayersSize}px Arial, sans-serif`
  context.fillText(playerLine(loser), 540, 837)

  context.fillStyle = '#f3f4e9'
  context.font = '700 28px Arial, sans-serif'
  context.fillText('A GREAT MATCH. A CLEAR WINNER.', 540, 1110)
  context.fillStyle = '#b9c8bc'
  context.font = '500 22px Arial, sans-serif'
  context.fillText(new Date().toLocaleDateString(), 540, 1170)
  context.fillStyle = '#d9ef68'
  context.font = '700 20px Arial, sans-serif'
  context.fillText('PLAY  ·  COMPETE  ·  CELEBRATE', 540, 1230)

  return canvas
}

const createRallyLogCanvases = (match) => {
  const ralliesPerPage = 18
  const rallies = match.rallies.length ? match.rallies : []
  const pageCount = Math.max(1, Math.ceil(rallies.length / ralliesPerPage))
  const winnerName = match.teams[match.winner].name

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const canvas = document.createElement('canvas')
    canvas.width = RESULT_CARD_WIDTH
    canvas.height = RESULT_CARD_HEIGHT
    const context = canvas.getContext('2d')
    const pageRallies = rallies.slice(pageIndex * ralliesPerPage, (pageIndex + 1) * ralliesPerPage)

    context.fillStyle = '#f3f4e9'
    context.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)
    context.fillStyle = '#123d30'
    context.fillRect(0, 0, RESULT_CARD_WIDTH, 190)
    context.fillStyle = '#d9ef68'
    context.font = '800 25px Arial, sans-serif'
    context.fillText('MBA  /  SHUTTLE MATCH DESK', 70, 67)
    context.fillStyle = '#ffffff'
    context.font = '700 42px Georgia, serif'
    context.fillText('Point-by-point game log', 70, 128)
    context.fillStyle = '#d9ef68'
    context.font = '700 24px Arial, sans-serif'
    context.fillText(`${match.teams[0].name}  ${match.scores[0]}  -  ${match.scores[1]}  ${match.teams[1].name}`, 70, 236)
    context.fillStyle = '#50655a'
    context.font = '700 18px Arial, sans-serif'
    context.fillText('POINT', 70, 293)
    context.fillText('RALLY RESULT', 190, 293)
    context.textAlign = 'right'
    context.fillText('SCORE', 1010, 293)
    context.textAlign = 'left'

    pageRallies.forEach((rally, rowIndex) => {
      const y = 335 + rowIndex * 48
      const creditedTeam = match.teams[rally.team].name
      const detail = rally.detail
        ? `${rally.detail.playerName} · ${rally.detail.outcome}`
        : 'Point added'
      const description = `${creditedTeam} · ${detail}`

      context.fillStyle = rowIndex % 2 === 0 ? '#e5ebdf' : '#ffffff'
      context.fillRect(58, y - 29, 964, 42)
      context.fillStyle = '#1d563f'
      context.font = '700 19px Arial, sans-serif'
      context.fillText(String(rally.number).padStart(2, '0'), 75, y)
      const descriptionFontSize = fitCanvasText(context, description, 700, 19, 'Arial, sans-serif')
      context.fillStyle = '#294739'
      context.font = `500 ${descriptionFontSize}px Arial, sans-serif`
      context.fillText(description, 190, y)
      context.textAlign = 'right'
      context.font = '700 19px Arial, sans-serif'
      context.fillText(`${rally.scores[0]} - ${rally.scores[1]}`, 1005, y)
      context.textAlign = 'left'
    })

    context.fillStyle = '#1d563f'
    context.fillRect(58, 1215, 964, 2)
    context.fillStyle = '#50655a'
    context.font = '600 18px Arial, sans-serif'
    context.fillText(`${rallies.length} rallies  ·  ${winnerName} wins`, 70, 1260)
    context.textAlign = 'right'
    context.fillText(`${pageIndex + 1} / ${pageCount}`, 1010, 1260)
    context.textAlign = 'left'
    return canvas
  })
}

const createPlayerPerformanceCanvas = (match) => {
  const canvas = document.createElement('canvas')
  canvas.width = RESULT_CARD_WIDTH
  canvas.height = RESULT_CARD_HEIGHT
  const context = canvas.getContext('2d')

  context.fillStyle = '#f3f4e9'
  context.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)
  context.fillStyle = '#123d30'
  context.fillRect(0, 0, RESULT_CARD_WIDTH, 190)
  context.fillStyle = '#d9ef68'
  context.font = '800 25px Arial, sans-serif'
  context.fillText('MBA  /  SHUTTLE MATCH DESK', 70, 67)
  context.fillStyle = '#ffffff'
  context.font = '700 42px Georgia, serif'
  context.fillText('Player performance', 70, 128)
  context.fillStyle = '#d9ef68'
  context.font = '700 24px Arial, sans-serif'
  context.fillText(`${match.teams[0].name}  ${match.scores[0]}  -  ${match.scores[1]}  ${match.teams[1].name}`, 70, 236)

  context.fillStyle = '#50655a'
  context.font = '700 18px Arial, sans-serif'
  context.fillText('PLAYER', 70, 304)
  context.fillText('TEAM', 430, 304)
  context.fillText('WON', 690, 304)
  context.fillText('MISSED', 800, 304)
  context.textAlign = 'right'
  context.fillText('PERFORMANCE', 1010, 304)
  context.textAlign = 'left'

  let rowIndex = 0
  match.teams.forEach((team, side) => {
    team.players.forEach((player, playerIndex) => {
      const y = 365 + rowIndex * 82
      const performance = calculatePlayerPerformance(match, side, playerIndex)
      context.fillStyle = rowIndex % 2 === 0 ? '#e5ebdf' : '#ffffff'
      context.fillRect(58, y - 37, 964, 66)
      context.fillStyle = '#1d563f'
      context.font = '700 22px Arial, sans-serif'
      context.fillText(player.name.trim() || 'Unnamed player', 75, y)
      context.fillStyle = '#53695c'
      context.font = '500 19px Arial, sans-serif'
      context.fillText(team.name, 430, y)
      context.fillStyle = '#294739'
      context.font = '700 20px Arial, sans-serif'
      context.fillText(String(performance.pointsWon), 705, y)
      context.fillText(String(performance.pointsMissed), 825, y)
      context.textAlign = 'right'
      context.fillText(`${performance.percentage}%`, 1005, y)
      context.textAlign = 'left'
      rowIndex += 1
    })
  })

  context.fillStyle = '#1d563f'
  context.fillRect(58, 1215, 964, 2)
  context.fillStyle = '#50655a'
  context.font = '600 18px Arial, sans-serif'
  context.fillText(`Based on ${match.rallies.length} recorded rallies`, 70, 1260)
  return canvas
}

const encodePdfFromJpegs = (jpegPages) => {
  const encoder = new TextEncoder()
  const chunks = []
  const offsets = [0]
  let byteLength = 0
  const add = (chunk) => {
    chunks.push(chunk)
    byteLength += chunk.length
  }
  const addText = (text) => add(encoder.encode(text))

  addText('%PDF-1.4\n')
  const pageObjectIds = jpegPages.map((_, index) => 3 + index * 3)
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((objectId) => `${objectId} 0 R`).join(' ')}] /Count ${jpegPages.length} >>\nendobj\n`,
  ]

  objects.forEach((object) => {
    offsets.push(byteLength)
    addText(object)
  })

  jpegPages.forEach((jpegBytes, index) => {
    const pageObjectId = pageObjectIds[index]
    const imageObjectId = pageObjectId + 1
    const contentObjectId = pageObjectId + 2
    const pageObject = `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 432 540] /Resources << /XObject << /Card ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj\n`
    offsets.push(byteLength)
    addText(pageObject)

    offsets.push(byteLength)
    addText(`${imageObjectId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${RESULT_CARD_WIDTH} /Height ${RESULT_CARD_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
    add(jpegBytes)
    addText('\nendstream\nendobj\n')

    const content = 'q\n432 0 0 540 0 0 cm\n/Card Do\nQ\n'
    offsets.push(byteLength)
    addText(`${contentObjectId} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`)
  })

  const crossReferenceOffset = byteLength
  addText(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF`)
  return new Blob(chunks, { type: 'application/pdf' })
}

const createGame = (teams, format, target, tournamentRef = null, firstServe = 0, serverIndex = 0) => ({
  format,
  target,
  tournamentRef,
  teams: teams.map((team, teamIndex) => ({
    ...team,
    players: team.players.map((player, index) => ({
      ...player,
      court: teamIndex === firstServe
        ? index === serverIndex ? 0 : 1
        : index === 0 ? 1 : 0,
    })),
  })),
  scores: [0, 0],
  displayOrder: [0, 1],
  serveSide: firstServe,
  firstServe,
  rallies: [],
  winner: null,
})

const getRoundName = (teamCount, hasByes = false) => {
  if (teamCount === 4 && hasByes) return 'Qualifying round'
  if (teamCount === 2) return 'Final'
  if (teamCount === 4) return 'Semi-finals'
  if (teamCount === 8) return 'Quarter-finals'
  return `Round of ${teamCount}`
}

const getMatchLabel = (roundName, matchIndex) => {
  if (roundName === 'Final') return 'Final'
  if (roundName === 'Semi-finals') return `Semi-final ${matchIndex + 1}`
  if (roundName === 'Quarter-finals') return `Quarter-final ${matchIndex + 1}`
  return `${roundName} · Match ${matchIndex + 1}`
}

const getGameWinner = (scores, gamePoint) => {
  const leadingSide = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1
  const highScore = Math.max(...scores)

  if (highScore >= 30) return leadingSide
  if (leadingSide === null || highScore < gamePoint + 1) return null
  return scores[leadingSide] - scores[1 - leadingSide] >= 2 ? leadingSide : null
}

const createTournamentBracket = (entrants) => {
  const rounds = []
  const bracketSize = 2 ** Math.ceil(Math.log2(entrants.length))
  const byeCount = bracketSize - entrants.length
  let teamCount = bracketSize
  let previousRoundMatches = null

  while (teamCount > 1) {
    const hasOpeningByes = rounds.length === 0 && byeCount > 0
    const roundName = getRoundName(teamCount, hasOpeningByes)
    const key = `round-${rounds.length + 1}`
    const matches = Array.from({ length: teamCount / 2 }, (_, index) => {
      const isBye = hasOpeningByes && index < byeCount
      const sides = previousRoundMatches
        ? null
        : isBye
          ? [entrants[index], null]
          : [
              entrants[byeCount + (index - byeCount) * 2],
              entrants[byeCount + (index - byeCount) * 2 + 1],
            ]

      return {
        id: `${key}-match-${index + 1}`,
        label: getMatchLabel(roundName, index),
        sides,
        sources: previousRoundMatches
          ? [previousRoundMatches[index * 2].id, previousRoundMatches[index * 2 + 1].id]
          : null,
        winnerTeam: isBye ? sides[0] : null,
        score: null,
        isBye,
      }
    })

    rounds.push({ key, name: roundName, matches })
    previousRoundMatches = matches
    teamCount = matches.length
  }

  return {
    rounds,
    teamCount: entrants.length,
    champion: null,
    activeGame: null,
  }
}

const rallyOutcomes = [
  { label: 'Serve point', kind: 'winner', serverOnly: true },
  { label: 'Miracle point', kind: 'winner' },
  { label: 'Shot point', kind: 'winner' },
  { label: 'Drop point', kind: 'winner' },
  { label: 'Serve net', kind: 'error', serverOnly: true },
  { label: 'Serve out', kind: 'error', serverOnly: true },
  { label: 'Smash net', kind: 'error' },
  { label: 'Smash out', kind: 'error' },
]

function App() {
  const [setupMode, setSetupMode] = useState('match')
  const [format, setFormat] = useState('doubles')
  const [target, setTarget] = useState(21)
  const [teams, setTeams] = useState(createTeams)
  const [tournamentTeamCount, setTournamentTeamCount] = useState('8')
  const [tournamentTeams, setTournamentTeams] = useState(createTournamentTeams)
  const [openingServe, setOpeningServe] = useState(0)
  const [openingServerIndex, setOpeningServerIndex] = useState(0)
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [pointEntry, setPointEntry] = useState(null)
  const [postCopied, setPostCopied] = useState(false)
  const [postCopyFailed, setPostCopyFailed] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState('')

  const playersPerSide = format === 'singles' ? 1 : 2

  const startGame = (gameTeams, gameFormat, gameTarget, tournamentRef = null) => {
    setUndoStack([])
    setPointEntry(null)
    setMatch(createGame(gameTeams, gameFormat, gameTarget, tournamentRef, openingServe, openingServerIndex))
  }

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

  const updateTournamentTeam = (teamIndex, updates) => {
    setTournamentTeams((current) => current.map((team, index) =>
      index === teamIndex ? { ...team, ...updates } : team,
    ))
  }

  const changeTournamentTeamCount = (value) => {
    setTournamentTeamCount(value)
    const count = Number(value)
    if (!Number.isInteger(count) || count < 2 || count > 32) return

    setTournamentTeams((current) => Array.from({ length: Math.max(count, current.length) }, (_, index) =>
      current[index] ?? createTournamentTeam(index),
    ))
  }

  const normalizeTournamentTeamCount = () => {
    const count = Number(tournamentTeamCount)
    const normalizedCount = Number.isFinite(count)
      ? Math.min(32, Math.max(2, Math.trunc(count)))
      : 8
    setTournamentTeamCount(String(normalizedCount))
    setTournamentTeams((current) => Array.from({ length: Math.max(normalizedCount, current.length) }, (_, index) =>
      current[index] ?? createTournamentTeam(index),
    ))
    return normalizedCount
  }

  const updateTournamentPlayer = (teamIndex, playerIndex, updates) => {
    setTournamentTeams((current) => current.map((team, index) => {
      if (index !== teamIndex) return team
      return {
        ...team,
        players: team.players.map((player, slot) =>
          slot === playerIndex ? { ...player, ...updates } : player,
        ),
      }
    }))
  }

  const handleTournamentPhoto = (event, teamIndex, playerIndex) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => updateTournamentPlayer(teamIndex, playerIndex, { image: reader.result })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const startMatch = (event) => {
    event.preventDefault()
    setTournament(null)
    const matchTeams = teams.map((team) => ({
      ...team,
      players: team.players.slice(0, playersPerSide),
    }))
    const game = createGame(matchTeams, format, Number(target), null, openingServe, openingServerIndex)
    setUndoStack([])
    setMatch(game)
  }

  const startTournament = (event) => {
    event.preventDefault()
    const entrantCount = normalizeTournamentTeamCount()
    const entrants = tournamentTeams.map((team) => ({
      ...team,
      players: team.players.slice(0, playersPerSide),
    })).slice(0, entrantCount)
    const bracket = createTournamentBracket(entrants)
    setTournament({ ...bracket, format, target: Number(target) })
    const firstRound = bracket.rounds[0]
    const firstMatch = firstRound.matches.find((entry) => !entry.winnerTeam && entry.sides?.every(Boolean))
    if (!firstMatch) return
    startGame(firstMatch.sides, format, Number(target), { roundKey: firstRound.key, matchId: firstMatch.id })
  }

  const startBracketMatch = (roundKey, tournamentMatch) => {
    if (!tournamentMatch?.sides) return
    setTournament((current) => ({ ...current, activeGame: null }))
    startGame(tournamentMatch.sides, tournament.format, tournament.target, { roundKey, matchId: tournamentMatch.id })
  }

  const resumeTournamentGame = () => {
    if (!tournament?.activeGame) return
    setMatch(tournament.activeGame)
    setUndoStack(tournament.activeUndoStack ?? [])
    setTournament((current) => ({ ...current, activeGame: null, activeUndoStack: null }))
  }

  const showTournamentBracket = () => {
    if (!tournament || !match?.tournamentRef) return
    setTournament((current) => ({ ...current, activeGame: match, activeUndoStack: undoStack }))
    setMatch(null)
    setPointEntry(null)
  }

  const advanceTournament = () => {
    if (!tournament || !match?.tournamentRef || match.winner === null) return

    const completedTeam = match.teams[match.winner]
    const updatedRounds = tournament.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((entry) => entry.id === match.tournamentRef.matchId
        ? { ...entry, winnerTeam: completedTeam, score: [...match.scores] }
        : { ...entry }),
    }))

    for (let roundIndex = 1; roundIndex < updatedRounds.length; roundIndex += 1) {
      const previousMatches = updatedRounds[roundIndex - 1].matches
      updatedRounds[roundIndex].matches = updatedRounds[roundIndex].matches.map((entry) => {
        if (!entry.sources) return entry
        const sides = entry.sources.map((sourceId) =>
          previousMatches.find((previous) => previous.id === sourceId)?.winnerTeam ?? null,
        )
        return { ...entry, sides: sides.every(Boolean) ? sides : null }
      })
    }

    const nextMatch = updatedRounds
      .flatMap((round) => round.matches.map((entry) => ({ roundKey: round.key, entry })))
      .find(({ entry }) => !entry.winnerTeam && entry.sides?.every(Boolean))

    const finalMatch = updatedRounds[updatedRounds.length - 1].matches[0]
    const updatedTournament = {
      ...tournament,
      rounds: updatedRounds,
      champion: finalMatch.winnerTeam,
      activeGame: null,
    }

    setTournament(updatedTournament)
    setMatch(null)
    setUndoStack([])
    setPointEntry(null)

    if (nextMatch) {
      startGame(nextMatch.entry.sides, tournament.format, tournament.target, {
        roundKey: nextMatch.roundKey,
        matchId: nextMatch.entry.id,
      })
    }
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
        winner: getGameWinner(scores, current.target),
      }
    })
  }

  const recordOutcome = (outcome) => {
    if (!pointEntry) return

    const player = match.teams[pointEntry.side].players[pointEntry.playerIndex]
    const selectedPlayerIsServer = pointEntry.side === match.serveSide && player === getServer(pointEntry.side)
    if (outcome.serverOnly && !selectedPlayerIsServer) return

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

  const copyResultPost = async () => {
    const winningTeam = match.teams[match.winner]
    const losingTeam = match.teams[1 - match.winner]
    const roundLabel = currentTournamentRound ? `${currentTournamentRound.name} · ` : ''
    const post = [
      'MBA Shuttle Match Desk · Match result',
      `${roundLabel}${match.format === 'singles' ? 'Singles' : 'Doubles'}`,
      `${winningTeam.name} ${match.scores[match.winner]} - ${match.scores[1 - match.winner]} ${losingTeam.name}`,
      `${winningTeam.name} takes the win!`,
    ].join('\n')

    let copied = false

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(post)
        copied = true
      }
    } catch {
      copied = false
    }

    if (!copied) {
      const temporaryInput = document.createElement('textarea')
      temporaryInput.value = post
      temporaryInput.setAttribute('readonly', '')
      temporaryInput.style.position = 'fixed'
      temporaryInput.style.opacity = '0'
      document.body.appendChild(temporaryInput)
      temporaryInput.select()

      try {
        copied = document.execCommand('copy')
      } catch {
        copied = false
      } finally {
        temporaryInput.remove()
      }
    }

    if (copied) {
      setPostCopied(true)
      setPostCopyFailed(false)
      window.setTimeout(() => setPostCopied(false), 2200)
    } else {
      setPostCopied(false)
      setPostCopyFailed(true)
      window.setTimeout(() => setPostCopyFailed(false), 3000)
    }
  }

  const downloadPdf = async (canvases, filenameSuffix, successMessage) => {
    try {
      const jpegBlobs = await Promise.all(canvases.map((canvas) =>
        new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94)),
      ))
      if (jpegBlobs.some((blob) => !blob)) throw new Error('Could not render the match log')
      const jpegPages = await Promise.all(jpegBlobs.map(async (blob) =>
        new Uint8Array(await blob.arrayBuffer()),
      ))
      const fileBlob = encodePdfFromJpegs(jpegPages)
      const safeWinner = match.teams[match.winner].name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'winner'
      const downloadUrl = URL.createObjectURL(fileBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `shuttle-match-${safeWinner}-${filenameSuffix}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      URL.revokeObjectURL(downloadUrl)
      setDownloadStatus(successMessage)
      window.setTimeout(() => setDownloadStatus(''), 2500)
    } catch {
      setDownloadStatus('Download failed. Please try again.')
    }
  }

  const downloadResultTemplate = () => downloadPdf(
    [createResultCardCanvas(match, currentTournamentRound?.name)],
    'result-template',
    'Result template PDF downloaded',
  )

  const downloadGameLog = () => downloadPdf(
    [...createRallyLogCanvases(match), createPlayerPerformanceCanvas(match)],
    'game-log',
    'Game log PDF downloaded',
  )

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

  const switchPlayerPositions = (teamIndex) => {
    setMatch((current) => {
      if (current.rallies.length > 0) return current
      return {
        ...current,
        teams: current.teams.map((team, index) => index === teamIndex ? {
          ...team,
          players: team.players.map((player) => ({ ...player, court: 1 - player.court })),
        } : team),
      }
    })
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

  const getPlayerPerformance = (side, playerIndex) => calculatePlayerPerformance(match, side, playerIndex)

  const returnToSetup = () => {
    if (match?.tournamentRef) {
      showTournamentBracket()
      return
    }
    setMatch(null)
    setUndoStack([])
  }

  if (!match && tournament) {
    return (
      <main className="page-shell bracket-shell">
        <header className="masthead">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <p className="eyebrow">MBA / tournament desk</p>
            <h1>Knockout bracket</h1>
          </div>
          <button className="text-button" type="button" onClick={() => {
            setTournament(null)
            setMatch(null)
          }}>New setup</button>
        </header>

        {tournament.champion && (
          <div className="champion-banner" role="status">
            <span>Tournament champion</span>
            <strong>{tournament.champion.name}</strong>
          </div>
        )}

        {tournament.activeGame && (
          <button className="resume-game-button" type="button" onClick={resumeTournamentGame}>
            Resume in-progress game <span aria-hidden="true">-&gt;</span>
          </button>
        )}

        <section className="bracket-grid" aria-label="Tournament bracket">
          {tournament.rounds.map((round) => (
            <section className="bracket-round" key={round.key}>
              <div className="bracket-round-heading">
                <p className="eyebrow">{round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}</p>
                <h2>{round.name}</h2>
              </div>
              <div className="bracket-matches">
                {round.matches.map((entry) => {
                  const showResume = tournament.activeGame?.tournamentRef?.matchId === entry.id
                  const playable = !tournament.activeGame && entry.sides?.every(Boolean) && !entry.winnerTeam
                  return (
                    <article className={`bracket-match ${entry.winnerTeam ? 'complete' : ''}`} key={entry.id}>
                      <p className="bracket-match-title">{entry.label}</p>
                      {entry.sides ? entry.sides.map((side, sideIndex) => (
                        <div className={`bracket-side ${side && entry.winnerTeam?.id === side.id ? 'bracket-winner' : ''} ${!side ? 'bracket-bye' : ''}`} key={`${entry.id}-${sideIndex}`}>
                          <span>{side?.name ?? 'BYE · advances automatically'}</span>
                          {entry.score && <strong>{entry.score[sideIndex]}</strong>}
                        </div>
                      )) : entry.sources?.map((source, sourceIndex) => (
                        <div className="bracket-side pending" key={source}>
                          <span>Winner {source.toUpperCase()}</span>
                          {sourceIndex === 0 && <small>vs</small>}
                        </div>
                      ))}
                      {playable && !showResume && (
                        <button className="bracket-play-button" type="button" onClick={() => startBracketMatch(round.key, entry)}>
                          Play match <span aria-hidden="true">-&gt;</span>
                        </button>
                      )}
                      {showResume && (
                        <button className="bracket-play-button" type="button" onClick={resumeTournamentGame}>
                          Resume match <span aria-hidden="true">-&gt;</span>
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </section>
      </main>
    )
  }

  if (!match) {
    const isTournamentSetup = setupMode === 'tournament'
    const setupTeams = isTournamentSetup ? tournamentTeams : teams
    const setSetupTeam = isTournamentSetup ? updateTournamentTeam : updateTeam
    const setSetupPlayer = isTournamentSetup ? updateTournamentPlayer : updatePlayer
    const parsedTeamCount = Number(tournamentTeamCount)
    const previewTeamCount = Number.isInteger(parsedTeamCount) && parsedTeamCount >= 2 && parsedTeamCount <= 32
      ? parsedTeamCount
      : 2
    const tournamentPreview = isTournamentSetup
      ? createTournamentBracket(tournamentTeams.slice(0, previewTeamCount))
      : null
    const openingServeTeams = isTournamentSetup
      ? tournamentPreview.rounds[0].matches.find((entry) => !entry.isBye)?.sides
      : teams

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

        <div className="mode-switch" role="group" aria-label="Game mode">
          {[
            { key: 'match', label: 'Single match' },
            { key: 'tournament', label: 'Tournament' },
          ].map((mode) => (
            <button
              className={setupMode === mode.key ? 'mode-option active' : 'mode-option'}
              type="button"
              key={mode.key}
              aria-pressed={setupMode === mode.key}
              onClick={() => {
                setSetupMode(mode.key)
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <form className="setup-layout" onSubmit={isTournamentSetup ? startTournament : startMatch}>
          <section className="setup-main">
            <div className="section-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Match format</h2>
                <p>{isTournamentSetup ? 'Choose the format for all tournament games.' : 'Choose how many players are on each side.'}</p>
              </div>
            </div>

            <div className="format-switch" role="group" aria-label="Match format">
              {['singles', 'doubles'].map((option) => (
                <button
                  className={format === option ? 'format-option active' : 'format-option'}
                  key={option}
                  type="button"
                  aria-pressed={format === option}
                  onClick={() => {
                    setFormat(option)
                    setOpeningServerIndex(0)
                  }}
                >
                  <span className="format-icon" aria-hidden="true">{option === 'singles' ? '1v1' : '2v2'}</span>
                  <span>{option[0].toUpperCase() + option.slice(1)}</span>
                </button>
              ))}
            </div>

            <div className="section-heading players-heading">
              <span className="step-number">02</span>
              <div>
                <h2>{isTournamentSetup ? 'Tournament entrants' : 'Players'}</h2>
                <p>{isTournamentSetup ? `Enter the ${previewTeamCount} teams below. Pairings use the numbered schedule slots.` : 'Add a name and photo for each player.'}</p>
              </div>
            </div>

            <div className="team-setup-grid">
              {setupTeams.slice(0, isTournamentSetup ? previewTeamCount : 2).map((team, teamIndex) => (
                <section className={`team-setup team-${teamIndex}`} key={teamIndex}>
                  <label className="team-name-label">
                    <span className="team-dot" />
                    <input
                      aria-label={`Side ${teamIndex + 1} name`}
                      placeholder={`Enter side ${teamIndex + 1} name`}
                      value={team.name}
                      onChange={(event) => setSetupTeam(teamIndex, { name: event.target.value })}
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
                            capture="environment"
                            aria-label={`Choose photo for ${player.name}`}
                            onChange={(event) => isTournamentSetup
                              ? handleTournamentPhoto(event, teamIndex, playerIndex)
                              : handlePhoto(event, teamIndex, playerIndex)}
                          />
                        </label>
                        <label className="player-name-label">
                          <span>Player {playerIndex + 1}</span>
                          <input
                            value={player.name}
                            placeholder={`Enter player ${playerIndex + 1} name`}
                            maxLength={32}
                            onChange={(event) => setSetupPlayer(teamIndex, playerIndex, { name: event.target.value })}
                            aria-label={`Side ${teamIndex + 1} player ${playerIndex + 1} name`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {isTournamentSetup && (
              <section className="schedule-preview" aria-label="Tournament schedule slots">
                <div className="section-heading schedule-heading">
                  <span className="step-number">04</span>
                  <div>
                    <h2>Opening round schedule</h2>
                    <p>Teams are paired by slot. Winners advance to the next round.</p>
                  </div>
                </div>
                <div className="schedule-slots">
                  {tournamentPreview.rounds[0].matches.map((entry, index) => (
                    <div className="schedule-slot" key={entry.id}>
                      <span className="slot-number">Slot {String(index + 1).padStart(2, '0')}</span>
                      <strong>{entry.sides[0]?.name ?? 'BYE · automatic advance'}</strong>
                      <span className="slot-vs">vs</span>
                      <strong>{entry.sides[1]?.name ?? 'BYE · automatic advance'}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="setup-aside">
            {isTournamentSetup && (
              <>
                <div className="section-heading compact-heading">
                  <span className="step-number">01</span>
                  <div>
                    <h2>Number of teams</h2>
                    <p>Choose the bracket size.</p>
                  </div>
                </div>
                <label className="team-count-field" htmlFor="tournament-team-count">
                  <span>Teams in tournament</span>
                  <input
                    id="tournament-team-count"
                    type="number"
                    min="2"
                    max="32"
                    step="1"
                    required
                    value={tournamentTeamCount}
                    onChange={(event) => changeTournamentTeamCount(event.target.value)}
                    onBlur={normalizeTournamentTeamCount}
                    aria-describedby="team-count-note"
                  />
                  <small id="team-count-note">Choose 2 to 32 teams. Empty bracket slots advance as byes.</small>
                </label>
              </>
            )}
            <div className="section-heading compact-heading">
              <span className="step-number">{isTournamentSetup ? '02' : '03'}</span>
              <div>
                <h2>Game point</h2>
                <p>Choose the score that starts game point.</p>
              </div>
            </div>
            <div className="target-options" role="group" aria-label="Game point threshold">
              {[20, 21].map((points) => (
                <button
                  type="button"
                  key={points}
                  className={Number(target) === points ? 'target-option active' : 'target-option'}
                  aria-pressed={Number(target) === points}
                  onClick={() => setTarget(points)}
                >
                  <strong>{points}</strong>
                  <span>game point</span>
                </button>
              ))}
            </div>

            {isTournamentSetup && <p className="target-note">{previewTeamCount} teams play a single-elimination bracket.</p>}

            <label className="serve-select-label" htmlFor="opening-serve">First serving side</label>
            <select
              id="opening-serve"
              value={openingServe}
              onChange={(event) => {
                setOpeningServe(Number(event.target.value))
                setOpeningServerIndex(0)
              }}
            >
              {openingServeTeams.map((team, index) => (
                <option value={index} key={team.id ?? index}>{team.name || `Side ${index + 1}`}</option>
              ))}
            </select>
            <label className="serve-select-label server-player-label" htmlFor="opening-server-player">
              First server{format === 'doubles' ? ' (starts on right court)' : ''}
            </label>
            <select
              id="opening-server-player"
              value={openingServerIndex}
              onChange={(event) => setOpeningServerIndex(Number(event.target.value))}
            >
              {openingServeTeams[openingServe].players.slice(0, playersPerSide).map((player, index) => (
                <option value={index} key={index}>{player.name || `Player ${index + 1}`}</option>
              ))}
            </select>

            {!isTournamentSetup && (
              <p className="target-note">
                Reach {Number(target) + 1} and lead by 2 to win. At {target}-{target}, {Number(target) + 2} wins.
              </p>
            )}
            <button className="start-button" type="submit">
              {isTournamentSetup ? 'Start tournament' : 'Start match'} <span aria-hidden="true">-&gt;</span>
            </button>
          </aside>
        </form>
      </main>
    )
  }

  const servingPlayer = getServer(match.serveSide)
  const currentTournamentRound = match.tournamentRef
    ? tournament?.rounds.find((round) => round.key === match.tournamentRef.roundKey)
    : null
  const currentTournamentFixture = currentTournamentRound?.matches.find(
    (entry) => entry.id === match.tournamentRef.matchId,
  )

  return (
    <main className="page-shell match-shell">
      <header className="match-header">
        <div className="match-title">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <p className="eyebrow">{currentTournamentRound ? `MBA / ${currentTournamentRound.name}` : 'MBA / live match desk'}</p>
            <h1>{currentTournamentFixture ? currentTournamentFixture.label : `${match.format === 'singles' ? 'Singles' : 'Doubles'} scoreboard`}</h1>
          </div>
        </div>
        <div className="match-header-actions">
          <span className="status-tag">
            {match.winner !== null
              ? 'Game complete'
              : match.scores[0] === match.scores[1] && match.scores[0] >= 29
                ? '30-point cap · next point wins'
              : match.scores[0] === match.scores[1] && match.scores[0] >= match.target
                ? 'Deuce · win by 2'
                : Math.max(...match.scores) >= match.target && Math.abs(match.scores[0] - match.scores[1]) === 1
                  ? 'Game point · next point wins'
                  : `Game point ${match.target} · target ${match.target + 1}`}
          </span>
          <button
            className="switch-sides-button"
            type="button"
            onClick={switchSides}
            disabled={match.rallies.length > 0}
            aria-label="Switch sides"
          >
            <span aria-hidden="true">&#8644;</span> Switch sides
          </button>
          <button className="reset-button" type="button" onClick={resetMatch} title="Reset score and point log">
            <span aria-hidden="true">&#8635;</span> Reset game
          </button>
          <button className="text-button" type="button" onClick={returnToSetup}>
            {match.tournamentRef ? 'Bracket' : 'Edit setup'}
          </button>
        </div>
      </header>

      {match.winner !== null && (
        <section className="victory-panel" aria-labelledby="victory-title">
          <div className="victory-heading">
            <span className="victory-mark" aria-hidden="true">W</span>
            <div>
              <p className="eyebrow">{match.tournamentRef ? `${currentTournamentRound?.name ?? 'Tournament'} · result` : 'Final result'}</p>
              <h2 id="victory-title">{match.teams[match.winner].name} wins</h2>
            </div>
            <span className="victory-label">Victory</span>
          </div>
          <div className="victory-result-line">
            <strong>{match.teams[match.winner].name}</strong>
            <span>{match.scores[match.winner]} - {match.scores[1 - match.winner]}</span>
            <strong>{match.teams[1 - match.winner].name}</strong>
            <small>{match.format === 'singles' ? 'Singles' : 'Doubles'} · {match.target} game point</small>
          </div>
          <div className="result-post-row">
            <p className="result-post-template">
              MBA Shuttle Match Desk: {match.teams[match.winner].name} wins {match.format} {match.scores[match.winner]}–{match.scores[1 - match.winner]} against {match.teams[1 - match.winner].name}!
            </p>
            <div className="result-actions">
              <button className="copy-post-button" type="button" onClick={copyResultPost}>
                {postCopied ? 'Copied' : postCopyFailed ? 'Select post to copy' : 'Copy post'}
              </button>
              <button className="download-result-button" type="button" onClick={downloadResultTemplate}>
                Download result template PDF
              </button>
              <button className="download-result-button" type="button" onClick={downloadGameLog}>
                Download game log PDF
              </button>
            </div>
          </div>
          <p className="result-download-status" aria-live="polite">{downloadStatus}</p>
          {match.tournamentRef && (
            <button className="winner-continue-button" type="button" onClick={advanceTournament}>
              Record result &amp; continue <span aria-hidden="true">-&gt;</span>
            </button>
          )}
        </section>
      )}

      <section className="scoreboard" aria-label="Badminton scoreboard">
        {match.displayOrder.map((teamIndex, displayIndex) => {
          const team = match.teams[teamIndex]
          const isServing = match.serveSide === teamIndex
          const activeServer = isServing ? servingPlayer : null

          return (
            <article className={`side-score side-${displayIndex} ${isServing ? 'serving' : ''}`} key={teamIndex}>
              <div className="side-score-top">
                <span className="side-label">{displayIndex === 0 ? 'Left side' : 'Right side'}</span>
                <span className="side-score-indicators">
                  {match.scores[teamIndex] >= match.target &&
                    match.scores[teamIndex] - match.scores[1 - teamIndex] === 1 &&
                    <span className="game-point-indicator">Game point</span>}
                  {isServing && <span className="serve-indicator">Serving</span>}
                </span>
              </div>
              <p className="team-title">{team.name || `Side ${teamIndex + 1}`}</p>
              <div className="score-value" aria-live="polite">{match.scores[teamIndex]}</div>
              <div className={`player-boxes ${match.format === 'doubles' ? 'doubles-player-boxes' : ''}`}>
                {team.players.map((player, playerIndex) => {
                  const isPlayerServing = activeServer === player
                  const courtLabel = player.court === 0 ? 'Right court' : 'Left court'
                  const performance = getPlayerPerformance(teamIndex, playerIndex)
                  return (
                    <div className={`player-box ${isPlayerServing ? 'player-serving' : ''}`} key={playerIndex}>
                      <button
                        className="player-profile-action"
                        type="button"
                        onClick={() => setPointEntry({ side: teamIndex, playerIndex })}
                        disabled={match.winner !== null}
                        aria-label={`Record rally outcome for ${player.name || 'Unnamed player'}`}
                      >
                        {player.image ? (
                          <img className="player-photo" src={player.image} alt="" />
                        ) : (
                          <span className="player-photo player-placeholder" aria-hidden="true">
                            {(player.name.trim().charAt(0) || '?').toUpperCase()}
                          </span>
                        )}
                        <span className="player-court">{match.format === 'doubles' ? courtLabel : 'Player'}</span>
                        <span className="player-name">{player.name || 'Unnamed player'}</span>
                      </button>
                      <div
                        className="performance-meter"
                        aria-label={`${player.name || 'Unnamed player'} game performance: ${performance.percentage} percent, ${performance.pointsWon} points won, ${performance.pointsMissed} points missed, ${performance.totalGamePoints} total game points`}
                      >
                        <div className="performance-heading">
                          <span>Game performance</span>
                          <strong>{performance.percentage}%</strong>
                        </div>
                        <div className="performance-track" aria-hidden="true">
                          <span style={{ width: `${performance.percentage}%` }} />
                        </div>
                        <span className="performance-count">
                          {performance.pointsWon} won · {performance.pointsMissed} missed / {performance.totalGamePoints} game points
                        </span>
                      </div>
                      {isPlayerServing && <span className="server-chip">Serve</span>}
                    </div>
                  )
                })}
                {match.format === 'doubles' && team.players.length > 1 && (
                  <button
                    className="player-position-switch"
                    type="button"
                    onClick={() => switchPlayerPositions(teamIndex)}
                    disabled={match.rallies.length > 0}
                    title="Switch player positions"
                    aria-label={`Switch ${team.name || `side ${teamIndex + 1}`} player positions`}
                  >
                    <span aria-hidden="true">&#8646;</span>
                  </button>
                )}
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
              {rallyOutcomes
                .filter((outcome) => !outcome.serverOnly || (
                  pointEntry.side === match.serveSide &&
                  match.teams[pointEntry.side].players[pointEntry.playerIndex] === getServer(pointEntry.side)
                ))
                .map((outcome) => (
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
