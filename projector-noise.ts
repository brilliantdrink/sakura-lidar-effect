const noise = .01

/* === NOISE === */
export function simpleNoise(matrixX: number, matrixY: number, index: number, positionsArray: Float32Array) {
  positionsArray[index] += Math.random() * noise
  positionsArray[index + 1] += Math.random() * noise
  positionsArray[index + 2] += Math.random() * noise
}

/* === GLITCH === */
function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function randomBinaryWeighted(weight: number) {
  const random = Math.random()
  const weightClamped = clamp(0, weight, 1)
  return random < weightClamped
}

const offsetLines: boolean[] = []

export function recalculateGlitch(length: number) {
  offsetLines.length = length
  for (let y = 0; y < offsetLines.length; y++) {
    let offsetChance = (offsetLines[y] ?? false)
      ? (offsetLines[y + 1] ?? false) ? .9 : .7
      : (offsetLines[y + 1] ?? false) ? .3 : .001
    offsetLines[y] = randomBinaryWeighted(offsetChance)
  }
}

export function glitchDisplacement(matrixX: number, matrixY: number, index: number, positionsArray: Float32Array) {
  if (!offsetLines[matrixY]) return
  positionsArray[index] *= .95 - (Math.random() * .1)
  positionsArray[index + 1] += .03
  positionsArray[index + 2] *= .95 - (Math.random() * .1)
}

/* === RIPPLE === */
function smootherstep(value: number) {
  value = clamp(0, value, 1);
  return value ** 3 * (value * (6 * value - 15) + 10)
}

/** @description Returns 1 when a equals b and 1..0 when it doesn't up to ±delta, clamped and `smootherstep`ed */
function compare(a: number, b: number, delta: number) {
  return smootherstep((Math.abs(b - a) / delta) * -1 + 1)
}

let rippleLength = 0
let rippleAnimationPosition = 1
let rippleStrength = 1

export function recalculateRipple(length: number, animationPosition: number, strength: number = 1) {
  rippleLength = length
  rippleAnimationPosition = clamp(0, animationPosition, 1)
  rippleStrength = strength
}

export function ripple(matrixX: number, matrixY: number, positionsIndex: number, positionsArray: Float32Array, brightnessIndex: number, brightnessArray: Float32Array) {
  const animationPosition = rippleAnimationPosition
  const length = Math.sqrt((matrixX - rippleLength / 2) ** 2 + (matrixY - rippleLength / 2) ** 2)
  const normalizedLength = length / rippleLength
  let offset = compare(normalizedLength, animationPosition, .1) * rippleStrength
  positionsArray[positionsIndex] *= 1 + offset * .1
  positionsArray[positionsIndex + 1] *= 1 + offset * .1
  positionsArray[positionsIndex + 2] *= 1 + offset * .1
  if (brightnessArray[brightnessIndex] !== 0) brightnessArray[brightnessIndex] += offset * .4
}
