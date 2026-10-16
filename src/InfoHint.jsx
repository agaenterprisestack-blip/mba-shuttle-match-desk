import { Info } from 'lucide-react'

function InfoHint({ label, children }) {
  return (
    <details className="info-hint">
      <summary>
        <Info className="info-hint-icon" size={20} aria-hidden="true" />
        <span>{label}</span>
      </summary>
      <div className="info-hint-content">{children}</div>
    </details>
  )
}

export default InfoHint
