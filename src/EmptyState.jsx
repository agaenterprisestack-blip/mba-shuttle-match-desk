import { Sparkles } from 'lucide-react'
import shuttlecock from './assets/shuttlecock.svg'

function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state-art" aria-hidden="true">
        <img src={shuttlecock} alt="" />
        <Sparkles size={22} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

export default EmptyState
