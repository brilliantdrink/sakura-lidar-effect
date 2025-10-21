import {
  HalfFloatType,
  NodeBuilder,
  NodeMaterial,
  NodeUpdateType,
  QuadMesh,
  RendererUtils,
  RenderTarget,
  TempNode,
  TextureNode,
  Vector2,
  WebGPURenderer,
} from 'three/webgpu'
import {
  abs,
  dot,
  floor,
  Fn,
  fract,
  max,
  min,
  mod,
  clamp,
  nodeObject,
  passTexture,
  ShaderNodeObject,
  sin,
  smoothstep,
  step,
  uniform,
  uv,
  vec2,
  vec3,
  vec4, texture,
  hash
} from 'three/tsl'
import {JoinNode, Node, NodeFrame, PassNode, UniformNode} from 'three/src/nodes/Nodes.js'
import type {RendererState} from 'three/src/renderers/common/RendererUtils.js'
import type OperatorNode from 'three/src/nodes/math/OperatorNode.js'

const _quadMesh = /*@__PURE__*/ new QuadMesh()
const _size = /*@__PURE__*/ new Vector2()
let _rendererState: RendererState

type NodeType = ShaderNodeObject<PassNode | OperatorNode | TextureNode>

class GlitchNode extends TempNode {
  inputNode: NodeType
  burstInterval: ShaderNodeObject<UniformNode<number>>
  burstDuration: ShaderNodeObject<UniformNode<number>>
  randomSeed: ShaderNodeObject<UniformNode<number>>
  burstRandomness: ShaderNodeObject<UniformNode<number>>
  wobbleBase: ShaderNodeObject<UniformNode<number>>
  wobbleBurst: ShaderNodeObject<UniformNode<number>>
  noiseBase: ShaderNodeObject<UniformNode<number>>
  noiseBurst: ShaderNodeObject<UniformNode<number>>
  blocksABase: ShaderNodeObject<UniformNode<number>>
  blocksABurst: ShaderNodeObject<UniformNode<number>>
  blocksBBase: ShaderNodeObject<UniformNode<number>>
  blocksBBurst: ShaderNodeObject<UniformNode<number>>
  _height: ShaderNodeObject<UniformNode<number>>
  _width: ShaderNodeObject<UniformNode<number>>
  _resolution: ShaderNodeObject<JoinNode>
  _time: ShaderNodeObject<UniformNode<number>>
  _glitchMaterial: NodeMaterial
  _renderTargetInput: RenderTarget
  _renderTargetMask: RenderTarget
  _textureOutput: TextureNode

  static get type() {
    return 'GlitchNode'
  }

  constructor(inputNode: NodeType, burstInterval = 3, burstDuration = 1.5) {
    super('vec4')
    this.inputNode = inputNode
    this.burstInterval = uniform(burstInterval)
    this.burstDuration = uniform(burstDuration)
    this.randomSeed = uniform(Math.round(Math.random() * 1000))
    this.burstRandomness = uniform(1)
    this.wobbleBase = uniform(1)
    this.wobbleBurst = uniform(20)
    this.noiseBase = uniform(0)
    this.noiseBurst = uniform(0.04)
    this.blocksABase = uniform(0.12)
    this.blocksABurst = uniform(0.3)
    this.blocksBBase = uniform(0.12)
    this.blocksBBurst = uniform(0.5)
    this._height = uniform(0.0)
    this._width = uniform(0.0)
    this._resolution = vec2(this._height, this._width)
    this._time = uniform(0.0)
    this._glitchMaterial = null!
    this._renderTargetInput = new RenderTarget(1, 1, {depthBuffer: false, type: HalfFloatType})
    this._renderTargetInput.texture.name = 'GlitchPass.input'
    this._renderTargetMask = new RenderTarget(1, 1, {depthBuffer: false, type: HalfFloatType})
    this._renderTargetMask.texture.name = 'GlitchPass.mask'
    this._textureOutput = passTexture(
      // @ts-ignore TS2345: Argument of type this is not assignable to parameter of type PassNode
      this,
      this._renderTargetMask.texture
    )
    this.updateBeforeType = NodeUpdateType.FRAME
  }

  getTextureNode(): TextureNode {
    return this._textureOutput
  }

  setSize(width: number, height: number) {
    let resx = Math.round(width / 2)
    let resy = Math.round(height / 2)
    this._renderTargetInput.setSize(resx, resy)
    this._renderTargetMask.setSize(resx, resy)
  }

  updateBefore(frame: NodeFrame & { renderer: WebGPURenderer }) {
    const {renderer} = frame
    _rendererState = RendererUtils.resetRendererState(renderer, _rendererState)

    const size = renderer.getDrawingBufferSize(_size)
    this.setSize(size.width, size.height)

    this._height.value = size.height
    this._width.value = size.width
    this._time.value = frame.time
    renderer.setRenderTarget(this._renderTargetInput)
    _quadMesh.material = new NodeMaterial()
    ;(_quadMesh.material as NodeMaterial).fragmentNode = this.inputNode
    _quadMesh.material.needsUpdate = true
    _quadMesh.render(renderer)

    renderer.setRenderTarget(this._renderTargetMask)
    _quadMesh.material = this._glitchMaterial
    _quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, _rendererState)
  }

  setup(builder: NodeBuilder): TextureNode {
    const random = (c: ShaderNodeObject<Node>) =>
      fract(sin(dot(c.xy, vec2(12.9898, 78.233))).mul(43758.5453))

    const mod289 = (x: ShaderNodeObject<Node>) =>
      x.sub(floor(x.mul(1.0 / 289.0)).mul(289.0))

    const permute = (x: ShaderNodeObject<Node>) =>
      mod289(x.mul(34.0).add(1.0).mul(x))

    const taylorInvSqrt = (r: ShaderNodeObject<Node>) =>
      uniform(1.79284291400159).sub(r.mul(0.85373472095314))

    const snoise3 = Fn(([v]: [ShaderNodeObject<Node>]) => {
      const C = vec2(1.0 / 6.0, 1.0 / 3.0)
      const D = vec4(0.0, 0.5, 1.0, 2.0)

      // First corner
      let i = vec3(floor(v.add(dot(v, C.yyy))))
      const x0 = vec3(v.sub(i).add(dot(i, C.xxx)))

      // Other corners
      const g = vec3(step(x0.yzx, x0.xyz))
      const l = vec3(uniform(1.0).sub(g))
      const i1 = vec3(min(g.xyz, l.zxy))
      const i2 = vec3(max(g.xyz, l.zxy))

      const x1 = vec3(x0.sub(i1).add(C.xxx))
      const x2 = vec3(x0.sub(i2).add(C.yyy)) // 2.0*C.x = 1/3 = C.y
      const x3 = vec3(x0.sub(D.yyy)) // -1.0+3.0*C.x = -0.5 = -D.y

      // Permutations
      i = mod289(i)
      const p = permute(
        permute(
          permute(
            i.z.add(vec4(0.0, i1.z, i2.z, 1.0))
          ).add(i.y).add(vec4(0.0, i1.y, i2.y, 1.0))
        ).add(i.x).add(vec4(0.0, i1.x, i2.x, 1.0))
      )

      // Gradients: 7x7 points over a square, mapped onto an octahedron.
      // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      const n_ = uniform(0.142857142857) // 1.0/7.0
      const ns = vec3(n_.mul(D.wyz).sub(D.xzx))

      const j = vec4(p.sub(floor(p.mul(ns.z).mul(ns.z)).mul(49.0))) //  mod(p,7*7)

      const x_ = vec4(floor(j.mul(ns.z)))
      const y_ = vec4(floor(j.sub(x_.mul(7.0)))) // mod(j,N)

      const x = vec4(x_.mul(ns.x).add(ns.yyyy))
      const y = vec4(y_.mul(ns.x).add(ns.yyyy))
      const h = vec4(uniform(1.0).sub(abs(x)).sub(abs(y)))

      const b0 = vec4(x.xy, y.xy)
      const b1 = vec4(x.zw, y.zw)

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0
      const s0 = vec4(floor(b0).mul(2.0).add(1.0))
      const s1 = vec4(floor(b1).mul(2.0).add(1.0))
      const sh = vec4(step(h, vec4(0.0)).mul(-1.0))

      const a0 = vec4(b0.xzyw.add(s0.xzyw.mul(sh.xxyy)))
      const a1 = vec4(b1.xzyw.add(s1.xzyw.mul(sh.zzww)))

      let p0: ShaderNodeObject<Node> = vec3(a0.xy, h.x)
      let p1: ShaderNodeObject<Node> = vec3(a0.zw, h.y)
      let p2: ShaderNodeObject<Node> = vec3(a1.xy, h.z)
      let p3: ShaderNodeObject<Node> = vec3(a1.zw, h.w)

      //Normalise gradients
      const norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)))
      p0 = p0.mul(norm.x)
      p1 = p0.mul(norm.y)
      p2 = p0.mul(norm.z)
      p3 = p0.mul(norm.w)

      // Mix final noise value
      let m = vec4(max(uniform(0.6).sub(vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3))), 0.0))
      m = m.mul(m)
      return uniform(42.0)
        .mul(dot(m.mul(m), vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))))
    })

    const glitchMask = Fn(() => {
      const inputTexture = this._renderTargetInput.texture
      const randomStrength = hash(this._time.div(this.burstInterval).floor()).mul(this.burstRandomness)
      const strength = smoothstep(
        this.burstInterval.sub(this.burstDuration),
        this.burstInterval,
        this.burstInterval.sub(mod(this._time, this.burstInterval.add(randomStrength)))
      )
      const shake =
        vec2(strength.mul(8.0).add(0.5))
          .mul(vec2(
              random(vec2(this._time))).mul(2.0).sub(1.0),
            random(vec2(this._time).mul(2.0)).mul(2.0).sub(1.0)
          ).div(this._resolution)

      const y = uv().y.mul(this._resolution.y)
      const rgbWave =
        snoise3(vec3(0.0, y.mul(0.01), this._time.mul(400.0)).mul(uniform(2.0).add(strength.mul(32.0))))
          .mul(snoise3(vec3(0.0, y.mul(0.02), this._time.mul(200.0)).mul(uniform(1.0).add(strength.mul(4.0)))))
          .add(step(0.9995, sin(y.mul(0.005).add(this._time.mul(1.6)))).mul(12.0))
          .add(step(0.9999, sin(y.mul(0.005).add(this._time.mul(2.0)))).mul(-18.0))
          .div(this._resolution.x)
      const rgbDiff = uniform(/* changed from 6 to 0, value in between waves */ 0.0)
        .add(
          sin(this._time.mul(500.0).add(uv().y.mul(40.0)))
            .mul(this.wobbleBase.add(strength.mul(this.wobbleBurst)))
        )
        .div(this._resolution.x)
      const rgbUvX = uv().x.add(rgbWave)
      const r = texture(inputTexture, vec2(rgbUvX.add(rgbDiff), uv().y).add(shake)).r
      const g = texture(inputTexture, vec2(rgbUvX, uv().y).add(shake)).g
      const b = texture(inputTexture, vec2(rgbUvX.sub(rgbDiff), uv().y).add(shake)).b

      const whiteNoise = random(uv().add(mod(this._time.mul(.01), 1.0)))
        .pow(2) // gamma adjustment
        .mul(this.noiseBase.add(strength.mul(this.noiseBurst)))

      const bnTime = floor(this._time.mul(20.0)).mul(200.0)
      const noiseX = step(
        // added clamp to make noise = 0 have no distortion and noise = 1 have max distortion
        clamp(snoise3(vec3(0.0, uv().x.mul(3.0), bnTime)).add(1.0).div(2.0)),
        this.blocksABase.add(strength.mul(this.blocksABurst))
      )
      const noiseY = step(
        snoise3(vec3(0.0, uv().y.mul(3.0), bnTime)).add(1.0).div(2.0),
        this.blocksABase.add(strength.mul(this.blocksABurst))
      )
      const bnMask = noiseX.mul(noiseY)
      const bnUvX = uv().x.add(sin(bnTime).mul(0.2)).add(rgbWave)
      const bnR = texture(inputTexture, vec2(bnUvX.add(rgbDiff), uv().y)).r.mul(bnMask)
      const bnG = texture(inputTexture, vec2(bnUvX, uv().y)).g.mul(bnMask)
      const bnB = texture(inputTexture, vec2(bnUvX.sub(rgbDiff), uv().y)).b.mul(bnMask)
      const blockNoise = vec4(bnR, bnG, bnB, 1.0)

      const bnTime2 = floor(this._time.mul(25.0)).mul(300.0)
      const noiseX2 = step(
        snoise3(vec3(0.0, uv().x.mul(2.0), bnTime2)).add(1.0).div(2.0),
        this.blocksBBase.add(strength.mul(this.blocksBBurst))
      )
      const noiseY2 = step(
        snoise3(vec3(0.0, uv().y.mul(8.0), bnTime2)).add(1.0).div(2.0),
        this.blocksBBase.add(strength.mul(this.blocksBBurst))
      )
      const bnMask2 = noiseX2.mul(noiseY2)
      const bnR2 = texture(inputTexture, vec2(bnUvX.add(rgbDiff), uv().y)).r.mul(bnMask2)
      const bnG2 = texture(inputTexture, vec2(bnUvX, uv().y)).g.mul(bnMask2)
      const bnB2 = texture(inputTexture, vec2(bnUvX.sub(rgbDiff), uv().y)).b.mul(bnMask2)
      const blockNoise2 = vec4(bnR2, bnG2, bnB2, 1.0)

      // const waveNoise = sin(uv().y.mul(1200.0)).add(1.0).div(2.0).mul(uniform(0.15).add(strength.mul(0.2)))

      // return noiseX
      return vec4(r, g, b, 1.0)
        .mul(uniform(1.0).sub(bnMask).sub(bnMask2))
        .add(whiteNoise)
        .add(blockNoise).add(blockNoise2)
      // return vec4(r, g, b, 1.0)
    })

    this._glitchMaterial ??= new NodeMaterial()
    this._glitchMaterial.fragmentNode = glitchMask().context(
      // @ts-ignore TS2339: Property getSharedContext does not exist on type NodeBuilder
      builder.getSharedContext()
    )
    this._glitchMaterial.name = 'Glitch_mask'
    this._glitchMaterial.needsUpdate = true

    return this._textureOutput
  }

  dispose() {
    this._renderTargetMask.dispose()
  }
}

export const glitch =
  (...args: ConstructorParameters<typeof GlitchNode>) =>
    nodeObject(new GlitchNode(...args))

export default GlitchNode
