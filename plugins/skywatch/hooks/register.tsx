import type { EngineInterface, Register, RenderChildren, Timer } from 'claude-code'

import { DREAMS, POINTING, sleeping } from './critter'
import { lookFor } from './scene'
import { flavour, newTracker, short, track, type SessionRow, type Tracker } from './sessions'
import { clockTime, dayOfYear, type Period, type Place, placeFrom, skyNow, sunTimes } from './sky'

// Skywatch: a sky behind the chat that follows the sun (dawn, day, dusk, night, with a small
// sun or a moon in its real phase), and a little critter above the prompt that snoozes until
// another session finishes, then wakes and points at it.

const SKY_MS = 5 * 60_000 // re-check the sky every 5 minutes
const SESSIONS_MS = 20_000 // re-check other sessions every 20 seconds
const KEEP_SCENES = 4 // backdrops kept for the app to draw: the current one and a few before

// What one load of the mod keeps track of. A reload starts afresh.
type State = {
  place: Place | undefined
  sessions: Tracker
  scenes: Map<string, string>
  current: string | undefined
  period: Period
  blind: boolean
  timers: Timer[]
}

async function refreshSky($: EngineInterface, s: State): Promise<void> {
  const sky = skyNow(new Date(await $.clock.now()), s.place)
  if (sky.period !== s.period) {
    s.period = sky.period
    $.ui.invalidate('ui.render') // a new sky, a new dream
  }
  const look = lookFor(sky)
  if (look.key === s.current) return
  s.current = look.key
  s.scenes.set(look.key, look.source)
  for (const key of [...s.scenes.keys()].slice(0, -KEEP_SCENES)) s.scenes.delete(key)
  await $.theme.set(look.args)
}

async function checkSessions($: EngineInterface, s: State): Promise<void> {
  let rows: SessionRow[]
  try {
    const res = await $.mcp.call('ccd_session_mgmt', 'list_sessions', { limit: 40 })
    const block = res.content.find(b => b.type === 'text') as { text?: string } | undefined
    if (res.isError || !block?.text) throw new Error('no list')
    rows = JSON.parse(block.text) as SessionRow[]
  } catch {
    if (!s.blind) {
      s.blind = true
      $.ui.invalidate('ui.render')
    }
    return
  }
  const wasBlind = s.blind
  s.blind = false
  if (track(s.sessions, rows, await $.clock.now()) || wasBlind) $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  const s: State = {
    place: placeFrom(options),
    sessions: newTracker(),
    scenes: new Map(),
    current: undefined,
    period: 'night',
    blind: false,
    timers: [],
  }

  on('session.start', async ($, e, next) => {
    for (const t of s.timers) t.cancel()
    s.current = undefined
    await $.command.register({
      name: 'skywatch',
      description: "Skywatch: today's sunrise and sunset. /skywatch test wakes the critter with a pretend finished session",
    })
    await refreshSky($, s)
    await checkSessions($, s)
    s.timers = [
      $.clock.every(SKY_MS, () => void refreshSky($, s)),
      $.clock.every(SESSIONS_MS, () => void checkSessions($, s)),
    ]
    return next(e)
  })

  on('command.run', { command: 'skywatch' }, async ($, e) => {
    const now = await $.clock.now()
    if (e.args.trim() === 'test') {
      s.sessions.waiting = [{ id: 'test', title: 'A pretend session', since: now }]
      $.ui.invalidate('ui.render')
      return { text: 'Woke the critter. "Seen it" puts him back to sleep.' }
    }
    if (!s.place) return { text: 'No location set, so the sky runs 06:00 to 18:00. Set a latitude and longitude in /config for real sunrise and sunset. /skywatch test wakes the critter.' }
    const d = new Date(now)
    const { rise, set } = sunTimes(dayOfYear(d), -d.getTimezoneOffset() / 60, s.place)
    return { text: `Sunrise ${clockTime(rise)}, sunset ${clockTime(set)}. /skywatch test wakes the critter.` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const source = s.scenes.get(e.props.scene)
    if (source === undefined) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={source} alt="The sky outside, by time of day" isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Box, Svg, Text, Link, Button } = $.ui.resolve(e)
    const waiting = s.sessions.waiting
    if (waiting.length === 0) {
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg key="critter" source={sleeping(s.period)} alt={`The critter is asleep, dreaming of ${DREAMS[s.period]}`} width={110} height={36} isInteractive />
          <Text key="status" dimColor>{s.blind ? "can't see your other sessions" : ''}</Text>
        </Box>
      )
    }
    const shown = waiting.slice(0, 3)
    const extra = waiting.length - shown.length
    const [before, after] = flavour(waiting).split('{s}') as [string, string?]
    const names: RenderChildren[] = []
    shown.forEach((w, i) => {
      if (i > 0) names.push(<Text key={`sep${i}`}>{i === shown.length - 1 && extra === 0 ? ' and ' : ', '}</Text>)
      names.push(w.link ? <Link key={w.id} href={w.link} label={short(w.title)} /> : <Text key={w.id}>{short(w.title)}</Text>)
    })
    if (extra > 0) names.push(<Text key="extra"> and {extra} more</Text>)
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg key="critter" source={POINTING} alt="The critter is scuttling side to side and pointing at the sidebar" width={110} height={36} isInteractive />
        <Box key="line" flexDirection="row" alignItems="center" flexWrap="wrap" flexGrow={1}>
          {before ? <Text key="before">{before}</Text> : null}
          {names}
          {after ? <Text key="after">{after}</Text> : null}
        </Box>
        <Button
          key="seen"
          label="Seen it"
          plain
          dimColor
          onPress={() => {
            s.sessions.waiting = []
            $.ui.invalidate('ui.render')
          }}
        />
      </Box>
    )
  })
}
