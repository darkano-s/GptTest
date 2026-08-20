import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

type PhysicsState = { y: number; vy: number; angle: number; angularVelocity: number; bounceCount: number; settled: boolean; result: Exclude<Result, null> }

const GRAVITY = -12.5
const FLOOR_Y = 1.04
const COIN_RADIUS = 1
const COIN_THICKNESS = 0.24
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
      state.current = { y: 7, vy: 0.8, angle: 0, angularVelocity: (19 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1), bounceCount: 0, settled: false, result: outcome }
      setResult(outcome)
    }
    lastRunning.current = running
  }, [running])

  useFrame((_, rawDelta) => {
    const coin = group.current
    const p = state.current
    if (!coin || !p || !running || p.settled) return
    const dt = Math.min(rawDelta, 1 / 60) * speed
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
          coin.rotation.set(p.angle, 0, 0)
          onFinish(p.result)
        }
      }
    }

    const airborneTilt = Math.min(0.13, Math.abs(p.vy) * 0.006 + Math.abs(p.angularVelocity) * 0.0025)
    coin.position.y = p.y
    coin.rotation.set(p.angle, airborneTilt * Math.cos(p.angle * 0.7), airborneTilt * Math.sin(p.angle * 0.9))
  })

  return (
    <group ref={group} position={[0, FLOOR_Y, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 96, 8]} />
        <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
      </mesh>

      {/* Face decorations are flat discs, not cylinders. The coin body is the only thickness-bearing cylinder. */}
      <group position={[0, COIN_THICKNESS / 2 + 0.004, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.86, 96]} />
          <meshStandardMaterial color="#f2c75b" metalness={0.92} roughness={0.16} side={THREE.FrontSide} />
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
          <meshStandardMaterial color="#d59a2f" metalness={0.9} roughness={0.2} side={THREE.FrontSide} />
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

function Scene({ running, speed, onFinish }: { running: boolean; speed: number; onFinish: (result: Exclude<Result, null>) => void }) {
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
      <Coin running={running} speed={speed} onFinish={onFinish} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={14} maxPolarAngle={Math.PI / 2.12} />
    </Canvas>
  )
}

function App() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [result, setResult] = useState<Result>(null)
  const [flips, setFlips] = useState(0)

  const flip = useCallback(() => { if (!running) { setResult(null); setRunning(true) } }, [running])
  const finish = useCallback((outcome: Exclude<Result, null>) => { setResult(outcome); setFlips((n) => n + 1); setRunning(false) }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.code === 'Space') { event.preventDefault(); flip() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">THREE.JS PHYSICS LAB</span><h1>Coin Flip</h1></div>
        <div className="stats"><span>FLIPS</span><strong>{flips}</strong></div>
      </header>
      <section className="game-card">
        <div className="viewport"><Scene running={running} speed={speed} onFinish={finish} /></div>
        <div className="hud">
          <div className="result-box"><span>RESULT</span><strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong></div>
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
