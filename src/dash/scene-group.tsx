import {createMemo, createSignal, Index, onMount, Show, For} from 'solid-js'
import {HiOutlineChevronDown, HiOutlineInboxArrowDown, HiOutlinePlus, HiOutlineTrash} from 'solid-icons/hi'
import {createDropzone, createFileUploader, UploadFile} from '@solid-primitives/upload'
import {ColladaLoader, FBXLoader, GLTFLoader, OBJLoader, PLYLoader, STLLoader} from 'three-stdlib'
import {BufferGeometry, Group, Mesh, Object3D, Scene} from 'three'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import Three from '~/components/Three'
import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card'
import {Grid} from '~/components/ui/grid'
import {Button} from '~/components/ui/button'
import NumberField from '~/dash/number-field'
import {createBroadcastedPersistedSignal, SignalBank, signalsFromBank} from '~/dash/broadcasted-signals'
import {Flex} from '~/components/ui/flex'
import {Switch, SwitchControl, SwitchThumb} from '~/components/ui/switch'
import {Popover, PopoverContent, PopoverTrigger} from '~/components/ui/popover'
import {decodeGeometryData} from '~/lib/decode-geometry-data'
import {Label} from '~/components/ui/label'
import {NumberField as NumberFieldWrapper, NumberFieldGroup, NumberFieldInput} from '~/components/ui/number-field'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '~/components/ui/collapsible'
import {TextField, TextFieldLabel, TextFieldInput} from '~/components/ui/text-field'

import slay from '~/slay.svg'
import {compress} from '~/lib/compress'
import 'core-js/proposals/array-buffer-base64'

const sceneValues: SignalBank = {
  posX: {name: 'Position X', defaultValue: 0, description: 'Left / Right'},
  posY: {name: 'Position Y', defaultValue: 0, description: 'Up / Down'},
  posZ: {name: 'Position Z', defaultValue: 14, description: 'Forward / Backward'},
}

function extractGeometry(object: Object3D | Group | Scene | Mesh): BufferGeometry | null {
  if (object instanceof Group || object instanceof Scene) {
    const childGeometries = object.children.map(extractGeometry).filter(v => v !== null)
    if (childGeometries.length === 0) return null
    return BufferGeometryUtils.mergeGeometries(childGeometries)
  } else if (object instanceof Mesh) {
    return object.geometry
  } else return null
}

const loaders = {
  '.obj': OBJLoader,
  '.stl': STLLoader,
  '.fbx': FBXLoader,
  '.ply': PLYLoader,
  '.dae': ColladaLoader,
  '.gltf': GLTFLoader,
  '.glb': GLTFLoader,
}
const fileSuffixes = Array.from(Object.keys(loaders)) as (keyof typeof loaders)[]

type ObjectMeta = {
  x: number,
  y: number,
  z: number,
  scale: number,
  enabled: boolean,
  positionExpression: string,
  rotationExpression: string
}
type ValueOf<V extends Record<any, any>> = V[keyof V]

const defaultObjectMeta = (): ObjectMeta => ({
  x: 0,
  y: 0,
  z: 0,
  scale: 1,
  enabled: true,
  positionExpression: '',
  rotationExpression: ''
})

export function SceneGroup() {
  const signals = signalsFromBank('scene', sceneValues)
  const [objects, setObjects] = createBroadcastedPersistedSignal<BufferGeometry[]>('scene_objects', [], {
    parse: decodeGeometryData,
    stringify: async (geometries) => {
      const orig = JSON.stringify(geometries.map(geometry => ({
        position: Array.from(geometry.getAttribute('position').array),
        normal: Array.from(geometry.getAttribute('normal').array),
      })))
      const compressed = await compress(orig)
      return JSON.stringify({length: compressed.length, buffer: compressed.toBase64()})
    }
  })
  const [objectNames, setObjectNames] = createBroadcastedPersistedSignal<string[]>('scene_object_names', [])
  const [objectMeta, setObjectMeta] = createBroadcastedPersistedSignal<ObjectMeta[]>('scene_object_meta', [])
  const [isDragging, setIsDragging] = createSignal(false)

  function addFiles(files: UploadFile[]) {
    for (const file of files) {
      const suffix = fileSuffixes.find(suffix => file.name.endsWith(suffix))
      if (!suffix) continue // should never happen
      const loader = new loaders[suffix]()
      loader.load(
        file.source,
        data => {
          let geometry: BufferGeometry | null = null
          if (data instanceof BufferGeometry) {
            geometry = data
          } else if (data instanceof Group) {
            geometry = extractGeometry(data)
          } else if ('scene' in data) {
            if (data.scene instanceof Group) {
              geometry = extractGeometry(data.scene)
            } else if (data.scene instanceof Scene) {
              geometry = extractGeometry(data.scene)
            }
          }
          if (geometry == null) return // todo: toast error
          setObjects([...objects() ?? [], geometry])
          setObjectNames([...objectNames() ?? [], file.name])
          setObjectMeta([...objectMeta() ?? [], defaultObjectMeta()])
        },
        () => 0,
        console.error, // todo report
      )
    }
  }

  const {setRef: dropzoneRef} = createDropzone({
    onDrop: async files => {
      setIsDragging(false)
      addFiles(
        files.filter(file => fileSuffixes.some(suffix => file.name.endsWith(suffix)))
      )
    },
    onDragStart: () => {
      setIsDragging(true)
    },
    onDragOver: () => {
      setIsDragging(true)
    },
    onDragLeave: () => {
      setIsDragging(false)
    },
    onDragEnd: () => {
      setIsDragging(false)
    },
  })
  const {files, selectFiles} = createFileUploader({multiple: true, accept: fileSuffixes.join(',')})

  return (
    <Card class={'w-full'}>
      <CardHeader>
        <CardTitle>Scene</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Grid cols={3} class={'gap-x-4 gap-y-1.5'}>
          <p class={'col-span-full text-xs text-muted-foreground'}>Camera</p>
          <NumberField defaultValue={sceneValues.posX.defaultValue} label={sceneValues.posX.name}
                       value={signals.posX.getter} setValue={signals.posX.setter}
                       description={sceneValues.posX.description} />
          <NumberField defaultValue={sceneValues.posY.defaultValue} label={sceneValues.posY.name}
                       value={signals.posY.getter} setValue={signals.posY.setter}
                       description={sceneValues.posY.description} />
          <NumberField defaultValue={sceneValues.posZ.defaultValue} label={sceneValues.posZ.name}
                       value={signals.posZ.getter} setValue={signals.posZ.setter}
                       description={sceneValues.posZ.description} />
        </Grid>
        <p class={'col-span-full text-xs text-muted-foreground'}>Objects</p>
        <Index each={objects()}>{(geometry, index) => {
          const [modalOpen, setModalOpen] = createSignal(false)
          const meta = createMemo(() => objectMeta()?.[index] ?? defaultObjectMeta())
          const [intermediateMeta, setIntermediateMeta] = createSignal<{ [K in keyof ObjectMeta]: string | number | boolean }>(defaultObjectMeta())

          onMount(() => {
            setIntermediateMeta(meta())
          })

          function set<K extends keyof ObjectMeta>(key: K, value: ObjectMeta[K] | string) {
            setIntermediateMeta({...intermediateMeta(), [key]: value})
            if (key === 'x' || key === 'y' || key === 'z' || key === 'scale') {
              const numberValue = Number(value)
              if (isNaN(numberValue)) return
              setObjectMeta(objectMeta()?.toSpliced(index, 1, {...meta(), [key]: numberValue}))
            } else if (key === 'enabled') {
              setObjectMeta(objectMeta()?.toSpliced(index, 1, {...meta(), [key]: value === true || value === 'true'}))
            } else if (key === 'positionExpression' || key === 'rotationExpression') {
              setObjectMeta(objectMeta()?.toSpliced(index, 1, {...meta(), [key]: value}))
            }
          }

          return (
            <Card>
              <CardContent class={'p-2 flex flex-row gap-4 items-start overflow-hidden'}>
                <Three geometry={geometry} class={'!size-24 rounded-md border'} />
                <Collapsible as={Flex} flexDirection={'col'} alignItems={'start'} class={'mt-2 flex-grow gap-4'}>
                  <span class={'text-bold'}>{objectNames()?.[index]}</span>
                  <Flex flexDirection={'row'} justifyContent={'start'} alignItems={'end'} class={'gap-2'}>
                    <For each={['x', 'y', 'z', 'scale'] satisfies (keyof ObjectMeta)[]}>{(key) => {
                      return (
                        <NumberFieldWrapper class="flex flex-col gap-1 items-center text-muted-foreground"
                                            step={.05} value={intermediateMeta()[key] as string}
                                            onChange={newValue => set(key, newValue)}>
                          <Label class={'text-xs'}>{key.toUpperCase()}</Label>
                          <NumberFieldGroup class={'w-10'}>
                            <NumberFieldInput class={'px-1 py-0 text-xs leading-3 h-6 text-center'} />
                          </NumberFieldGroup>
                        </NumberFieldWrapper>
                      )
                    }}</For>
                    <CollapsibleTrigger
                      class="flex w-8 h-6 items-center justify-center rounded-md border cursor-pointer [&[data-expanded]>svg]:rotate-180">
                      <HiOutlineChevronDown class={'transition-transform'} />
                    </CollapsibleTrigger>
                  </Flex>
                  <CollapsibleContent
                    class="w-full flex flex-col gap-4 transition-all animate-accordion-up data-[expanded]:animate-accordion-down">
                    <TextField class="grid w-full max-w-sm items-center gap-1.5"
                               value={meta().positionExpression} onChange={value => set('positionExpression', value)}>
                      <TextFieldLabel for={`position-${index}`}>Position Expression</TextFieldLabel>
                      <TextFieldInput type="text" id={`position-${index}`}
                                      placeholder="e.g. [0, 0, sin(time / 1000)]" />
                    </TextField>
                    <TextField class="grid w-full max-w-sm items-center gap-1.5"
                               value={meta().rotationExpression} onChange={value => set('rotationExpression', value)}>
                      <TextFieldLabel for={`rotation-${index}`}>Rotation Expression</TextFieldLabel>
                      <TextFieldInput type="text" id={`rotation-${index}`} placeholder="e.g. time / 1000" />
                    </TextField>
                  </CollapsibleContent>
                </Collapsible>
                <Flex flexDirection={'col'} alignItems={'end'}
                      class={'mt-2 basis-[fit-content] flex-shrink gap-4 mr-2'}>
                  <Switch class="flex items-center space-x-2" checked={meta().enabled}
                          onChange={isChecked => set('enabled', isChecked)}>
                    <SwitchControl>
                      <SwitchThumb />
                    </SwitchControl>
                  </Switch>
                  <Popover placement={'left'} open={modalOpen()} onOpenChange={setModalOpen}>
                    <PopoverTrigger as={Button<"button">} variant="outline" size={'icon'}>
                      <HiOutlineTrash class={'text-red-500'} />
                    </PopoverTrigger>
                    <PopoverContent class={'p-2 w-auto rounded-2xl'}>
                      <Button variant={'destructive'} onClick={() => {
                        setObjects(objects()?.toSpliced(index, 1))
                        setObjectNames(objectNames()?.toSpliced(index, 1))
                        setObjectMeta(objectMeta()?.toSpliced(index, 1))
                        setModalOpen(false)
                      }}>Remove object</Button>
                    </PopoverContent>
                  </Popover>
                </Flex>
              </CardContent>
            </Card>
          )
        }}</Index>
        <Button variant={'outline'} ref={dropzoneRef} onClick={() => selectFiles(addFiles)}>
          <Show when={!isDragging()}>
            <HiOutlinePlus class={'pointer-events-none'} />
            Add
          </Show>
          <Show when={isDragging()}>
            <HiOutlineInboxArrowDown class="size-7 [&_path]:stroke-2 pointer-events-none" />
            <span class={'text-center text-sm text-muted-foreground pointer-events-none'}>
              Drop it, diva <img src={slay} class={'h-4 inline align-[text-top] opacity-70'} />
            </span>
          </Show>
        </Button>
      </CardContent>
    </Card>
  )
}
