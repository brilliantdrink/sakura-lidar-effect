import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Intersection, Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3, WebGLRenderer
} from 'three'

function map(current: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
  return ((current - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

function averagedValue(accumulator: number | null, value: number, weight = 1) {
  if (!accumulator) return value
  return (accumulator * weight + value) / (1 + weight)
}

let f = 0

export class Projector {
  scene: Scene
  projector: PerspectiveCamera
  renderer: WebGLRenderer
  lookAt: Vector3

  raycaster: Raycaster
  ray: Vector2
  _dotsPerAxis: number
  avgMinDistance: number | null = null
  avgMaxDistance: number | null = null
  // @ts-ignore
  plainPositionsArray: Float32Array
  // @ts-ignore
  positionsArray: Float32Array
  // @ts-ignore
  positionsAttribute: InstancedBufferAttribute
  // @ts-ignore
  plainBrightnessArray: Float32Array
  // @ts-ignore
  brightnessArray: Float32Array
  // @ts-ignore
  brightnessAttribute: InstancedBufferAttribute

  needsUpdate: boolean = false

  constructor(position: Vector3, lookAt: Vector3, dotsPerAxis: number) {
    this.scene = new Scene()
    this.projector = new PerspectiveCamera(90, .6)
    this.projector.position.set(position.x, position.y, position.z)
    this.projector.lookAt(lookAt)
    this.lookAt = lookAt
    this.renderer = new WebGLRenderer({antialias: true})

    this.raycaster = new Raycaster()
    this.ray = new Vector2()
    this._dotsPerAxis = dotsPerAxis

    this.resetAttrArrays()
  }

  resetAttrArrays() {
    this.plainPositionsArray = new Float32Array(this.dotsPerAxis ** 2 * 3)
    this.positionsArray = new Float32Array(this.dotsPerAxis ** 2 * 3)
    this.positionsAttribute = new InstancedBufferAttribute(this.positionsArray, 3)
    this.positionsAttribute.setUsage(DynamicDrawUsage)
    this.plainBrightnessArray = new Float32Array(this.dotsPerAxis ** 2)
    this.brightnessArray = new Float32Array(this.dotsPerAxis ** 2)
    this.brightnessAttribute = new InstancedBufferAttribute(this.brightnessArray, 1)
    this.brightnessAttribute.setUsage(DynamicDrawUsage)
  }

  set dotsPerAxis(value: number) {
    this._dotsPerAxis = Math.max(1, value)
    this.resetAttrArrays()
    this.avgMinDistance = 0
    this.avgMaxDistance = 0
    this.needsUpdate = true
  }

  get dotsPerAxis() {
    return this._dotsPerAxis
  }

  project() {
    this.needsUpdate = false
    this.renderer.render(this.scene, this.projector)
    const distances = []
    for (let y = this.dotsPerAxis; y >= 0; y--) {
      for (let x = 0; x < this.dotsPerAxis; x++) {
        this.ray.x = map(x, 0, this.dotsPerAxis - 1, -1, 1)
        this.ray.y = map(y, 0, this.dotsPerAxis - 1, -1, 1)
        this.raycaster.setFromCamera(this.ray, this.projector)
        const intersects = this.raycaster.intersectObjects(
          this.scene.children.filter(child =>
            child instanceof Mesh &&
            // @ts-ignore
            child.hide !== true
          )
        )
        const brightnessIndex = (x * this.dotsPerAxis + y)
        const positionsIndex = brightnessIndex * 3
        const intersect = intersects[0] as Intersection | undefined
        distances[brightnessIndex] = intersect?.distance
        this.brightnessArray[brightnessIndex] = this.plainBrightnessArray[brightnessIndex] = !!intersect ? 1 : 0
        if (intersect) {
          this.positionsArray[positionsIndex] = this.plainPositionsArray[positionsIndex] = intersect.point.x
          this.positionsArray[positionsIndex + 1] = this.plainPositionsArray[positionsIndex + 1] = intersect.point.y
          this.positionsArray[positionsIndex + 2] = this.plainPositionsArray[positionsIndex + 2] = intersect.point.z
        }
      }
    }

    let minDistance = 0, maxDistance = 0, weight = 2
    if (distances.some(v => v !== undefined)) {
      this.avgMaxDistance = maxDistance = averagedValue(
        this.avgMaxDistance,
        Math.max(...distances.filter(num => num !== undefined)),
        weight
      )
      this.avgMinDistance = minDistance = averagedValue(
        this.avgMinDistance,
        Math.min(...distances.filter(num => num !== undefined)),
        weight
      )
    }

    distances.forEach((distance, index) => {
      if (!distance) return
      this.brightnessArray[index] = this.plainBrightnessArray[index] = map(distance, minDistance, maxDistance, 1, 0)
    })

    this.positionsAttribute.needsUpdate = true
    this.brightnessAttribute.needsUpdate = true
  }

  displace(...displacements: (((
    matrixX: number,
    matrixY: number,
    positionsIndex: number,
    positionsArray: typeof this.positionsArray,
    brightnessIndex: number,
    brightnessArray: typeof this.brightnessArray,
  ) => void) & this)[]) {
    for (let x = 0; x < this.dotsPerAxis; x++) {
      for (let y = 0; y < this.dotsPerAxis; y++) {
        const brightnessIndex = (x * this.dotsPerAxis + y)
        const positionsIndex = brightnessIndex * 3
        this.positionsArray[positionsIndex] = this.plainPositionsArray[positionsIndex]
        this.positionsArray[positionsIndex + 1] = this.plainPositionsArray[positionsIndex + 1]
        this.positionsArray[positionsIndex + 2] = this.plainPositionsArray[positionsIndex + 2]
        this.brightnessArray[brightnessIndex] = this.plainBrightnessArray[brightnessIndex]
        for (const displacement of displacements) {
          displacement.call(this, x, y, positionsIndex, this.positionsArray, brightnessIndex, this.brightnessArray)
        }
      }
    }

    this.positionsAttribute.needsUpdate = true
    this.brightnessAttribute.needsUpdate = true
  }
}
