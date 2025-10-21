import {Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel} from '~/components/ui/slider'
import {ResetButton} from '~/dash/reset-button'
import {Accessor, Setter, splitProps} from 'solid-js'
import {cn} from '~/lib/utils'

interface SliderMonoProps {
  minValue: number
  maxValue: number
  step?: number
  name: string

  value: Accessor<number>
  setValue: Setter<number>
  defaultValue: number

  class?: string
}

export function SliderMono(props: SliderMonoProps) {
  const [valueProps, others] = splitProps(props, ["value", "setValue", "defaultValue"])
  return (
    <Slider {...others} class={cn(others.class, "w-full space-y-3")}
            value={[valueProps.value()]} onChange={value => valueProps.setValue(value[0])}>
      <div class="flex w-full justify-between items-center gap-2">
        <SliderLabel class={'mr-auto'}>{props.name}</SliderLabel>
        <SliderValueLabel />
        <ResetButton {...valueProps} />
      </div>
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </Slider>
  )
}
