import { useEffect, useState } from 'react'

function VictoryCelebration() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  return (
    <div className="victory-confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <span key={index} style={{
        '--confetti-x': `${5 + index * 5.2}%`,
        '--confetti-delay': `${index % 5 * 70}ms`,
        '--confetti-drift': `${(index % 3 - 1) * 48}px`,
        '--confetti-color': ['#c6f542', '#9471c7', '#e3b444'][index % 3],
      }} />)}
    </div>
  )
}

export default VictoryCelebration
