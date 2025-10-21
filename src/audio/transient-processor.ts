const MAX_INT16 = Math.pow(2, 16) / 2 - 1
const MAX_UINT32 = Math.pow(2, 32) - 1

declare const fileName: string
export default fileName

class TransientProcessor extends AudioWorkletProcessor implements AudioWorkletProcessorImpl {
  threshold: number = 0
  lastPeakDistance: number = MAX_UINT32
  bpm: number = 120
  pos: number = 0
  sensitivity: number
  minThreshold: number
  slidingWindowMax: MaxValue
  sampleRate: number = 41000

  constructor() {
    super()
    this.sensitivity = 0.8
    this.minThreshold = MAX_INT16 * 0.1
    this.slidingWindowMax = new MaxValue(this.sampleRate * 1.5)
  }

  static get parameterDescriptors(): (Partial<AudioParam> & { name: string })[] {
    return [
      {
        name: 'sampleRate',
        defaultValue: 41000,
        minValue: 1,
        maxValue: 384000,
        automationRate: 'k-rate',
      },
    ];
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    this.sampleRate = parameters.sampleRate[0]
    const input = inputs[0]
    const packet = input[0]
    if (!packet) return false
    for (let i = 0; i < packet.length; i++) {
      const sample = packet[i]
      if (this._isPeak(sample)) {
        let ms = Math.round(this.pos / (this.sampleRate / 1000))
        this.port.postMessage({position: ms, bpm: this.bpm})
      }
    }
    return true;
  }

  _isPeak(sample: number): boolean {
    const normalized = Math.floor(Math.abs(sample) * MAX_INT16)
    this.threshold = Math.max(
      this.slidingWindowMax.add(normalized) * this.sensitivity,
      this.minThreshold
    )

    const overThreshold = normalized >= this.threshold
    const enoughTimeSinceLastPeak = this.lastPeakDistance > this.sampleRate * .4

    if (overThreshold && enoughTimeSinceLastPeak) {
      this.bpm = Math.round(60 / (this.lastPeakDistance / this.sampleRate))
      this.lastPeakDistance = 0
      return true
    }

    this.pos++
    this.lastPeakDistance++
    if (this.lastPeakDistance > MAX_UINT32) this.lastPeakDistance = MAX_UINT32

    return false
  }
}

registerProcessor("transient-processor", TransientProcessor);

// adopted from https://github.com/chrvadala/sliding-window-max/blob/master/src/SlidingWindowMax.js

class MaxValue {
  values: number[]
  indices: number[]
  index: number
  windowSize: number

  constructor(windowSize: number) {
    this.values = []
    this.indices = []
    this.index = 0
    this.windowSize = windowSize
  }

  add(value: number): number {
    // remove all values that are less than `value`
    // only older values that are equal or greater will be needed
    for (let i = this.values.length - 1; i >= 0; i--) {
      if (this.values[i] > value) continue
      this.values.splice(i, 1)
      this.indices.splice(i, 1)
    }

    // shift out oldest value if it's outside the current window
    if (this.values.length > 0 && this.indices[0] < (this.index - this.windowSize + 1)) {
      this.values.shift()
      this.indices.shift()
    }

    this.values.push(value)
    this.indices.push(this.index)

    this.index++

    // the oldest value will always be the greatest, because lower values are filtered out for each new value
    return this.values[0]
  }
}
