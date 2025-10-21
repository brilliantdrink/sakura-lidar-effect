export function makeBeatStabilizer(callback: (confidence: number) => void) {
  const gracePeriod = .03 // 3% of current beat period
  const beatTimes: DOMHighResTimeStamp[] = []
  const BPMs: (number | null)[] = []
  let nextExpectedBeatPeriod: number | null = null
  let confidence = 1
  let beatGeneratorTimeout = -1
  return ({bpm, worldTime}: { bpm: number, worldTime: DOMHighResTimeStamp }) => {
    const currentBeatPeriod = worldTime - (beatTimes.at(-1) ?? worldTime)
    beatTimes.push(worldTime)
    BPMs.push(bpm)
    while (beatTimes.length > 6) beatTimes.shift()
    while (BPMs.length > 6) BPMs.shift()

    // early beat
    if (currentBeatPeriod !== 0 && nextExpectedBeatPeriod !== null && !isNaN(nextExpectedBeatPeriod)) {
      if (nextExpectedBeatPeriod > currentBeatPeriod && (nextExpectedBeatPeriod - currentBeatPeriod) > nextExpectedBeatPeriod * gracePeriod) {
        nextExpectedBeatPeriod = Math.max(0, nextExpectedBeatPeriod - currentBeatPeriod)
        confidence -= .8
        callback(confidence)
        return
      }
    }

    clearTimeout(beatGeneratorTimeout)

    let cleanBPMs = BPMs.filter((v): v is number => v !== null && v > 40 && v < 220)
    cleanBPMs.sort()
    let sloppyMedian = (cleanBPMs.length / 2)
    for (let i = cleanBPMs.length - 1; i >= 0; i--) {
      // if extra beat -> half the bpm (of corrupted) is about our guesstimated current bpm
      const isExtraBeat = equalsAbout(cleanBPMs[i] / 2, sloppyMedian, .1)
      if (isExtraBeat) {
        cleanBPMs.splice(i, 1)
        continue
      }
      // if missing beat -> double the bpm (of corrupted) is about our guesstimated current bpm
      const isMissingBeat = equalsAbout(cleanBPMs[i] * 2, sloppyMedian, .1)
      if (isMissingBeat) {
        cleanBPMs.splice(i, 1, cleanBPMs[i] * 2, cleanBPMs[i] * 2)
        continue
      }
    }

    cleanBPMs.sort()
    /*sloppyMedian = (cleanBPMs.length / 2)
    // clean up remaining outliers
    while (cleanBPMs[0] < sloppyMedian * .1) {}*/

    const currentBPM = Math.round(cleanBPMs.reduce((a, b) => a + b, 0) / cleanBPMs.length)
    // console.log(currentBPM)
    nextExpectedBeatPeriod = 60 / currentBPM

    // console.log(nextExpectedBeatPeriod)

    function scheduleBeat() {
      if (nextExpectedBeatPeriod === null || isNaN(nextExpectedBeatPeriod)) return
      beatGeneratorTimeout = setTimeout(() => {
        // console.log(confidence)
        confidence *= .7
        if (confidence <= 0.1) return
        callback(confidence)
        scheduleBeat()
      }, nextExpectedBeatPeriod * 1000 * (1 + gracePeriod)) as unknown as number
    }

    scheduleBeat()

    callback(confidence = 1)
  }
}

function equalsAbout(value: number, truth: number, accuracy: number) {
  return Math.abs(value - truth) < truth * accuracy
}
