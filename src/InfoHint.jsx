function InfoHint({ label, children }) {
  return (
    <details className="info-hint">
      <summary>
        <span className="info-hint-icon" aria-hidden="true">i</span>
        <span>{label}</span>
      </summary>
      <div className="info-hint-content">{children}</div>
    </details>
  )
}

export default InfoHint
