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
    <section className="game-card">
      <div className="viewport">
        <CoinVisualization
          running={running}
          speed={speed}
          targetResult={targetResult}
          onFinish={handleFinish}
        />
      </div>
      <CoinControls
        result={targetResult}
        running={running}
        flips={flips}
        speed={speed}
        onFlip={handleFlip}
        onSpeedChange={setSpeed}
      />
    </section>
  )
}
