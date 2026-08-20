import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './index.css'

type Result = 'HEADS' | 'TAILS' | null

const FLOOR_TOP = 0.91
const FLOOR_THICKNESS = 0.45
const COIN_RADIUS = 1
const COIN_HALF_THICKNESS = 0.12
const COIN_CENTER_Y = FLOOR_TOP + COIN_HALF_THICKNESS + 3.7
const ARENA_X = 5.25
const ARENA_Z = 3.25
const WALL_HEIGHT = 1.4
const WALL_THICKNESS = 0.25

function Coin({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const [settled, setSettled] = useState(false)
  const previousRunning = useRef(false)
  const settledTime = useRef(0)

  useEffect(() => {
    if (!running || previousRunning.current || !result) return
    const rb = body.current
    if (!rb) return

    rb.setTranslation({ x: 0, y: COIN_CENTER_Y, z: 0 }, true)
    rb.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (Math.random() - 0.5) * 0.25)), true)

    // A real rigid-body launch: linear velocity, spin, and a small off-axis component.
    const direction = Math.random() < 0.5 ? -1 : 1
    rb.setLinvel({ x: (Math.random() - 0.5) * 1.2, y: 0.5, z: (Math.random() - 0.5) * 1.2 }, true)
    rb.setAngvel({
      x: direction * (18 + Math.random() * 5),
      y: (Math.random() - 0.5) * 1.5,
      z: (Math.random() - 0.5) * 1.2,
    }, true)
    rb.wakeUp()
    setSettled(false)
    settledTime.current = 0
    previousRunning.current = true
  }, [running, result])

  useEffect(() => {
    if (!running) previousRunning.current = false
  }, [running])

  useFrame((_, delta) => {
    const rb = body.current
    const v = visual.current
    if (!rb || !v || !running) return

    // The visual is driven directly by Rapier's interpolated rigid-body transform.
    const t = rb.translation()
    const q = rb.rotation()
    v.position.set(t.x, t.y, t.z)
    v.quaternion.set(q.x, q.y, q.z, q.w)

    const linvel = rb.linvel()
    const angvel = rb.angvel()
    const speedLinear = Math.hypot(linvel.x, linvel.y, linvel.z)
    const speedAngular = Math.hypot(angvel.x, angvel.y, angvel.z)

    if (!settled && Math.abs(t.y - (FLOOR_TOP + COIN_HALF_THICKNESS)) < 0.035 && speedLinear < 0.16 && speedAngular < 0.16) {
      settledTime.current += delta * speed
      if (settledTime.current > 0.22) {
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
        setSettled(true)
        onFinish(result!)
      }
    } else {
      settledTime.current = 0
    }
  })

  return (
    <>
      <RigidBody
        ref={body}
        type="dynamic"
        colliders={false}
        ccd
        canSleep
        restitution={0.28}
        friction={0.68}
        linearDamping={0.08}
        angularDamping={0.38}
        mass={0.25}
        position={[0, COIN_CENTER_Y, 0]}
        enabledRotations={[true, true, true]}
        gravityScale={1}
      >
        {/* Physical collider is a true cylinder aligned with the visual coin. */}
        <CylinderCollider args={[COIN_HALF_THICKNESS, COIN_RADIUS]} restitution={0.28} friction={0.68} />
      </RigidBody>

      <group ref={visual} castShadow>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_HALF_THICKNESS * 2, 96, 8]} />
          <meshStandardMaterial color="#b67b22" metalness={0.96} roughness={0.19} />
        </mesh>
        <group position={[0, COIN_HALF_THICKNESS + 0.004, 0]}>
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
        <group position={[0, -COIN_HALF_THICKNESS - 0.004, 0]} rotation={[Math.PI, 0, 0]}>
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
    </>
  )
}

function Arena({ running, speed, result, onFinish }: { running: boolean; speed: number; result: Exclude<Result, null> | null; onFinish: (result: Exclude<Result, null>) => void }) {
  return (
    <Physics gravity={[0, -12.5, 0]} timeStep={1 / 120} interpolate updatePriority={-1}>
      <RigidBody type="fixed" colliders={false} friction={0.82} restitution={0.2}>
        <CuboidCollider args={[5.5, FLOOR_THICKNESS / 2, 3.5]} position={[0, FLOOR_TOP - FLOOR_THICKNESS / 2, 0]} friction={0.82} restitution={0.2} />
      </RigidBody>

      {/* Invisible perimeter walls keep the rigid body inside the visual table. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[WALL_THICKNESS, WALL_HEIGHT, ARENA_Z]} position={[-ARENA_X - WALL_THICKNESS, FLOOR_TOP + WALL_HEIGHT, 0]} />
        <CuboidCollider args={[WALL_THICKNESS, WALL_HEIGHT, ARENA_Z]} position={[ARENA_X + WALL_THICKNESS, FLOOR_TOP + WALL_HEIGHT, 0]} />
        <CuboidCollider args={[ARENA_X, WALL_HEIGHT, WALL_THICKNESS]} position={[0, FLOOR_TOP + WALL_HEIGHT, -ARENA_Z - WALL_THICKNESS]} />
        <CuboidCollider args={[ARENA_X, WALL_HEIGHT, WALL_THICKNESS]} position={[0, FLOOR_TOP + WALL_HEIGHT, ARENA_Z + WALL_THICKNESS]} />
      </RigidBody>

      <Coin running={running} speed={speed} result={result} onFinish={onFinish} />
    </Physics>
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
      <Arena running={running} speed={speed} result={result} onFinish={onFinish} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={14} maxPolarAngle={Math.PI / 2.12} />
    </Canvas>
  )
}

function App() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
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
      <header className="topbar"><div><span className="eyebrow">THREE.JS PHYSICS LAB</span><h1>Coin Flip</h1></div><div className="stats"><span>FLIPS</span><strong>{flips}</strong></div></header>
      <section className="game-card">
        <div className="viewport"><Scene running={running} speed={speed} result={result} onFinish={finish} /></div>
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
