import {createEffect, createMemo, createSignal} from 'solid-js'
import {Saturation, Hue, ChangeColor} from 'solid-color'
import tinycolor from 'tinycolor2'
import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card'
import {Grid} from '~/components/ui/grid'
import NumberField from '~/dash/number-field'
import {Label} from '~/components/ui/label'
import {createBroadcastedPersistedSignal, SignalBank, signalsFromBank} from '~/dash/broadcasted-signals'
import {Checkbox} from '~/components/ui/checkbox'
import {Popover, PopoverContent, PopoverTrigger,} from '~/components/ui/popover'
import {Button} from '~/components/ui/button'
// import {TextField, TextFieldInput} from '~/components/ui/text-field'
import {ResetButton} from '~/dash/reset-button'
import {createElementBounds} from '@solid-primitives/bounds'

const lidarValues: SignalBank = {
  posRelative: {name: 'Position relative to camera', defaultValue: true},
  posX: {name: 'Position X', defaultValue: 6, description: 'Left / Right'},
  posY: {name: 'Position Y', defaultValue: 0, description: 'Up / Down'},
  posZ: {name: 'Position Z', defaultValue: -4, description: 'Forward / Backward'},
  dotsPerAxis: {name: 'Dots per axis', min: 4, defaultValue: 128 * 1.5},
  aspect: {name: 'Projection aspect ratio', step: .1, defaultValue: .6},
  dotSize: {name: 'Dot size', min: 0, step: .001, defaultValue: .015},
}

const defaultDotColor = tinycolor('#ff3355')

export function LidarGroup() {
  const signals = signalsFromBank('lidar', lidarValues)
  const [_color, setColor] = createBroadcastedPersistedSignal('lidar_dotColor', defaultDotColor, {
    stringify: value => value.toHexString(),
    parse: tinycolor
  })
  const color = createMemo(() => _color() ?? defaultDotColor)

  const changeColor = (newColor: ChangeColor) =>
    setColor((typeof newColor === 'object' && 'hex' in newColor) ? tinycolor(newColor.hex) : tinycolor(newColor))

  const [pickerTriggerElement, setPickerTriggerElement] = createSignal<HTMLDivElement>();
  const pickerTriggerBounds = createElementBounds(pickerTriggerElement);

  return (
    <Card class={'w-full'}>
      <CardHeader>
        <CardTitle>LiDAR Projection</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-center space-x-2">
          <Checkbox id="pos-relative" checked={signals.posRelative.getter()} onChange={signals.posRelative.setter} />
          <Label for="pos-relative-input">{lidarValues.posRelative.name}</Label>
        </div>
        <Grid cols={3} class={'gap-4'}>
          <NumberField defaultValue={lidarValues.posX.defaultValue} label={lidarValues.posX.name}
                       value={signals.posX.getter} setValue={signals.posX.setter}
                       description={lidarValues.posX.description} />
          <NumberField defaultValue={lidarValues.posY.defaultValue} label={lidarValues.posY.name}
                       value={signals.posY.getter} setValue={signals.posY.setter}
                       description={lidarValues.posY.description} />
          <NumberField defaultValue={lidarValues.posZ.defaultValue} label={lidarValues.posZ.name}
                       value={signals.posZ.getter} setValue={signals.posZ.setter}
                       description={lidarValues.posZ.description} />
        </Grid>
        <Grid cols={2} class={'gap-4'}>
          <NumberField defaultValue={lidarValues.dotsPerAxis.defaultValue} label={lidarValues.dotsPerAxis.name}
                       minValue={lidarValues.dotsPerAxis.min}
                       value={signals.dotsPerAxis.getter} setValue={signals.dotsPerAxis.setter}
                       description={`Projects a grid of ${signals.dotsPerAxis.getter()}x${signals.dotsPerAxis.getter()} dots. Not all might hit an object`} />
          <NumberField defaultValue={lidarValues.aspect.defaultValue} label={lidarValues.aspect.name}
                       value={signals.aspect.getter} setValue={signals.aspect.setter} step={lidarValues.aspect.step}
                       description={`Values <1 bunch up dots horizontally, >1 bunch up dots vertically`} />
        </Grid>
        <Grid cols={2} class={'gap-4'}>
          <Grid class={'grid-cols-[1fr_auto] grid-rows-[min-content_auto] items-center gap-2'}>
            <Label>Dot color</Label>
            <ResetButton class={'ml-auto'} value={color} defaultValue={tinycolor('#ff3355')}
              // @ts-ignore
                         setValue={setColor} />
            <Popover>
              <PopoverTrigger as={Button<"button">} class={'justify-start px-2 col-span-full'} variant="outline"
                              ref={setPickerTriggerElement}>
                <div class={'size-full rounded-sm'} style={{background: color().toHexString()}} />
              </PopoverTrigger>
              <PopoverContent class={'flex flex-col gap-4'} style={{width: pickerTriggerBounds.width + 'px'}}>
                <Saturation
                  class={'w-full h-28 rounded-sm'}
                  hsl={color().toHsl()}
                  hsv={color().toHsv()}
                  pointer={<ColorPointer />}
                  onChange={changeColor}
                />
                <Hue
                  class={'w-full h-2 rounded-sm'}
                  hsl={color().toHsl()}
                  pointer={ColorPointer}
                  onChange={changeColor}
                />
                {/*<TextField defaultValue={color().toHexString()}
                       onInput={event => tinycolor((event.currentTarget as HTMLInputElement).value)}>
              <TextFieldInput />
            </TextField>*/}
              </PopoverContent>
            </Popover>
          </Grid>
          <NumberField defaultValue={lidarValues.dotSize.defaultValue} label={lidarValues.dotSize.name}
                       value={signals.dotSize.getter} setValue={signals.dotSize.setter}
                       step={lidarValues.dotSize.step} />
        </Grid>
        {/*todo lidar glitches*/}
      </CardContent>
    </Card>
  )
}

function ColorPointer() {
  return <div class={'size-3 -translate-1.5 rounded-full border border-white outline-1 outline-black/20'} />
}
