import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

type PhysicsState = {
  t: number
  y: number
  vy: number
  angle: number
  angularVelocity: number
  bounceCount: number
  settled: boolean
  result: Exclude<Result, null>
}

const GRAVITY = -12.5
const FLOOR_Y = 0.92
const COIN_RADIUS = 1
const RESTITUTION = 0.48
const AIR_DRAG = 0.32
const SPIN_DRAG = 0.18

function Coin({ running, speed, onFinish }: { running: boolean; speed: number; onFinish: (result: Exclude<Result, null>) => void }) {
  const group = useRef<THREE.Group>(null)
  const state = useRef<PhysicsState | null>(null)
  const lastRunning = useRef(false)
  const [result, setResult] = useState<Exclude<Result, null>>('HEADS')

  useEffect(() => {
    if (running && !lastRunning.current) {
      const outcome: Exclude<Result, null> = Math.random() < 0.5 ? 'HEADS' : 'TAILS'
      state.current = {
        t: 0,
        y: 7,
        vy: 0.8,
        angle: 0,
        angularVelocity: (18 + Math.random() * 6) * (Math.random() < 0.5 ? 1 : -1),
        bounceCount: 0,
        settled: false,
        result: outcome,
      }
      setResult(outcome)
    }
    lastRunning.current = running
  }, [running])

  useFrame((_, rawDelta) => {
    const coin = group.current
    const p = state.current
    if (!coin || !p || !running || p.settled) return

    const dt = Math.min(rawDelta, 1 / 30) * speed
    p.t += dt

    // Semi-implicit Euler integration: velocity is integrated first, then position.
    p.vy += GRAVITY * dt
    p.vy *= Math.exp(-AIR_DRAG * dt)
    p.y += p.vy * dt
    p.angularVelocity *= Math.exp(-SPIN_DRAG * dt)
    p.angle += p.angularVelocity * dt

    if (p.y <= FLOOR_Y) {
      p.y = FLOOR_Y
      if (Math.abs(p.vy) > 0.8 && p.bounceCount < 4) {
        p.vy = -p.vy * RESTITUTION
        p.angularVelocity *= 0.72
        p.bounceCount += 1
      } else {
        p.vy = 0
        p.angularVelocity *= Math.max(0, 1 - 3.5 * dt)
        if (Math.abs(p.angularVelocity) < 0.08) {
          p.settled = true
          p.angle = p.result === 'HEADS' ? 0 : Math.PI
          setResult(p.result)
          onFinish(p.result)
        }
      }
    }

    // A small precession tilt makes the coin read as a rigid body rather than a flat sprite.
    const tilt = Math.min(0.22, Math.abs(p.vy) * 0.012 + Math.abs(p.angularVelocity) * 0.004)
    coin.position.y = p.y
    coin.rotation.set(tilt * Math.sin(p.t * 5), p.angle, tilt * Math.cos(p.t * 4.2))
  })

  return (
    <group ref={group} position={[0, FLOOR_Y, 0]}>
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, 0.24, 96]} />
        <meshStandardMaterial color="#c89b3c" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 64]} />
        <meshStandardMaterial color="#f1c75b" metalness={0.8} roughness={0.18} />
      </mesh>
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 64]} />
        <meshStandardMaterial color="#a87822" metalness={0.85} roughness={0.2} />
      </mesh>
      <Text position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.48} color="#6f4a12" anchorX="center" anchorY="middle">
        {result === 'HEADS' ? 'H' : 'T'}
      </Text>
    </group>
  )
}

function Scene({ running, speed, onFinish }: { running: boolean; speed: number; onFinish: (result: Exclude<Result, null>) => void }) {
  return (
    <Canvas shadows camera={{ position: [0, 4.6, 10], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 12, 24]} />
      <ambientLight intensity={0.55} />
      <spotLight position={[4, 10, 6]} angle={0.32} penumbra={0.7} intensity={140} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-5, 3, 2]} intensity={35} color="#4f7cff" />
      <Environment preset="studio" />

      <RoundedBox args={[11, 0.45, 7]} radius={0.22} smoothness={6} position={[0, 0.68, 0]} receiveShadow>
        <meshStandardMaterial color="#11151c" metalness={0.55} roughness={0.38} />
      </RoundedBox>
      <mesh position={[0, 0.91, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.5, 6.5]} />
        <meshStandardMaterial color="#171c24" metalness={0.25} roughness={0.65} />
      </mesh>
      <ContactShadows position={[0, 0.93, 0]} opacity={0.6} scale={8} blur={2.8} far={4} />
      <Coin running={running} speed={speed} onFinish={onFinish} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={14} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  )
}

function App() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [result, setResult] = useState<Result>(null)
  const [flips, setFlips] = useState(0)

  const flip = useCallback(() => {
    if (running) return
    setResult(null)
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
      <header className="topbar">
        <div>
          <span className="eyebrow">THREE.JS PHYSICS LAB</span>
          <h1>Coin Flip</h1>
        </div>
        <div className="stats"><span>FLIPS</span><strong>{flips}</strong></div>
      </header>

      <section className="game-card">
        <div className="viewport"><Scene running={running} speed={speed} onFinish={finish} /></div>
        <div className="hud">
          <div className="result-box">
            <span>RESULT</span>
            <strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong>
          </div>
          <button className="flip-button" onClick={flip} disabled={running}>{running ? 'FLIPPING…' : 'FLIP COIN'}</button>
          <div className="speed-control">
            <div className="speed-label"><span>ANIMATION SPEED</span><strong>{speed}×</strong></div>
            <input aria-label="Animation speed" type="range" min="1" max="4" step="1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <div className="speed-ticks"><span>1× REALTIME</span><span>4× FAST</span></div>
          </div>
        </div>
      </section>
      <p className="hint">Press <kbd>SPACE</kbd> to flip · Drag to inspect the scene</p>
    </main>
  )
}

export default App
