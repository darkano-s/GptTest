import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

const BASE_SPEED = 5
const DURATION = 1.2
const START_Y = 4.5
const CENTER_Y = 0
const COIN_RADIUS = 1
const COIN_THICKNESS = 0.24

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3)

function Coin({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  const group = useRef<THREE.Group>(null)
  const faceGroup = useRef<THREE.Group>(null)
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
    const faces = faceGroup.current
    if (!coin || !faces || !running || !result || finished.current) return

    // Pure scripted animation: no gravity, physics, collisions, bounce or platform.
    elapsed.current += Math.min(delta, 0.05) * speed
    const progress = clamp01(elapsed.current / DURATION)
    const moveT = easeOut(progress)

    // Drop straight to the center of the screen.
    coin.position.set(0, THREE.MathUtils.lerp(START_Y, CENTER_Y, moveT), 0)

    // The physical coin is oriented with its local Y axis pointing toward the camera.
    // The face group then rotates around that viewing axis. This guarantees that the
    // final state shows a face, never the coin edge.
    const rotations = 4.5
    const targetFaceRotation = result === 'HEADS' ? 0 : Math.PI
    faces.rotation.z = targetFaceRotation + (1 - progress) * Math.PI * 2 * rotations

    if (progress >= 1) {
      coin.position.set(0, CENTER_Y, 0)
      faces.rotation.z = targetFaceRotation
      finished.current = true
      onFinish(result)
    }
  })

  return (
    <group ref={group} position={[0, START_Y, 0]}>
      {/* Rotate the cylinder once so its circular faces point down the camera's Z axis. */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <group ref={faceGroup}>
          <mesh>
            <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 96, 8]} />
            <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
          </mesh>
          <group position={[0, COIN_THICKNESS / 2 + 0.004, 0]}>
            <mesh>
              <circleGeometry args={[0.86, 96]} />
              <meshStandardMaterial color="#f2c75b" metalness={0.92} roughness={0.16} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, 0, 0.006]} rotation={[0, 0, 0]} fontSize={0.56} color="#795016" anchorX="center" anchorY="middle">H</Text>
          </group>
          <group position={[0, -COIN_THICKNESS / 2 - 0.004, 0]} rotation={[Math.PI, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.86, 96]} />
              <meshStandardMaterial color="#d59a2f" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, 0, 0.006]} fontSize={0.5} color="#744b12" anchorX="center" anchorY="middle">T</Text>
          </group>
        </group>
      </group>
    </group>
  )
}

function Scene({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 35 }} dpr={[1, 2]}>
      <color attach="background" args={['#06080c']} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 8]} intensity={2.8} />
      <directionalLight position={[-4, 1, 4]} intensity={1.2} />
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
            <div className="speed-ticks"><span>5× BASE</span><span>20× FAST</span></div>
          </div>
        </div>
      </section>
      <p className="hint">Press <kbd>SPACE</kbd> to flip</p>
    </main>
  )
}

export default App
