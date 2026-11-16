import { expect, mock, test } from 'claude-code/testing'

type On = Parameters<Parameters<typeof test>[1]>[1]

// What the app answers beneath the mod: the command it registers, and the themes it sets,
// collected so a test can see which sky is up.
function app(on: On): { scenes: string[] } {
  const seen = { scenes: [] as string[] }
  on('command.register', async () => ({ value: undefined }) as any)
  on('theme.set', async (_$, e: any) => {
    seen.scenes.push(e.backdrop?.scene)
    return { value: undefined } as any
  })
  on('session.start', async (_$, e) => e)
  return seen
}

const START = { source: 'startup', cwd: '/home/user/project' } as any

test('the session starts under the sky for the time of day', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  const seen = app(on)
  await $.session.start(START)
  expect(seen.scenes.at(-1)).toMatch(/^day-/)
})

test('the band above the prompt is left to other mods', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  app(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'desktop', component: 'AbovePrompt', props: {} as any })
  expect(await ui.find({ type: 'Svg' } as any)).toBeUndefined()
  await ui.unmount()
})

test('/skywatch night holds the night sky, and live lets it go', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  const seen = app(on)
  await $.session.start(START)
  expect((await $.command.run({ command: 'skywatch', args: 'night' })).text).toContain('Holding the sky at night')
  expect(seen.scenes.at(-1)).toMatch(/^night-/)
  expect((await $.command.run({ command: 'skywatch', args: 'live' })).text).toBe('Following the sun again.')
  expect(seen.scenes.at(-1)).toMatch(/^day-/)
})

test('the sky setting holds a mood from the start', { options: { sky: 'night' } }, async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  const seen = app(on)
  await $.session.start(START)
  expect(seen.scenes.at(-1)).toMatch(/^night-/)
  expect((await $.command.run({ command: 'skywatch', args: '' })).text).toContain('held at night')
})

test('with no location, /skywatch says so', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  app(on)
  const { text } = await $.command.run({ command: 'skywatch', args: '' })
  expect(text).toContain('06:00 to 18:00')
})

test('with a location, /skywatch gives sunrise and sunset', { options: { latitude: 40.7, longitude: -74 } }, async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  app(on)
  const { text } = await $.command.run({ command: 'skywatch', args: '' })
  expect(text).toMatch(/^Sunrise \d\d:\d\d, sunset \d\d:\d\d\.$/)
})
