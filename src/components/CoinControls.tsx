import { useEffect } from 'react'

type Result = 'HEADS' | 'TAILS'

interface CoinControlsProps {
  result: Result | null
  running: boolean
  flips: number
  speed: number
  onFlip: (result: Result) => void
  onSpeedChange: (speed: number) => void
}

export default function CoinControls({ result, running, flips, speed, onFlip, onSpeedChange }: CoinControlsProps) {
  const flip = () => {
    if (!running) onFlip(Math.random() < 0.5 ? 'HEADS' : 'TAILS')
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') { event.preventDefault(); flip() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [running])

  return (
    <>
      <section className="card control-card">
        <div>
          <span className="eyebrow">CONTROL CENTER</span>
          <h2 className="card-title">Flip the coin</h2>
          <p className="card-copy">Choose the motion. The visualization handles the landing.</p>
          <div className="result-panel">
            <span>RESULT</span>
            <strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong>
          </div>
        </div>
        <button className="flip-button" onClick={flip} disabled={running}>{running ? 'FLIPPING…' : 'FLIP COIN'}</button>
        <div className="metric-row">
          <div className="metric"><span>FLIPS</span><strong>{flips}</strong></div>
          <div className="metric"><span>STATE</span><strong>{running ? 'LIVE' : 'IDLE'}</strong></div>
        </div>
      </section>
      <section className="card speed-card">
        <div className="speed-label"><span>ANIMATION SPEED</span><strong>{speed}×</strong></div>
        <input aria-label="Animation speed" type="range" min="1" max="4" step="1" value={speed / 2} onChange={(event) => onSpeedChange(Number(event.target.value) * 2)} />
        <div className="speed-ticks"><span>2× BASE</span><span>8× FAST</span></div>
      </section>
    </>
  )
}
