import type { EngineInterface, Register, Timer } from 'claude-code'

import { lookFor } from './scene'
import { clockTime, dayOfYear, MOODS, moodFrom, moodSky, type Period, type Place, placeFrom, skyNow, sunTimes } from './sky'

// Skywatch: a sky behind the chat that follows the sun (dawn, day, dusk, night, with a small
// sun or a moon in its real phase). It draws only the backdrop and the theme, and leaves the
// band above the prompt free for other mods.

const SKY_MS = 5 * 60_000 // re-check the sky every 5 minutes
const KEEP_SCENES = 4 // backdrops kept for the app to draw: the current one and a few before

// What one load of the mod keeps track of. A reload starts afresh.
type State = {
  place: Place | undefined
  // A mood held instead of following the sun, from the settings or /skywatch.
  mood: Period | undefined
  scenes: Map<string, string>
  current: string | undefined
  timers: Timer[]
}

async function refreshSky($: EngineInterface, s: State): Promise<void> {
  const d = new Date(await $.clock.now())
  const sky = s.mood ? moodSky(s.mood, d, s.place) : skyNow(d, s.place)
  const look = lookFor(sky)
  if (look.key === s.current) return
  s.current = look.key
  s.scenes.set(look.key, look.source)
  for (const key of [...s.scenes.keys()].slice(0, -KEEP_SCENES)) s.scenes.delete(key)
  await $.theme.set(look.args)
}

export const register: Register = (on, options) => {
  const s: State = {
    place: placeFrom(options),
    mood: moodFrom(options.sky),
    scenes: new Map(),
    current: undefined,
    timers: [],
  }

  on('session.start', async ($, e, next) => {
    for (const t of s.timers) t.cancel()
    s.current = undefined
    await $.command.register({
      name: 'skywatch',
      description: "Skywatch: today's sunrise and sunset. /skywatch morning, day, evening or night holds that sky; /skywatch live follows the sun again",
    })
    await refreshSky($, s)
    s.timers = [$.clock.every(SKY_MS, () => void refreshSky($, s))]
    return next(e)
  })

  on('command.run', { command: 'skywatch' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const mood = moodFrom(arg)
    if (mood || arg === 'live') {
      s.mood = mood
      await refreshSky($, s)
      return { text: mood ? `Holding the sky at ${arg}. /skywatch live follows the sun again.` : 'Following the sun again.' }
    }
    const held = s.mood ? ` The sky is held at ${Object.keys(MOODS).find(k => MOODS[k] === s.mood)}; /skywatch live follows the sun again.` : ''
    if (!s.place) return { text: `No location set, so the sky runs 06:00 to 18:00. Set a latitude and longitude in /config for real sunrise and sunset.${held}` }
    const d = new Date(await $.clock.now())
    const { rise, set } = sunTimes(dayOfYear(d), -d.getTimezoneOffset() / 60, s.place)
    return { text: `Sunrise ${clockTime(rise)}, sunset ${clockTime(set)}.${held}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const source = s.scenes.get(e.props.scene)
    if (source === undefined) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={source} alt="The sky outside, by time of day" isInteractive />
  })
}
