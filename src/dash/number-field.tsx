import {Accessor, Setter, Show} from 'solid-js'
import {
  NumberField as NumberFieldWrapper, NumberFieldDecrementTrigger, NumberFieldDescription,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput
} from '~/components/ui/number-field'
import {Label} from '~/components/ui/label'
import {ResetButton} from '~/dash/reset-button'

export interface NumberFieldProps {
  defaultValue: number
  value: Accessor<number>
  setValue: Setter<number>
  label: string
  description?: string
  minValue?: number
  maxValue?: number
  step?: number
}

export default function NumberField(props: NumberFieldProps) {
  return (
    <NumberFieldWrapper class="grid grid-cols-[1fr_auto] grid-rows-[min-content_auto] items-center gap-2"
                        defaultValue={props.defaultValue}
                        minValue={props.minValue} maxValue={props.maxValue} step={props.step}
                        value={props.value()} onChange={value => props.setValue(Number(value))}>
      <Label>{props.label}</Label>
      <ResetButton value={props.value} setValue={props.setValue} defaultValue={props.defaultValue} />
      <NumberFieldGroup class={'col-span-full self-start'}>
        <NumberFieldInput />
        <NumberFieldIncrementTrigger />
        <NumberFieldDecrementTrigger />
      </NumberFieldGroup>
      <Show when={props.description}>
        <NumberFieldDescription class={'text-xs col-span-full self-start'}>
          {props.description}
        </NumberFieldDescription>
      </Show>
    </NumberFieldWrapper>
  )
}
