import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BatchedMesh,
  BufferGeometry,
  Mesh, MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three'
import {CircleGeometry, InstancedMesh, PostProcessing, SpriteNodeMaterial, WebGPURenderer} from 'three/webgpu'
import {attribute, color, mrt, output, pass} from 'three/tsl'
import {bloom} from 'three/examples/jsm/tsl/display/BloomNode.js'
// import Stats from 'three/examples/jsm/libs/stats.module.js'
import PassNode from 'three/src/nodes/display/PassNode'
import {
  acceleratedRaycast,
  computeBatchedBoundsTree,
  computeBoundsTree,
  disposeBatchedBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh'
import * as Mathjs from 'mathjs'

import {glitch} from './glitch/GlitchNode'
import {Projector} from './projector'
import {getAudioFromDevice} from './audio/capture-audio'
import {initTransientDetector} from './audio/detect-transients'
import BroadcastState from '~/lib/broadcast-state'
import {glitchDisplacement, recalculateGlitch, recalculateRipple, ripple, simpleNoise} from 'projector-noise.ts#file'
import {makeBeatStabilizer} from '~/audio/beat-stabilizer'
import {decodeGeometryData} from '~/lib/decode-geometry-data'

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
Mesh.prototype.raycast = acceleratedRaycast

BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree
BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree
BatchedMesh.prototype.raycast = acceleratedRaycast

const cameraPosition = [0, 0, 14] as [number, number, number]
// const cameraPosition = [-6, 6, 14] as [number, number, number]
const lidarPositionDelta = [6, 0, -4] as [number, number, number]
const dotSize = .015

let localGeometriesAddedFromRemote: BufferGeometry[] = []
let positionExpressions: Mathjs.EvalFunction[] = []
let rotationExpressions: Mathjs.EvalFunction[] = []

new BroadcastState<string>({id: `scene_objects`}).onChange(async value => {
  const geometries = await decodeGeometryData(value)
  localGeometriesAddedFromRemote = []
  geometriesLoop: for (const geometry of geometries) {
    childrenLoop: for (const child of projector.scene.children) {
      if (!(child instanceof Mesh)) continue
      const childVertices = child.geometry.getAttribute('position').array
      const geometryVertices = geometry.getAttribute('position').array
      if (childVertices.length !== geometryVertices.length) continue
      for (let i = 0; i < childVertices.length; i++) {
        if (childVertices[i] !== geometryVertices[i]) continue childrenLoop
      }
      // geometry already exists -> skip
      localGeometriesAddedFromRemote.push(child.geometry)
      continue geometriesLoop
    }
    const object = new Mesh(geometry, new MeshBasicMaterial())
    object.geometry.computeBoundsTree()
    localGeometriesAddedFromRemote.push(object.geometry)
    projector.scene.add(object)
  }
  if (localGeometriesAddedFromRemote.length < projector.scene.children.length) {
    for (const child of projector.scene.children) {
      if (!(child instanceof Mesh)) continue
      if (localGeometriesAddedFromRemote.some(geometry => geometry.uuid === child.geometry.uuid)) continue
      projector.scene.remove(child)
    }
  }
  reassignMeta()
  projector.needsUpdate = true
})

function reassignMeta() {
  for (let i = 0; i < localGeometriesAddedFromRemote.length; i++) {
    const geometry = localGeometriesAddedFromRemote[i]
    const mesh = projector.scene.children.find(child => {
      if (!(child instanceof Mesh)) return false
      return child.geometry.uuid == geometry.uuid
    })
    if (!mesh) continue
    const meta = objectsMeta[i]
    mesh.position.x = meta.x
    mesh.position.y = meta.y
    mesh.position.z = meta.z
    mesh.scale.setScalar(meta.scale)
    mesh.hide = !meta.enabled
    positionExpressions[i] = !!meta.positionExpression ? Mathjs.compile(meta.positionExpression) : null
    rotationExpressions[i] = !!meta.rotationExpression ? Mathjs.compile(meta.rotationExpression) : null
  }
  projector.needsUpdate = true
}

let objectsMeta: {
  x: number, y: number, z: number, scale: number, enabled: boolean,
  positionExpression: string, rotationExpression: string,
}[] = []
new BroadcastState<string>({id: `scene_object_meta`}).onChange(async value => {
  objectsMeta = JSON.parse(value)
  reassignMeta()
})

// const fpsStats = new Stats()
// fpsStats.showPanel(0)
// const msStats = new Stats()
// msStats.showPanel(1)
// msStats.dom.style.top = '48px'
// const mbStats = new Stats()
// mbStats.showPanel(2)
// mbStats.dom.style.top = '96px'
// document.body.appendChild(fpsStats.dom)
// document.body.appendChild(msStats.dom)
// document.body.appendChild(mbStats.dom)
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, .001, 5000)
camera.position.set(...cameraPosition)
camera.lookAt(new Vector3(0, 0, 0))
;(['X', 'Y', 'Z'] as const).forEach((axis, index) => {
  new BroadcastState<string>({id: `scene_pos${axis}`}).onChange(value => {
    cameraPosition[index] = Number(value.replaceAll('"', ''))
    recalcCameraPositions()
  })
})
const scene = new Scene()
const renderer = new WebGPURenderer(/*{antialias: true}*/)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(render)
renderer.toneMapping = ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const projector = new Projector(
  new Vector3(...lidarPositionDelta.map((v, i) => cameraPosition[i] + v) as [number, number, number]),
  new Vector3(0, 0, 0),
  Math.round(128 * 1.5)
)
const projPosRelativeState = new BroadcastState({id: 'lidar_posRelative'})
projPosRelativeState.onChange(recalcCameraPositions)
;(['X', 'Y', 'Z'] as const).forEach((axis, index) => {
  new BroadcastState<string>({id: `lidar_pos${axis}`}).onChange(value => {
    lidarPositionDelta[index] = Number(value.replaceAll('"', ''))
    recalcCameraPositions()
  })
})

function recalcCameraPositions() {
  camera.position.set(...cameraPosition)
  camera.lookAt(new Vector3(0, 0, 0))
  let lidarPosition = lidarPositionDelta
  if (projPosRelativeState.value === 'true') lidarPosition = lidarPosition.map((component, index) => component + cameraPosition[index]) as [number, number, number]
  projector.projector.position.set(...lidarPosition)
  projector.projector.lookAt(projector.lookAt)
  projector.needsUpdate = true
}

new BroadcastState<string>({id: `lidar_dotsPerAxis`}).onChange(value => {
  projector.dotsPerAxis = Math.round(Number(value.replaceAll('"', '')))
  dotMesh.count = projector.dotsPerAxis ** 2
  geometry.setAttribute('a_instancePosition', projector.positionsAttribute)
  geometry.setAttribute('a_instanceBrightness', projector.brightnessAttribute)
})
new BroadcastState<string>({id: `lidar_aspect`}).onChange(value => {
  projector.projector.aspect = Number(value.replaceAll('"', ''))
  projector.projector.updateProjectionMatrix()
  projector.needsUpdate = true
})

const material = new SpriteNodeMaterial({blending: AdditiveBlending, depthWrite: false})
material.positionNode = attribute('a_instancePosition')
material.colorNode = attribute('a_instanceBrightness').pow(3).mul(2).toVec3().mul(color(/*'#ff1144'*/'#ff3355'))
new BroadcastState<string>({id: 'lidar_dotColor'}).onChange(value => {
  material.colorNode = attribute('a_instanceBrightness').pow(3).mul(2).toVec3().mul(color(value))
  material.needsUpdate = true
})
let geometry = new CircleGeometry(dotSize, 7)
geometry.setAttribute('a_instancePosition', projector.positionsAttribute)
geometry.setAttribute('a_instanceBrightness', projector.brightnessAttribute)
new BroadcastState<string>({id: 'lidar_dotSize'}).onChange(value => {
  const newDotSize = Number(value.replaceAll('"', ''))
  geometry = new CircleGeometry(newDotSize, 7)
  geometry.setAttribute('a_instancePosition', projector.positionsAttribute)
  geometry.setAttribute('a_instanceBrightness', projector.brightnessAttribute)
  dotMesh.geometry = geometry
})
const dotMesh = new InstancedMesh(geometry, material, projector.dotsPerAxis ** 2)
scene.add(dotMesh)

const scenePass = pass(scene, camera)
scenePass.setMRT(mrt({output}))
const outputPass = scenePass.getTextureNode()
const bloomPass = bloom(outputPass, .7, .1, .03)
;(['strength', 'radius', 'threshold'] as const).forEach(property => {
  new BroadcastState<string>({id: `glow_${property}`}).onChange(value => bloomPass[property].value = Number(value.replaceAll('"', '')))
})
const glitchPass = glitch(outputPass.add(bloomPass))
;(['burstInterval', 'burstDuration', 'burstRandomness', 'wobbleBase', 'wobbleBurst', 'noiseBase', 'noiseBurst', 'blocksABase', 'blocksABurst', 'blocksBBase', 'blocksBBurst'] as const).forEach(property => {
  new BroadcastState<string>({id: `glitch_${property}`}).onChange(value =>
    glitchPass[property].value = Number(value.replaceAll('"', ''))
  )
})
const postProcessing = new PostProcessing(renderer)

function effectsChain(pass: PassNode, effects: { glow: boolean, glitch: boolean }) {
  if (effects.glow) {
    bloomPass.inputNode = pass
    pass = pass.add(bloomPass)
  }
  if (effects.glitch) {
    glitchPass.inputNode = pass
    pass = glitchPass
  }
  return pass
}

const effectEnabled = {
  glow: true,
  glitch: true,
}
postProcessing.outputNode = effectsChain(outputPass, effectEnabled)
;(['glow', 'glitch'] as const).forEach(effect => {
  new BroadcastState<string>({id: `${effect}_enabled`}).onChange(value => {
    effectEnabled[effect] = value === 'true'
    postProcessing.outputNode = effectsChain(outputPass, effectEnabled)
    postProcessing.needsUpdate = true
  })
})

let animationTrigger = 0, rippleDuration = 800, rippleStrength = 1

const beatStabilizer = makeBeatStabilizer(confidence => {
  animationTrigger = performance.now()
  rippleStrength = confidence
})

new BroadcastState<string>({id: 'sound_selected_input'}).onChange(value => {
  getAudioFromDevice(JSON.parse(value))
})
getAudioFromDevice().then(splitter => initTransientDetector(splitter, beatStabilizer))

let frameCounterTime = performance.now()
let frameCounter = 0
let lastTime = performance.now()
const minDisplaceStepTime = (1 / 30) * 1000

const fpsState = new BroadcastState({id: 'fps', value: 0})

function render(time: number) {
  frameCounter++
  const mathjsScope = {time}
  for (let i = 0; i < localGeometriesAddedFromRemote.length; i++) {
    const geometry = localGeometriesAddedFromRemote[i]
    const mesh = projector.scene.children.find(object => object.geometry === geometry) as Mesh
    mesh.rotation.set(0, 0, 0)
    mesh.position.set(objectsMeta[i].x, objectsMeta[i].y, objectsMeta[i].z)
    if (!rotationExpressions[i] && !positionExpressions[i]) continue
    if (rotationExpressions[i]) {
      const result = rotationExpressions[i].evaluate(mathjsScope)
      if (result instanceof Mathjs.DenseMatrix) mesh.rotation.set(...result._data)
      else if (typeof result === 'number') mesh.rotation.set(0, result, 0)
      projector.needsUpdate = true
    }
    if (positionExpressions[i]) {
      const result = positionExpressions[i].evaluate(mathjsScope)
      if (result instanceof Mathjs.DenseMatrix) {
        mesh.position.x += result._data[0]
        mesh.position.y += result._data[1]
        mesh.position.z += result._data[2]
      }
      projector.needsUpdate = true
    }
  }
  if (projector.needsUpdate) projector.project()
  if (minDisplaceStepTime <= (performance.now() - lastTime)) {
    lastTime = performance.now()
    recalculateGlitch(projector.dotsPerAxis)
    recalculateRipple(projector.dotsPerAxis, ((performance.now() - animationTrigger) / rippleDuration) ** 1.2, rippleStrength)
    projector.displace(simpleNoise, glitchDisplacement, ripple)
  }
  renderer.render(scene, camera)
  postProcessing.render()
  document.querySelector('.loading')?.remove()
  if (time >= frameCounterTime + 1000) {
    fpsState.value = (frameCounter * 1000) / (time - frameCounterTime)
    frameCounterTime = time
    frameCounter = 0
  }
  // fpsStats.update()
  // msStats.update()
  // mbStats.update()
}

window.addEventListener('resize', onWindowResize)

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onWindowResize()
