import {audioContext} from './capture-audio'
import fileName from './transient-processor' with {type: "file"}

const workletPromise = audioContext.audioWorklet.addModule(fileName);

export async function initTransientDetector(audio: AudioNode, onEdge: (data: {position: number, bpm: number}) => void) {
  const lowpass = audioContext.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(120, 0)
  lowpass.Q.setValueAtTime(2, 0)
  audio.connect(lowpass, 0)
  // lowpass.connect(audioContext.destination)
  await workletPromise;
  const transientProcessor = new AudioWorkletNode(
    audioContext,
    "transient-processor",
    {parameterData: {sampleRate: audioContext.sampleRate}}
  )
  transientProcessor.port.onmessage = event => {
    // todo: add stabilised / probability based actual bpm
    // todo: scheduling based on that to reduce beat variance
    event.data.worldTime = performance.now()
    onEdge(event.data)
    // console.log(event.data)
  }
  // console.log(audioContext.sampleRate)
  lowpass.connect(transientProcessor)
}

