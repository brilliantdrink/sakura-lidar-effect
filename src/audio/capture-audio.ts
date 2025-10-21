import BroadcastState from '~/lib/broadcast-state'

async function getAudioInputDevices() {
  await navigator.mediaDevices.getUserMedia({audio: true})
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'audioinput')
}

async function getAudioInputDevice(id: string) {
  return getAudioInputDevices().then(devices =>
    devices.find(device => id === device.deviceId)
  )
}

const audioSourcesState = new BroadcastState<string>({id: `audio_sources`})
getAudioInputDevices().then(devices => audioSourcesState.value = JSON.stringify(devices))

export const audioContext = new AudioContext()

let stream: MediaStream
let mediaStreamSource: MediaStreamAudioSourceNode
let splitter: ChannelSplitterNode

export async function getAudioFromDevice(id: string) {
  splitter ??= audioContext.createChannelSplitter(2)
  mediaStreamSource?.disconnect()
  stream?.getTracks().forEach(track => track.stop())
  return getAudioInputDevice(id)
    .then(async device => {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: device?.deviceId,
          channelCount: 2,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      })
      mediaStreamSource = audioContext.createMediaStreamSource(stream)
      mediaStreamSource.connect(audioContext.destination)
      mediaStreamSource.connect(splitter)
      return splitter
    })
    .catch(() => splitter)
}
