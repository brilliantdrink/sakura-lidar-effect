import {Accessor, Setter} from 'solid-js'
import {HiOutlineArrowUturnLeft} from 'solid-icons/hi'

import {Button} from '~/components/ui/button'
import {cn} from '~/lib/utils'

interface ResetButtonProps<T> {
  value: Accessor<Exclude<T, Function>>
  setValue: Setter<T>
  defaultValue: Exclude<T, Function>
  class?: string
}

export function ResetButton<T>(props: ResetButtonProps<T>) {
  return (
    <Button variant={'outline'} size={'icon'} class={cn(props.class)}
            disabled={props.value() === props.defaultValue}
            on:click={(e) => {
              e.preventDefault()
              e.stopImmediatePropagation()
              e.stopPropagation()
              props.setValue(props.defaultValue)
            }}>
      <HiOutlineArrowUturnLeft class={'!size-3.5 [&_path]:stroke-[2.5]'} />
    </Button>
  )
}
