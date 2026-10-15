export const normalizePlayerName = (name) => name.trim().replace(/\s+/g, ' ')
export const playerNameKey = (name) => normalizePlayerName(name).toLowerCase()
