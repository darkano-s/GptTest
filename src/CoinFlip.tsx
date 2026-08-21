import { useCallback, useState } from 'react'
import CoinControls from './components/CoinControls'
import CoinVisualization from './components/CoinVisualization'

type Result = 'HEADS' | 'TAILS' | null
const BASE_SPEED = 2

export default function CoinFlip() {
  const [targetResult, setTargetResult] = useState<Result>(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(BASE_SPEED)
  const [flips, setFlips] = useState(0)

  const handleFlip = useCallback((result: Exclude<Result, null>) => {
    setTargetResult(result)
    setRunning(true)
  }, [])

  const handleFinish = useCallback((result: Exclude<Result, null>) => {
    setTargetResult(result)
    setFlips((count) => count + 1)
    setRunning(false)
  }, [])

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <span className="eyebrow">PREMIUM COIN FLIP</span>
            <h1>One Ring</h1>
          </div>
        </div>
        <div className="stats"><span>FLIPS</span><strong>{flips}</strong></div>
      </header>

      <div className="bento">
        <section className="card visual-card">
          <span className="card-label">LIVE VISUALIZATION</span>
          <div className="viewport">
            <CoinVisualization
              running={running}
              speed={speed}
              targetResult={targetResult}
              onFinish={handleFinish}
            />
          </div>
        </section>

        <CoinControls
          result={targetResult}
          running={running}
          flips={flips}
          speed={speed}
          onFlip={handleFlip}
          onSpeedChange={setSpeed}
        />
      </div>
    </>
  )
}
