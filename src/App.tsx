import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

const BASE_SPEED = 2
const DURATION = 2.8
const START_Y = 4.5
const CENTER_Y = 0
const COIN_RADIUS = 1
const COIN_THICKNESS = 0.24

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3)

function Face({ type }: { type: 'HEADS' | 'TAILS' }) {
  const isHeads = type === 'HEADS'
  return (
    <group position={[0, isHeads ? COIN_THICKNESS / 2 + 0.006 : -COIN_THICKNESS / 2 - 0.006, 0]} rotation={isHeads ? [0, 0, 0] : [Math.PI, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.87, 96]} />
        <meshStandardMaterial color={isHeads ? '#f4c95d' : '#d9a33a'} metalness={0.94} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.008]}>
        <ringGeometry args={[0.73, 0.78, 96]} />
        <meshStandardMaterial color="#8b5b17" metalness={0.92} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.01]}>
        <ringGeometry args={[0.80, 0.835, 96]} />
        <meshStandardMaterial color="#f0bd48" metalness={0.88} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <Text
        position={[0, 0, 0.018]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={isHeads ? 0.56 : 0.50}
        color="#71460c"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.018}
        outlineColor="#f7d878"
      >
        {isHeads ? 'H' : 'T'}
      </Text>
      <Text
        position={[0, isHeads ? -0.64 : 0.64, 0.018]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.12}
        color="#70470d"
        anchorX="center"
        anchorY="middle"
      >
        {isHeads ? 'HEADS' : 'TAILS'}
      </Text>
      <Text
        position={[0, isHeads ? 0.64 : -0.64, 0.018]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.10}
        color="#8a5b17"
        anchorX="center"
        anchorY="middle"
      >
        ★ ★ ★
      </Text>
    </group>
  )
}

function Coin({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  const group = useRef<THREE.Group>(null)
  const coinRotation = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const wasRunning = useRef(false)
  const finished = useRef(false)

  useEffect(() => {
    if (running && !wasRunning.current) {
      elapsed.current = 0
      finished.current = false
      wasRunning.current = true
    }
    if (!running) wasRunning.current = false
  }, [running])

  useFrame((_, delta) => {
    const coin = group.current
    const rotation = coinRotation.current
    if (!coin || !rotation || !running || !result || finished.current) return

    elapsed.current += Math.min(delta, 0.05) * speed
    const progress = clamp01(elapsed.current / DURATION)
    coin.position.set(0, THREE.MathUtils.lerp(START_Y, CENTER_Y, easeOutCubic(progress)), 0)

    const targetRotation = result === 'HEADS' ? 0 : Math.PI
    const turns = 5
    rotation.rotation.x = targetRotation + (1 - progress) * Math.PI * 2 * turns
    rotation.rotation.y = 0
    rotation.rotation.z = 0

    if (progress >= 1) {
      coin.position.set(0, CENTER_Y, 0)
      rotation.rotation.set(targetRotation, 0, 0)
      finished.current = true
      onFinish(result)
    }
  })

  return (
    <group ref={group} position={[0, START_Y, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <group ref={coinRotation}>
          <mesh>
            <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 96, 8]} />
            <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
          </mesh>
          <Face type="HEADS" />
          <Face type="TAILS" />
        </group>
      </group>
    </group>
  )
}

function Scene({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 35 }} dpr={[1, 2]}>
      <color attach="background" args={['#06080c']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={2.5} />
      <directionalLight position={[-4, 1, 4]} intensity={1.2} />
      <spotLight position={[0, 1.5, 4]} target-position={[0, CENTER_Y, 0]} angle={0.55} penumbra={0.35} intensity={7} distance={12} castShadow />
      <Coin running={running} speed={speed} result={result} onFinish={onFinish} />
    </Canvas>
  )
}

function App() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(BASE_SPEED)
  const [result, setResult] = useState<Result>(null)
  const [flips, setFlips] = useState(0)

  const flip = useCallback(() => {
    if (running) return
    setResult(Math.random() < 0.5 ? 'HEADS' : 'TAILS')
    setRunning(true)
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
            <input aria-label="Animation speed" type="range" min="1" max="4" step="1" value={speed / BASE_SPEED} onChange={(e) => setSpeed(Number(e.target.value) * BASE_SPEED)} />
            <div className="speed-ticks"><span>2× BASE</span><span>8× FAST</span></div>
          </div>
        </div>
      </section>
      <p className="hint">Press <kbd>SPACE</kbd> to flip</p>
    </main>
  )
}

export default App
