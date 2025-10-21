import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card'
import {createEffect, createMemo, createSignal, onMount} from 'solid-js'
import {Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '~/components/ui/select'
import BroadcastState from '~/lib/broadcast-state'
import {createBroadcastedPersistedSignal} from '~/dash/broadcasted-signals'

const defaultDevice = {deviceId: 'null', label: 'None'}

export function SoundGroup() {
  const [devices, setDevices] = createSignal<MediaDeviceInfo[]>([])
  const [devicesLoaded, setDevicesLoaded] = createSignal<boolean>(false)
  const [selectedDevice, _setSelectedDevice] = createBroadcastedPersistedSignal<{
    deviceId: string,
    label: string
  } | null>('sound_selected_input', defaultDevice, {
    stringify: device => JSON.stringify(device?.deviceId),
    parse: value => {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          if (!devicesLoaded()) return
          clearInterval(interval)
          if (value === 'undefined') return
          const deviceId = JSON.parse(value)
          resolve(devices().find(device => deviceId === device.deviceId) ?? defaultDevice)
        }, 50)
      })
    }
  })
  onMount(() => {
    const devicesState = new BroadcastState<string>({id: `audio_sources`})
    devicesState.onChange(devicesState => {
      setDevices(JSON.parse(devicesState))
      setDevicesLoaded(true)
    })
  })

  function setSelectedDevice(value: {
    deviceId: string,
    label: string
  } | null) {
    if (devicesLoaded()) {
      _setSelectedDevice(value)
    }
  }

  return (
    <Card class={'w-full'}>
      <CardHeader>
        <CardTitle>Sound Input</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Select<{ deviceId: string, label: string }>
          disabled={!devicesLoaded()}
          value={selectedDevice()}
          onChange={setSelectedDevice}
          options={[defaultDevice].concat(devices())}
          optionValue="deviceId"
          optionTextValue="label"
          placeholder="Select an input"
          itemComponent={(props) =>
            <SelectItem item={props.item}>{props.item.textValue}</SelectItem>
          }
          class={'flex flex-col gap-2'}
        >
          <SelectLabel>Audio input</SelectLabel>
          <SelectTrigger aria-label="Fruit">
            <SelectValue<MediaDeviceInfo | null>>{(state) =>
              state.selectedOption()?.label ?? 'Select an input'
            }</SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </CardContent>
    </Card>
  )
}
