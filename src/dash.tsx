import {render} from 'solid-js/web'
import {createSignal, onMount} from 'solid-js'

import './dash-theme.css'
import './dash-base.scss'
import '@fontsource/inter/latin-400.css'

import {Flex} from '~/components/ui/flex'
import {Card, CardContent} from '~/components/ui/card'
import {GlitchGroup} from '~/dash/glitch-group'
import {GlowGroup} from '~/dash/glow-group'
import {SoundGroup} from '~/dash/sound-group'
import {LidarGroup} from '~/dash/lidar-group'
import {SceneGroup} from '~/dash/scene-group'
import BroadcastState from '~/lib/broadcast-state'

const numberFormatter = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})

render(App, document.getElementById('app') as HTMLDivElement)

function App() {
  const [fps, setFps] = createSignal(0)
  onMount(() => new BroadcastState<number>({id: 'fps'}).onChange(setFps))

  return (
    <Flex flexDirection={'col'} class={'p-6 gap-6'}>
      <Card class={'w-full'}>
        <CardContent class={'pt-6'}>
          FPS: {numberFormatter.format(fps())}
        </CardContent>
      </Card>
      <SceneGroup />
      <LidarGroup />
      <SoundGroup />
      <GlowGroup />
      <GlitchGroup />
    </Flex>
  )
}
