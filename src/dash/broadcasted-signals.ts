import {Accessor, createMemo, createSignal, onMount, Setter} from 'solid-js'
import BroadcastState from '~/lib/broadcast-state'

export type SignalBank = Record<string, {
  name: string,
  description?: string,
  min?: number,
  max?: number,
  step?: number,
  defaultValue: any
}>

export function signalsFromBank<SB extends SignalBank>(bankName: string, bank: SB) {
  return Object.fromEntries(
    Object.entries(bank)
      .map(([name, value]) => {
        const [getter, setter] = createBroadcastedPersistedSignal(bankName + '_' + name, value.defaultValue)
        return [name, {getter, setter}]
      })
  ) as {
    [K in keyof SB]: {
      getter: () => SB[K]['defaultValue'],
      setter: Setter<number>
    }
  }
}

/** @description Does not send values */
export function createBroadcastedPersistedSignal<T>(key: string, initialValue: T, serializer?: {
  stringify: (value: T) => string | Promise<string>
  parse: (value: string) => T | Promise<T>
}):
  [Accessor<T | undefined>, (newValue: T | undefined) => void] {
  serializer ??= JSON
  const [value, setValue] = createSignal<T | undefined>(undefined)
  const broadcastState = createMemo(() => new BroadcastState<string>({id: key}))

  onMount(async () => {
    const initialStorageValue = localStorage.getItem(key)
    const firstValue = initialStorageValue ? await serializer.parse(initialStorageValue) : initialValue
    // @ts-ignore
    setValue(firstValue)
    const serialized = await serializer.stringify(firstValue)
    broadcastState().value = serialized
    localStorage.setItem(key, serialized)
  })

  const setAndStoreValue = (newValue: T | undefined) => {
    // @ts-ignore
    setValue(newValue as T)
    if (newValue === undefined) {
      localStorage.removeItem(key)
    } else {
      Promise.resolve(serializer.stringify(newValue)).then(serialized => {
        broadcastState().value = serialized
        localStorage.setItem(key, serialized)
      })
    }
  };

  return [value, setAndStoreValue];
}

export function sliderPropsFromBankValue<SB extends SignalBank>(key: keyof SB, bank: SB, signals: ReturnType<typeof signalsFromBank<SB>>) {
  return {
    minValue: bank[key].min ?? 0,
    maxValue: bank[key].max ?? 1,
    defaultValue: bank[key].defaultValue,
    name: bank[key].name,
    step: bank[key].step,
    value: signals[key].getter,
    setValue: signals[key].setter,
  }
}
