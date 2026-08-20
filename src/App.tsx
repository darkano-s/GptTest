import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null
type Phase = 'airborne' | 'impact' | 'wobble' | 'settling' | 'rest'

type PhysicsState = {
  y: number
  vy: number
  tilt: number
  tiltVelocity: number
  spin: number
  spinVelocity: number
  yaw: number
  yawVelocity: number
  bounceCount: number
  phase: Phase
  result: Exclude<Result, null>
}

const GRAVITY = -12.5
const FLOOR_Y = 1.04
const COIN_RADIUS = 1
const COIN_THICKNESS = 0.24
const RESTITUTION = 0.24
const SPIN_FRICTION = 0.9
const EDGE_FRICTION = 3.0
const WOBBLE_DAMPING = 1.9
const WOBBLE_FREQUENCY = 11
const CONTACT_EPSILON = 0.008

function damp(value: number, amount: number, dt: number) {
  return value * Math.exp(-amount * dt)
}

function Coin({ running, speed, onFinish }: { running: boolean; speed: number; onFinish: (result: Exclude<Result, null>) => void }) {
  const group = useRef<THREE.Group>(null)
  const state = useRef<PhysicsState | null>(null)
  const lastRunning = useRef(false)

  useEffect(() => {
    if (running && !lastRunning.current) {
      const outcome: Exclude<Result, null> = Math.random() < 0.5 ? 'HEADS' : 'TAILS'
      state.current = {
        y: 7,
        vy: 0.8,
        tilt: 0.14 + Math.random() * 0.08,
        tiltVelocity: (Math.random() - 0.5) * 0.8,
        spin: 0,
        spinVelocity: (19 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1),
        yaw: (Math.random() - 0.5) * 0.25,
        yawVelocity: (Math.random() - 0.5) * 1.5,
        bounceCount: 0,
        phase: 'airborne',
        result: outcome,
      }
    }
    lastRunning.current = running
  }, [running])

  useFrame((_, rawDelta) => {
    const coin = group.current
    const p = state.current
    if (!coin || !p || !running || p.phase === 'rest') return

    // Substep the rigid-body integration so fast downward motion cannot tunnel through the floor.
    let remaining = Math.min(rawDelta, 1 / 30) * speed
    const step = 1 / 240

    while (remaining > 0 && p.phase !== 'rest') {
      const dt = Math.min(step, remaining)
      remaining -= dt

      if (p.phase === 'airborne' || p.phase === 'impact') {
        p.vy += GRAVITY * dt
        p.y += p.vy * dt
        p.spin += p.spinVelocity * dt
        p.yaw += p.yawVelocity * dt

        // The coin is tilted in X/Z while airborne. The support height is conservative,
        // using the coin radius projected onto the floor normal, so the body never enters the floor.
        const supportHeight = COIN_THICKNESS * 0.5 * Math.abs(Math.cos(p.tilt)) + COIN_RADIUS * Math.abs(Math.sin(p.tilt))
        const contactY = FLOOR_Y + supportHeight

        if (p.y <= contactY + CONTACT_EPSILON) {
          p.y = contactY
          p.phase = 'impact'

          // Normal impulse: reverse only the incoming normal velocity and lose energy through restitution.
          if (p.vy < -0.15 && p.bounceCount === 0) {
            p.vy = -p.vy * RESTITUTION
            p.spinVelocity *= 0.82
            p.tiltVelocity += (Math.random() - 0.5) * 1.8
            p.bounceCount = 1
          } else {
            p.vy = 0
            p.phase = 'wobble'
          }
        }
      } else if (p.phase === 'wobble') {
        // Edge contact behaves like an inverted pendulum: gravity drives the tilt back toward flat,
        // while contact friction and spin bleed angular momentum away.
        p.tiltVelocity += -Math.sin(p.tilt) * WOBBLE_FREQUENCY * WOBBLE_FREQUENCY * dt
        p.tiltVelocity = damp(p.tiltVelocity, WOBBLE_DAMPING + EDGE_FRICTION * 0.35, dt)
        p.tilt += p.tiltVelocity * dt
        p.spinVelocity = damp(p.spinVelocity, SPIN_FRICTION + Math.abs(p.tiltVelocity) * 0.12, dt)
        p.yawVelocity = damp(p.yawVelocity, 2.4, dt)
        p.spin += p.spinVelocity * dt
        p.yaw += p.yawVelocity * dt

        // Prevent the visual body from penetrating the floor while wobbling.
        const supportHeight = COIN_THICKNESS * 0.5 * Math.abs(Math.cos(p.tilt)) + COIN_RADIUS * Math.abs(Math.sin(p.tilt))
        p.y = Math.max(p.y, FLOOR_Y + supportHeight)

        if (Math.abs(p.tilt) < 0.055 && Math.abs(p.tiltVelocity) < 0.16) {
          p.phase = 'settling'
        }
      } else if (p.phase === 'settling') {
        p.tiltVelocity = damp(p.tiltVelocity, 5.5, dt)
        p.tilt += (0 - p.tilt) * Math.min(1, 9 * dt)
        p.spinVelocity = damp(p.spinVelocity, 5.5, dt)
        p.yawVelocity = damp(p.yawVelocity, 5.5, dt)
        p.spin += p.spinVelocity * dt
        p.yaw += p.yawVelocity * dt
        p.y = FLOOR_Y + COIN_THICKNESS * 0.5

        if (Math.abs(p.tilt) < 0.008 && Math.abs(p.tiltVelocity) < 0.04 && Math.abs(p.spinVelocity) < 0.04) {
          p.tilt = 0
          p.tiltVelocity = 0
          p.spinVelocity = 0
          p.yawVelocity = 0
          p.y = FLOOR_Y + COIN_THICKNESS * 0.5
          p.phase = 'rest'
          // Final orientation: the local +Y face is heads; rotating around X by PI exposes tails.
          coin.rotation.set(p.result === 'HEADS' ? 0 : Math.PI, p.yaw, 0)
          onFinish(p.result)
        }
      }
    }

    coin.position.y = p.y
    // One rigid body orientation: tilt around Z, spin around the coin's local X axis,
    // and yaw around Y. No extra meshes are allowed to carry independent rotations.
    coin.rotation.set(p.spin, p.yaw, p.tilt)
  })

  return (
    <group ref={group} position={[0, FLOOR_Y + COIN_THICKNESS * 0.5, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 96, 8]} />
        <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
      </mesh>
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
      <header className="topbar"><div><span className="eyebrow">THREE.JS PHYSICS LAB</span><h1>Coin Flip</h1></div><div className="stats"><span>FLIPS</span><strong>{flips}</strong></div></header>
      <section className="game-card">
        <div className="viewport"><Scene running={running} speed={speed} onFinish={finish} /></div>
        <div className="hud">
          <div className="result-box"><span>RESULT</span><strong>{result ?? (running ? 'FLIPPING…' : 'READY')}</strong></div>
          <button className="flip-button" onClick={flip} disabled={running}>{running ? 'FLIPPING…' : 'FLIP COIN'}</button>
          <div className="speed-control"><div className="speed-label"><span>ANIMATION SPEED</span><strong>{speed}×</strong></div><input aria-label="Animation speed" type="range" min="1" max="4" step="1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /><div className="speed-ticks"><span>1× REALTIME</span><span>4× FAST</span></div></div>
        </div>
      </section>
      <p className="hint">Press <kbd>SPACE</kbd> to flip · Drag to inspect the scene</p>
    </main>
  )
}

export default App
