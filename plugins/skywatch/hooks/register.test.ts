import { expect, mock, test } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: {} as any } as const

type On = Parameters<Parameters<typeof test>[1]>[1]

// What the app answers beneath the mod: the command and theme it sets, and the session list,
// as `list_sessions` answers it.
function sessionList(on: On, rows: () => unknown[]) {
  on('command.register', async () => ({ value: undefined }) as any)
  on('theme.set', async () => ({ value: undefined }) as any)
  on('session.start', async (_$, e) => e)
  on('mcp.call', { server: 'ccd_session_mgmt', tool: 'list_sessions' } as any, async () => ({
    value: { content: [{ type: 'text', text: JSON.stringify(rows()) }] },
  }) as any)
}

const START = { source: 'startup', cwd: '/home/user/project' } as any

test('/skywatch test wakes the critter, and "Seen it" puts it back to sleep', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'desktop', ...BAND })
  expect(await ui.find({ key: 'seen' })).toBeUndefined()

  const { text } = await $.command.run({ command: 'skywatch', args: 'test' })
  expect(text).toContain('Seen it')
  expect((await ui.find({ key: 'line' }))?.text).toContain('A pretend session')

  await ui.press({ key: 'seen' })
  expect(await ui.find({ key: 'seen' })).toBeUndefined()
  await ui.unmount()
})

test('a session that finishes wakes the critter with a link to it', async ($, on) => {
  const clock = mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  let running = true
  sessionList(on, () => [{ sessionId: 's1', title: 'Fix the login page', isRunning: running, link: 'https://example.com/s1' }])
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'desktop', ...BAND })
  expect(await ui.find({ key: 'seen' })).toBeUndefined()

  running = false
  await clock.advance(20_000)
  expect((await ui.find({ key: 'line' }))?.text).toContain('Fix the login page')

  running = true
  await clock.advance(20_000)
  expect(await ui.find({ key: 'seen' })).toBeUndefined()
  await ui.unmount()
})

test('the terminal gets no band', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  await $.session.start(START)
  await $.command.run({ command: 'skywatch', args: 'test' })
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'seen' })).toBeUndefined()
  await ui.unmount()
})

test('/skywatch night holds the night sky, and live lets it go', async ($, on) => {
  // Noon: the live sky is day, so the critter dreams of a butterfly.
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'desktop', ...BAND })
  expect((await $.command.run({ command: 'skywatch', args: 'night' })).text).toContain('Holding the sky at night')
  expect((await ui.find({ type: 'Svg' } as any))?.props?.alt).toContain('sheep')
  expect((await $.command.run({ command: 'skywatch', args: 'live' })).text).toBe('Following the sun again.')
  expect((await ui.find({ type: 'Svg' } as any))?.props?.alt).not.toContain('sheep')
  await ui.unmount()
})

test('the sky setting holds a mood from the start', { options: { sky: 'night' } }, async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'skywatch', surface: 'desktop', ...BAND })
  expect((await ui.find({ type: 'Svg' } as any))?.props?.alt).toContain('sheep')
  expect((await $.command.run({ command: 'skywatch', args: '' })).text).toContain('held at night')
  await ui.unmount()
})

test('with no location, /skywatch says so', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  const { text } = await $.command.run({ command: 'skywatch', args: '' })
  expect(text).toContain('06:00 to 18:00')
})

test('with a location, /skywatch gives sunrise and sunset', { options: { latitude: 40.7, longitude: -74 } }, async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 15, 12) })
  sessionList(on, () => [])
  const { text } = await $.command.run({ command: 'skywatch', args: '' })
  expect(text).toMatch(/^Sunrise \d\d:\d\d, sunset \d\d:\d\d/)
})
