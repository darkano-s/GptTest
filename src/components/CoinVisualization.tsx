import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

type Result = 'HEADS' | 'TAILS'

const DURATION = 2.8
const START_Y = 4.5
const CENTER_Y = 0
const COIN_RADIUS = 1
const COIN_THICKNESS = .24
const COIN_SIDES = 7
const HEPTAGON_ROTATION = Math.PI / 2
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3)

function createSoftPolygon(radius: number, depth: number) {
  const shape = new THREE.Shape()
  const start = -Math.PI / 2
  const cornerRadius = .105
  const points: Array<[number, number]> = Array.from({ length: COIN_SIDES }, (_, i) => {
    const a = start + i / COIN_SIDES * Math.PI * 2
    return [Math.cos(a) * radius, Math.sin(a) * radius]
  })
  for (let i = 0; i < COIN_SIDES; i++) {
    const [x, y] = points[i]
    const [px, py] = points[(i + COIN_SIDES - 1) % COIN_SIDES]
    const [nx, ny] = points[(i + 1) % COIN_SIDES]
    const lp = Math.hypot(px - x, py - y)
    const ln = Math.hypot(nx - x, ny - y)
    const t = Math.min(cornerRadius, lp * .28, ln * .28)
    const a1 = [x + (px - x) * t / lp, y + (py - y) * t / lp]
    const a2 = [x + (nx - x) * t / ln, y + (ny - y) * t / ln]
    if (i === 0) shape.moveTo(a1[0], a1[1])
    else shape.lineTo(a1[0], a1[1])
    shape.quadraticCurveTo(x, y, a2[0], a2[1])
  }
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: .045,
    bevelSize: .14,
    bevelSegments: 12,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

function createCrownGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-.34, -.18)
  shape.lineTo(-.29, .18)
  shape.lineTo(-.11, .02)
  shape.lineTo(0, .24)
  shape.lineTo(.11, .02)
  shape.lineTo(.29, .18)
  shape.lineTo(.34, -.18)
  shape.lineTo(.22, -.28)
  shape.lineTo(-.22, -.28)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .045,
    bevelEnabled: true,
    bevelThickness: .018,
    bevelSize: .016,
    bevelSegments: 3,
  })
  geometry.translate(0, 0, -.0225)
  return geometry
}

function Face({ type }: { type: Result }) {
  const isHeads = type === 'HEADS'
  const faceGeometry = useMemo(() => createSoftPolygon(.87, .035), [])
  const crownGeometry = useMemo(() => createCrownGeometry(), [])
  const z = isHeads ? COIN_THICKNESS / 2 + .008 : -COIN_THICKNESS / 2 - .008
  const detailZ = isHeads ? .080 : -.080
  const sideOffset = (value: number) => isHeads ? value : -value

  useEffect(() => () => {
    faceGeometry.dispose()
    crownGeometry.dispose()
  }, [faceGeometry, crownGeometry])

  return <group position={[0, 0, z]}>
    <mesh geometry={faceGeometry}>
      <meshStandardMaterial color={isHeads ? '#e7b84e' : '#c8942d'} metalness={.97} roughness={.16} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, sideOffset(.035)]} rotation={[0, 0, HEPTAGON_ROTATION]}>
      <ringGeometry args={[.695, .765, COIN_SIDES]} />
      <meshStandardMaterial color="#6e4510" metalness={.94} roughness={.2} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, sideOffset(.041)]}>
      <ringGeometry args={[.775, .825, COIN_SIDES]} />
      <meshStandardMaterial color="#f5ce67" metalness={.94} roughness={.14} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, sideOffset(.045)]}>
      <ringGeometry args={[.565, .59, 64]} />
      <meshStandardMaterial color="#765016" metalness={.9} roughness={.18} side={THREE.DoubleSide} />
    </mesh>
    <group position={[0, 0, sideOffset(.052)]}>
      {'ONERING'.split('').map((letter, i) => {
        const a = i / 7 * Math.PI * 2 - Math.PI / 2
        return <Text key={i} position={[Math.cos(a) * .675, Math.sin(a) * .675, 0]} rotation={[0, 0, a + Math.PI / 2]} fontSize={.105} color="#51330b" anchorX="center" anchorY="middle" outlineWidth={.012} outlineColor="#d9a93e" material-side={THREE.DoubleSide}>{letter}</Text>
      })}
    </group>
    {!isHeads && <mesh position={[0, 0, sideOffset(.055)]} rotation={[0, 0, HEPTAGON_ROTATION + Math.PI]} scale={[1.5, 1.5, 1]}>
      <torusGeometry args={[.34, .032, 8, 7]} />
      <meshStandardMaterial color="#f0c55c" metalness={.96} roughness={.14} />
    </mesh>}
    {isHeads && Array.from({ length: COIN_SIDES }).map((_, i) => {
      const a = i / COIN_SIDES * Math.PI * 2 + Math.PI / 14
      return <mesh key={i} position={[Math.cos(a) * .605, Math.sin(a) * .605, sideOffset(.058)]}>
        <sphereGeometry args={[.028, 10, 8]} />
        <meshStandardMaterial color="#f4c85e" metalness={.98} roughness={.12} />
      </mesh>
    })}
    {isHeads
      ? <mesh geometry={crownGeometry} position={[0, 0, detailZ]} scale={[1.18, 1.18, 1]}>
          <meshStandardMaterial color="#b77a18" metalness={.92} roughness={.22} emissive="#6b3d08" emissiveIntensity={.22} side={THREE.DoubleSide} />
        </mesh>
      : <Text position={[0, 0, -.095]} rotation={[0, 0, Math.PI]} scale={[-1, 1, 1]} fontSize={.52} color="#4a2b05" anchorX="center" anchorY="middle" outlineWidth={.025} outlineColor="#f0c65b" material-side={THREE.DoubleSide}>50</Text>}
  </group>
}

function Coin({ running, speed, targetResult, onFinish }: { running: boolean; speed: number; targetResult: Result | null; onFinish: (result: Result) => void }) {
  const group = useRef<THREE.Group>(null)
  const rot = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const wasRunning = useRef(false)
  const finished = useRef(false)
  const geometry = useMemo(() => createSoftPolygon(COIN_RADIUS, COIN_THICKNESS), [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    if (running && !wasRunning.current) {
      elapsed.current = 0
      finished.current = false
      wasRunning.current = true
    }
    if (!running) wasRunning.current = false
  }, [running])

  useFrame((_, delta) => {
    if (!group.current || !rot.current || !running || !targetResult || finished.current) return
    elapsed.current += Math.min(delta, .05) * speed
    const progress = clamp01(elapsed.current / DURATION)
    group.current.position.set(0, THREE.MathUtils.lerp(START_Y, CENTER_Y, easeOutCubic(progress)), 0)
    const targetRotation = targetResult === 'HEADS' ? 0 : Math.PI
    rot.current.rotation.set(targetRotation + (1 - progress) * Math.PI * 10, 0, 0)
    if (progress >= 1) {
      group.current.position.set(0, 0, 0)
      rot.current.rotation.set(targetRotation, 0, 0)
      finished.current = true
      onFinish(targetResult)
    }
  })

  return <group ref={group} position={[0, START_Y, 0]}>
    <group ref={rot}>
      <mesh geometry={geometry}><meshStandardMaterial color="#b47a1f" metalness={.98} roughness={.17} /></mesh>
      <Face type="HEADS" />
      <Face type="TAILS" />
    </group>
  </group>
}

function SoftShadow({ running, speed }: { running: boolean; speed: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)
  const wasRunning = useRef(false)
  useEffect(() => {
    if (running && !wasRunning.current) { elapsed.current = 0; wasRunning.current = true }
    if (!running) wasRunning.current = false
  }, [running])
  useFrame((_, delta) => {
    if (!ref.current) return
    if (running) {
      elapsed.current += Math.min(delta, .05) * speed
      const progress = clamp01(elapsed.current / DURATION)
      const closeness = easeOutCubic(progress)
      const scale = THREE.MathUtils.lerp(.18, .72, closeness)
      ref.current.scale.set(scale, scale * .38, 1)
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(.05, .22, closeness)
    } else {
      ref.current.scale.set(.72, .27, 1)
    }
  })
  return <mesh ref={ref} position={[0, -.02, -.65]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[1, 64]} />
    <meshBasicMaterial color="#000000" transparent opacity={.08} depthWrite={false} />
  </mesh>
}

function PostProcessing() {
  const { gl, scene, camera, size } = useThree()
  const composer = useMemo(() => {
    const instance = new EffectComposer(gl)
    instance.addPass(new RenderPass(scene, camera))
    instance.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), .42, .7, .82))
    return instance
  }, [gl, scene, camera])
  useEffect(() => {
    composer.setSize(size.width, size.height)
    composer.setPixelRatio(gl.getPixelRatio())
    return () => composer.dispose()
  }, [composer, size.width, size.height, gl])
  useFrame(() => composer.render(), 1)
  return null
}

export default function CoinVisualization({ running, speed, targetResult, onFinish }: { running: boolean; speed: number; targetResult: Result | null; onFinish: (result: Result) => void }) {
  return <div className="scene-wrap">
    <Canvas camera={{ position: [0, 0, 10], fov: 35 }} dpr={[1, 2]}>
      <color attach="background" args={['#050810']} />
      <ambientLight intensity={.42} />
      <directionalLight position={[3, 5, 8]} intensity={2.5} />
      <directionalLight position={[-4, 1, 4]} intensity={1.2} />
      <spotLight position={[0, 2, 5]} target-position={[0, 0, 0]} angle={.55} penumbra={.3} intensity={9} distance={14} castShadow />
      <spotLight position={[-4, -2.5, 5]} target-position={[0, 0, 0]} angle={.65} penumbra={.4} intensity={7} distance={14} castShadow />
      <spotLight position={[4, -2.5, 5]} target-position={[0, 0, 0]} angle={.65} penumbra={.4} intensity={7} distance={14} castShadow />
      <spotLight position={[-4, -5, 5]} target-position={[0, 0, 0]} angle={.7} penumbra={.35} intensity={12} distance={14} castShadow />
      <spotLight position={[4, -5, 5]} target-position={[0, 0, 0]} angle={.7} penumbra={.35} intensity={12} distance={14} castShadow />
      <pointLight position={[-2.8, 1.5, -3.5]} color="#36d8ff" intensity={18} distance={8} />
      <pointLight position={[2.8, -1.5, -3.5]} color="#ffd06a" intensity={7} distance={8} />
      <SoftShadow running={running} speed={speed} />
      <Coin running={running} speed={speed} targetResult={targetResult} onFinish={onFinish} />
      <PostProcessing />
    </Canvas>
    <div className="vignette" />
  </div>
}
