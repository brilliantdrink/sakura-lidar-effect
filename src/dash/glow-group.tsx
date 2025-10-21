import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card'
import {Checkbox} from '~/components/ui/checkbox'
import {Label} from '~/components/ui/label'
import {Grid} from '~/components/ui/grid'
import {
  NumberField, NumberFieldDecrementTrigger,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput
} from '~/components/ui/number-field'
import {Separator} from '~/components/ui/separator'
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '~/components/ui/accordion'
import {cn} from '~/lib/utils'
import {SliderMono} from '~/dash/slider-mono'
import {SignalBank, signalsFromBank, sliderPropsFromBankValue} from '~/dash/broadcasted-signals'

const glowValues: SignalBank = {
  enabled: {name: 'Enabled', defaultValue: true},
  strength: {name: 'Strength', max: 12, defaultValue: .7, step: .01},
  radius: {name: 'Radius', max: 1, defaultValue: .1, step: .01},
  threshold: {name: 'Threshold', max: 1, defaultValue: 0, step: .01},
}

export function GlowGroup() {
  const signals = signalsFromBank('glow', glowValues)
  const sliderProps = (key: keyof typeof glowValues) => sliderPropsFromBankValue(key, glowValues, signals)

  return (
    <Card class={'w-full'}>
      <CardHeader>
        <CardTitle>Glow Effect</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-center space-x-2">
          <Checkbox id="bloom" checked={signals.enabled.getter()} onChange={signals.enabled.setter} />
          <Label for="bloom-input">{glowValues.enabled.name}</Label>
        </div>
        <SliderMono {...sliderProps('strength')} />
        <SliderMono {...sliderProps('radius')} />
        <SliderMono {...sliderProps('threshold')} />
      </CardContent>
    </Card>
  )
}
