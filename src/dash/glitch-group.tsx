import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card'
import {Checkbox} from '~/components/ui/checkbox'
import {Label} from '~/components/ui/label'
import {Grid} from '~/components/ui/grid'
import NumberField from '~/dash/number-field'
import {Separator} from '~/components/ui/separator'
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '~/components/ui/accordion'
import {cn} from '~/lib/utils'
import {SliderMono} from '~/dash/slider-mono'
import {SignalBank, signalsFromBank, sliderPropsFromBankValue} from '~/dash/broadcasted-signals'

const glitchValues: SignalBank = {
  enabled: {name: 'Enabled', defaultValue: true},
  burstInterval: {name: 'Burst Interval (in seconds)', defaultValue: 3, step: .5},
  burstDuration: {name: 'Burst Duration (in seconds)', defaultValue: 1.5, step: .5},
  burstRandomness: {name: 'Burst Interval Randomness', defaultValue: 1, step: .1, max: 3, min: 0},
  wobbleBase: {name: 'Wobble Base Strength', max: 50, defaultValue: 1},
  wobbleBurst: {name: 'Wobble Burst Strength', max: 50, defaultValue: 20},
  noiseBase: {name: 'Noise Base Strength', max: .5, step: .01, defaultValue: 0},
  noiseBurst: {name: 'Noise Burst Strength', max: .5, step: .01, defaultValue: .04},
  blocksABase: {name: 'Blocks A Base Strength', max: 1, step: .01, defaultValue: .12},
  blocksABurst: {name: 'Blocks A Burst Strength', max: 1, step: .01, defaultValue: .3},
  blocksBBase: {name: 'Blocks B Base Strength', max: 1, step: .01, defaultValue: .12},
  blocksBBurst: {name: 'Blocks B Burst Strength', max: 1, step: .01, defaultValue: .5},
}

export function GlitchGroup() {
  const signals = signalsFromBank('glitch', glitchValues)
  const sliderProps = (key: keyof typeof glitchValues) => sliderPropsFromBankValue(key, glitchValues, signals)

  return (
    <Card class={'w-full'}>
      <CardHeader>
        <CardTitle>Digital Glitch Effect</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-center space-x-2">
          <Checkbox id="glitch" checked={signals.enabled.getter()} onChange={signals.enabled.setter} />
          <Label for="glitch-input">{glitchValues.enabled.name}</Label>
        </div>
        <Grid cols={2} class={'gap-4'}>
          <NumberField defaultValue={glitchValues.burstInterval.defaultValue} minValue={glitchValues.burstInterval.min}
                       step={glitchValues.burstInterval.step} label={glitchValues.burstInterval.name}
                       value={signals.burstInterval.getter} setValue={signals.burstInterval.setter} />
          <NumberField defaultValue={glitchValues.burstDuration.defaultValue} minValue={glitchValues.burstDuration.min}
                       step={glitchValues.burstDuration.step} label={glitchValues.burstDuration.name}
                       value={signals.burstDuration.getter} setValue={signals.burstDuration.setter} />
          <SliderMono class={'col-span-full'} {...sliderProps('burstRandomness')} />
        </Grid>
        <Separator />
        <Accordion multiple={false} collapsible class="w-full">
          <AccordionItem value="item" class={'border-none'}>
            <AccordionTrigger class={'pt-0 [&:not([data-expanded])]:pb-0'}>Advanced</AccordionTrigger>
            <AccordionContent class={cn(
              'w-[calc(100%+(var(--spacing)*4)*2)] relative left-[calc(-1*(var(--spacing)*4))]',
              '[&>div]:flex [&>div]:flex-col [&>div]:gap-4 [&>div]:px-4'
            )}>
              <SliderMono {...sliderProps('wobbleBase')} />
              <SliderMono {...sliderProps('wobbleBurst')} />
              <Separator class={'invisible'} />
              <SliderMono {...sliderProps('noiseBase')} />
              <SliderMono {...sliderProps('noiseBurst')} />
              <Separator class={'invisible'} />
              <SliderMono {...sliderProps('blocksABase')} />
              <SliderMono {...sliderProps('blocksABurst')} />
              <Separator class={'invisible'} />
              <SliderMono {...sliderProps('blocksBBase')} />
              <SliderMono {...sliderProps('blocksBBurst')} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
