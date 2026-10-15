import { useId } from 'react'

function ProfileFields({ value, onChange, disabled }) {
  const id = useId()
  return (
    <fieldset className="profile-fields" disabled={disabled}>
      <legend>Basic profile details</legend>
      {[
        { key: 'fullName', label: 'Full name', autoComplete: 'name', required: true, maxLength: 80 },
        { key: 'phone', label: 'Phone number (optional)', autoComplete: 'tel', type: 'tel', maxLength: 32 },
        { key: 'city', label: 'City (optional)', autoComplete: 'address-level2', maxLength: 80 },
        { key: 'club', label: 'Club / team (optional)', autoComplete: 'organization', maxLength: 80 },
      ].map(({ key, label, autoComplete, required = false, type = 'text', maxLength }) => (
        <div className="profile-field" key={key}>
          <label htmlFor={`${id}-${key}`}>{label}</label>
          <input
            id={`${id}-${key}`}
            name={key}
            autoComplete={autoComplete}
            type={type}
            required={required}
            maxLength={maxLength}
            pattern={required ? '.*\\S.*' : undefined}
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </div>
      ))}
      <p className="profile-privacy">Your full name is added to player suggestions for all signed-in users, even after you sign out, unless an admin removes it. Phone number, city, and club/team stay private.</p>
    </fieldset>
  )
}

export default ProfileFields
