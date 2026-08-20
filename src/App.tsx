import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

const BASE_SPEED = 5
const MAX_SPEED = BASE_SPEED * 4
const DURATION = 1.55
const START_Y = 5.2
const TARGET_Y = 1.03
const COIN_RADIUS = 1
const COIN_THICKNESS = 0.24

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3)
const easeInOutCubic = (v: number) => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2

function Coin({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  const group = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const previousRunning = useRef(false)
  const finished = useRef(false)
  const spinDirection = useRef(1)
  const startYaw = useRef(0)

  useEffect(() => {
    if (running && !previousRunning.current && result) {
      elapsed.current = 0
      finished.current = false
      spinDirection.current = Math.random() < 0.5 ? -1 : 1
      startYaw.current = (Math.random() - 0.5) * 0.16
      previousRunning.current = true
    }
    if (!running) previousRunning.current = false
  }, [running, result])

  useFrame((_, rawDelta) => {
    const coin = group.current
    if (!coin || !running || !result || finished.current) return

    // The render-loop clock is the only animation clock. Speed scales the complete timeline:
    // drop, rotation, approach to the target and final settling all advance together.
    elapsed.current += Math.min(rawDelta, 0.05) * speed
    const progress = clamp01(elapsed.current / DURATION)

    coin.position.y = THREE.MathUtils.lerp(START_Y, TARGET_Y, easeOutCubic(progress))

    const fullRotations = 5.5
    const spinAngle = spinDirection.current * Math.PI * 2 * fullRotations * progress
    const wobbleAmount = (1 - progress) * 0.18
    const wobble = Math.sin(progress * Math.PI * 7) * wobbleAmount

    if (progress < 0.78) {
      coin.rotation.set(spinAngle, startYaw.current + wobble * 0.5, wobble)
    } else {
      const settleT = easeInOutCubic((progress - 0.78) / 0.22)
      const targetX = result === 'HEADS' ? 0 : Math.PI
      const rotationsToTarget = Math.round((spinAngle - targetX) / (Math.PI * 2))
      const finalAngle = THREE.MathUtils.lerp(spinAngle, targetX + rotationsToTarget * Math.PI * 2, settleT)
      coin.rotation.set(finalAngle, THREE.MathUtils.lerp(startYaw.current + wobble * 0.5, 0, settleT), THREE.MathUtils.lerp(wobble, 0, settleT))
    }

    if (progress >= 1) {
      coin.position.set(0, TARGET_Y, 0)
      coin.rotation.set(result === 'HEADS' ? 0 : Math.PI, 0, 0)
      finished.current = true
      onFinish(result)
    }
  })

  return (
    <group ref={group} position={[0, START_Y, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 96, 8]} />
        <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
      </mesh>
      <group position={[0, COIN_THICKNESS / 2 + 0.004, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.86, 96]} />
          <meshStandardMaterial color="#f2c75b" metalness={0.92} roughness={0.16} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <torusGeometry args={[0.68, 0.055, 12, 96]} />
          <meshStandardMaterial color="#a96e17" metalness={0.95} roughness={0.2} />
        </mesh>
        <Text position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.56} color="#795016" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#f8d878">H</Text>
      </group>
      <group position={[0, -COIN_THICKNESS / 2 - 0.004, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.86, 96]} />
          <meshStandardMaterial color="#d59a2f" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <torusGeometry args={[0.68, 0.055, 12, 96]} />
          <meshStandardMaterial color="#8a5916" metalness={0.95} roughness={0.22} />
        </mesh>
        <Text position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#744b12" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#efc35a">T</Text>
      </group>
    </group>
  )
}

function Scene({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  return (
    <Canvas shadows camera={{ position: [0, 4.8, 10], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 11, 24]} />
      <ambientLight intensity={0.48} />
      <spotLight position={[4, 10, 5]} angle={0.3} penumbra={0.72} intensity={150} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-5, 4, 3]} intensity={42} color="#5478ff" />
      <pointLight position={[4, 2, -4]} intensity={20} color="#ffb52e" />
      <Environment preset="studio" />
      <RoundedBox args={[11, 0.45, 7]} radius={0.22} smoothness={6} position={[0, 0.68, 0]} receiveShadow>
        <meshStandardMaterial color="#0e131a" metalness={0.62} roughness={0.32} />
      </RoundedBox>
      <mesh position={[0, 0.91, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.5, 6.5]} />
        <meshStandardMaterial color="#151a22" metalness={0.3} roughness={0.6} />
      </mesh>
      <ContactShadows position={[0, 0.94, 0]} opacity={0.72} scale={8} blur={2.6} far={4} />
      <Coin running={running} speed={speed} result={result} onFinish={onFinish} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={14} maxPolarAngle={Math.PI / 2.12} />
    </Canvas>
  )
}

function App() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(BASE_SPEED)
  const [result, setResult] = useState<Result>(null)
  const [flips, setFlips] = useState(0)

  const flip = useCallback(() => {
    if (!running) {
      setResult(Math.random() < 0.5 ? 'HEADS' : 'TAILS')
      setRunning(true)
    }
  }, [running])

  const finish = useCallback((outcome: Exclude<Result, null>) => {
    setResult(outcome)
    setFlips((n) => n + 1)
    setRunning(false)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        flip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip])

  return (
    <main className="app-shell">
      <header className="topbar"><div><span className="eyebrow">THREE.JS COIN FLIP</span><h1>Coin Flip</h1></div><div className="stats"><span>FLIPS</span><strong>{flips}</strong></div></header>
      <section className="game-card">
        <div className="viewport"><Scene running={running} speed={speed} result={result} onFinish={finish} /></div>
        <div className="hud">
          <div className="result-box"><span>RESULT</span><strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong></div>
          <button className="flip-button" onClick={flip} disabled={running}>{running ? 'FLIPPING…' : 'FLIP COIN'}</button>
          <div className="speed-control">
            <div className="speed-label"><span>ANIMATION SPEED</span><strong>{speed}×</strong></div>
            <input aria-label="Animation speed" type="range" min={1} max={4} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <div className="speed-ticks"><span>1× BASE</span><span>4× FAST</span></div>
          </div>
        </div>
      </section>
      <p className="hint">Press <kbd>SPACE</kbd> to flip · Drag to inspect the scene</p>
    </main>
  )
}

export default App
