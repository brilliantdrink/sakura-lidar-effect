import {Accessor, createEffect, createSignal, onMount} from 'solid-js'
import {
  BufferGeometry, DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera, RectAreaLight,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three'
import {createElementSize} from '@solid-primitives/resize-observer'
import {EffectComposer, RenderPass, SSAOPass} from 'three-stdlib'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'

export default function Three(props: { class?: string, geometry: Accessor<BufferGeometry> }) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>()
  const [scene] = createSignal(new Scene())
  const [camera] = createSignal(new PerspectiveCamera())
  const [renderer, setRenderer] = createSignal<WebGLRenderer>(null!)
  const [composer, setComposer] = createSignal<EffectComposer>(null!)
  const [ssaoPass, setSsaoPass] = createSignal<SSAOPass>(null!)

  onMount(() => {
    const renderer = new WebGLRenderer({canvas: canvas(), antialias: true})
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    camera().setFocalLength(70)
    camera().position.set(0, 0, 22)
    camera().lookAt(new Vector3(0, 0, 0))
    setRenderer(renderer)
    scene().add(new HemisphereLight('white', 'black', .5))
    const light = new DirectionalLight('white', 1.3)
    light.castShadow = true
    light.position.set(0, 12, 1)
    light.lookAt(new Vector3(0, 0, 0))
    scene().add(light)
    const composer = new EffectComposer(renderer)
    setComposer(composer)

    const renderPass = new RenderPass(scene(), camera())
    composer.addPass(renderPass)
    const ssaoPass = new SSAOPass(scene(), camera(), size.width ?? 0, size.height ?? 0)
    ssaoPass.kernelRadius = 8
    ssaoPass.minDistance = .0001
    ssaoPass.maxDistance = .25
    setSsaoPass(ssaoPass)
    composer.addPass(ssaoPass)
    const outputPass = new OutputPass()
    composer.addPass(outputPass)
  })

  createEffect(() => {
    for (const child of scene().children) {
      if ('isMesh' in child && child.isMesh) scene().remove(child)
    }
    const mesh = new Mesh(props.geometry().clone(), new MeshStandardMaterial({color: '#666', roughness: .5}))
    mesh.geometry.computeBoundingSphere()
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene().add(mesh)
    // renderer().render(scene(), camera())
    const boundingRadius = mesh.geometry.boundingSphere?.radius
    if (!boundingRadius) return
    mesh.scale.setScalar(5 / boundingRadius)
    composer().render()
  })

  const size = createElementSize(canvas)
  createEffect(() => {
    if (size.width && size.height) {
      renderer().setSize(size.width, size.height)
      composer().setSize(size.width, size.height)
      ssaoPass().setSize(size.width, size.height)
      composer().render()
    }
  })

  return <>
    <canvas ref={setCanvas} class={props.class} />
  </>
}
