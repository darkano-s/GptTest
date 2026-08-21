import { useEffect, useState } from 'react'

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
    if (running) return
    onFlip(Math.random() < 0.5 ? 'HEADS' : 'TAILS')
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        flip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [running])

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">THREE.JS COIN FLIP</span>
          <h1>Coin Flip</h1>
        </div>
        <div className="stats">
          <span>FLIPS</span>
          <strong>{flips}</strong>
        </div>
      </header>

      <div className="hud">
        <div className="result-box">
          <span>RESULT</span>
          <strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong>
        </div>

        <button className="flip-button" onClick={flip} disabled={running}>
          {running ? 'FLIPPING…' : 'FLIP COIN'}
        </button>

        <div className="speed-control">
          <div className="speed-label">
            <span>ANIMATION SPEED</span>
            <strong>{speed}×</strong>
          </div>
          <input
            aria-label="Animation speed"
            type="range"
            min="1"
            max="4"
            step="1"
            value={speed / 2}
            onChange={(event) => onSpeedChange(Number(event.target.value) * 2)}
          />
          <div className="speed-ticks">
            <span>2× BASE</span>
            <span>8× FAST</span>
          </div>
        </div>
      </div>

      <p className="hint">Press <kbd>SPACE</kbd> to flip</p>
    </>
  )
}
