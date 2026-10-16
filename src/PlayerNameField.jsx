import { useId } from 'react'

function PlayerNameField({ name, playerIndex, teamIndex, onChange, savedNames, duplicate = false }) {
  const id = useId()

  return (
    <div className="player-name-field">
      <label className="player-name-label" htmlFor={id}>
        <span>Player {playerIndex + 1}</span>
        <input
          id={id}
          list={`${id}-saved`}
          value={name}
          placeholder={`Enter player ${playerIndex + 1} name`}
          maxLength={80}
          aria-invalid={duplicate}
          aria-describedby={duplicate ? 'duplicate-player-error' : undefined}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Side ${teamIndex + 1} player ${playerIndex + 1} name`}
        />
      </label>
      <datalist id={`${id}-saved`}>
        {savedNames.map((entry) => <option key={entry} value={entry} />)}
      </datalist>
    </div>
  )
}

export default PlayerNameField
