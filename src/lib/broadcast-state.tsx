export default class BroadcastState<T> {
  readonly valueId: string
  protected _value: T | undefined
  protected _bc: BroadcastChannel
  protected _listeners: ((value: T) => void)[]

  constructor(props: {
    id: string,
    value?: T,
    channelName?: string,
  }) {
    this.valueId = props.id
    this._bc = new BroadcastChannel(props.channelName ?? 'states')
    this._listeners = []
    if ('value' in props && props.value) {
      this.value = props.value
    }
    this._bc.addEventListener('message', event => {
      if ('setValue' in event.data && event.data.setValue.id === this.valueId) {
        this._value = event.data.setValue.value
        this._listeners.forEach(callback => {
          if (this.value) callback(this.value)
        })
      }
      if ('getValue' in event.data && event.data.getValue.id === this.valueId) {
        // fixme: this sends out the value multiple times when there are more than two of the same BroadcastState
        this.sendValue()
      }
    })
    if (!('initialValue' in props)) {
      this._bc.postMessage({
        getValue: {
          id: this.valueId,
        }
      })
    }
  }

  onChange(callback: (value: T) => void) {
    this._listeners.push(callback)
    return () => {
      const index = this._listeners.indexOf(callback as (value: T) => void)
      if (index == -1) return false
      delete this._listeners[index]
      return true
    }
  }

  get value(): T | undefined {
    return this._value
  }

  set value(value: T) {
    this._value = value
    this.sendValue()
  }

  protected sendValue() {
    this._bc.postMessage({
      setValue: {
        id: this.valueId,
        value: this._value
      }
    })
  }

  valueOf() {
    return this._value
  }
}
