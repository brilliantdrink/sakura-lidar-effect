const MAX_INT16 = Math.pow(2, 16) / 2 - 1;
const MAX_UINT32 = Math.pow(2, 32) - 1;

class TransientProcessor extends AudioWorkletProcessor {
  threshold = 0;
  lastPeakDistance = MAX_UINT32;
  bpm = 120;
  pos = 0;
  sensitivity;
  minThreshold;
  slidingWindowMax;
  sampleRate = 41e3;
  constructor() {
    super();
    this.sensitivity = 0.8;
    this.minThreshold = MAX_INT16 * 0.1;
    this.slidingWindowMax = new MaxValue(this.sampleRate * 1.5);
  }
  static get parameterDescriptors() {
    return [
      {
        name: "sampleRate",
        defaultValue: 41e3,
        minValue: 1,
        maxValue: 384e3,
        automationRate: "k-rate"
      }
    ];
  }
  process(inputs, outputs, parameters) {
    this.sampleRate = parameters.sampleRate[0];
    const input = inputs[0];
    const packet = input[0];
    if (!packet) return false;
    for (let i = 0; i < packet.length; i++) {
      const sample = packet[i];
      if (this._isPeak(sample)) {
        let ms = Math.round(this.pos / (this.sampleRate / 1e3));
        this.port.postMessage({ position: ms, bpm: this.bpm });
      }
    }
    return true;
  }
  _isPeak(sample) {
    const normalized = Math.floor(Math.abs(sample) * MAX_INT16);
    this.threshold = Math.max(
      this.slidingWindowMax.add(normalized) * this.sensitivity,
      this.minThreshold
    );
    const overThreshold = normalized >= this.threshold;
    const enoughTimeSinceLastPeak = this.lastPeakDistance > this.sampleRate * 0.4;
    if (overThreshold && enoughTimeSinceLastPeak) {
      this.bpm = Math.round(60 / (this.lastPeakDistance / this.sampleRate));
      this.lastPeakDistance = 0;
      return true;
    }
    this.pos++;
    this.lastPeakDistance++;
    if (this.lastPeakDistance > MAX_UINT32) this.lastPeakDistance = MAX_UINT32;
    return false;
  }
}
registerProcessor("transient-processor", TransientProcessor);
class MaxValue {
  values;
  indices;
  index;
  windowSize;
  constructor(windowSize) {
    this.values = [];
    this.indices = [];
    this.index = 0;
    this.windowSize = windowSize;
  }
  add(value) {
    for (let i = this.values.length - 1; i >= 0; i--) {
      if (this.values[i] > value) continue;
      this.values.splice(i, 1);
      this.indices.splice(i, 1);
    }
    if (this.values.length > 0 && this.indices[0] < this.index - this.windowSize + 1) {
      this.values.shift();
      this.indices.shift();
    }
    this.values.push(value);
    this.indices.push(this.index);
    this.index++;
    return this.values[0];
  }
}
