export const normalizePlayerName = (name) => name.trim().replace(/\s+/g, ' ')
export const playerNameKey = (name) => normalizePlayerName(name).toLowerCase()

export const availablePlayerNames = (savedNames, otherNames) => {
  const used = new Set(otherNames.map(playerNameKey).filter(Boolean))
  return savedNames.filter((name) => !used.has(playerNameKey(name)))
}

export const duplicatePlayerNames = (names) => {
  const seen = new Set()
  const duplicates = new Map()
  for (const name of names) {
    const key = playerNameKey(name)
    if (!key) continue
    if (seen.has(key)) duplicates.set(key, normalizePlayerName(name))
    seen.add(key)
  }
  return [...duplicates.values()]
}
