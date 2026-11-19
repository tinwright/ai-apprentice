import { expect, mock, test } from 'claude-code/testing'

import { activityFor, choosePose, fridayAt, isPing, phaseAt, scene } from './clawd'

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 10, day, hours, minutes).getTime()

const BAND = {
  plugin: 'clawd-buddy',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

test('his day: coffee in the morning, lunch at noon, asleep at night', () => {
  expect(phaseAt(at(16, 8, 0))).toBe('coffee')
  expect(phaseAt(at(16, 10, 29))).toBe('coffee')
  expect(phaseAt(at(16, 10, 30))).toBe('awake')
  expect(phaseAt(at(16, 12, 15))).toBe('lunch')
  expect(phaseAt(at(16, 22, 0))).toBe('sleep')
  expect(phaseAt(at(16, 6, 59))).toBe('sleep')
  expect(phaseAt(at(16, 7, 0))).toBe('awake')
})

test('sunglasses from Friday noon until bedtime', () => {
  // 20 November 2026 is a Friday.
  expect(fridayAt(at(20, 11, 59))).toBe(false)
  expect(fridayAt(at(20, 12, 0))).toBe(true)
  expect(fridayAt(at(20, 22, 0))).toBe(false)
  expect(fridayAt(at(19, 15, 0))).toBe(false)
})

test('pings from other sessions count, the person typing does not', () => {
  expect(isPing({ kind: 'peer' }, 'hi')).toBe(true)
  expect(isPing({ kind: 'task-notification' }, '')).toBe(true)
  expect(isPing({ kind: 'unclassified' }, '<side-sessions-event>')).toBe(true)
  expect(isPing({ kind: 'composer' }, 'hello')).toBe(false)
  expect(isPing(undefined, 'hello')).toBe(false)
})

test('tools map to typing, writing and searching', () => {
  expect(activityFor('Bash')).toBe('typing')
  expect(activityFor('Edit')).toBe('writing')
  expect(activityFor('WebSearch')).toBe('searching')
  expect(activityFor('mcp__docs__search_pages')).toBe('searching')
  expect(activityFor('TodoWrite')).toBe('none')
})

test('waiting on the person comes first, then reactions, then work, then the time of day', () => {
  const calm = { phase: 'awake', sipping: false, activity: 'none', moment: 'none', waiting: 'none', dozing: false, working: false } as const
  expect(choosePose(calm)).toBe('idle')
  expect(choosePose({ ...calm, phase: 'coffee' })).toBe('coffee')
  expect(choosePose({ ...calm, phase: 'coffee', working: true })).toBe('thinking')
  expect(choosePose({ ...calm, working: true, activity: 'writing' })).toBe('writing')
  expect(choosePose({ ...calm, activity: 'typing', moment: 'oops' })).toBe('oops')
  expect(choosePose({ ...calm, moment: 'proud', waiting: 'approval' })).toBe('wave')
  expect(choosePose({ ...calm, waiting: 'impatient' })).toBe('tap')
  expect(choosePose({ ...calm, dozing: true })).toBe('sleep')
})

test('the drawing is an svg with a mini Clawd per helper', () => {
  const svg = scene('typing', false, 2)
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg.match(/class="mini[ "]/g)?.length).toBe(2)
  expect(scene('typing', false, 1).match(/class="mini[ "]/g)?.length).toBe(1)
  expect(scene('sleep', false, 2).includes('class="mini')).toBe(false)
})

test('/clawd-yoohoo makes him wave in the band above the prompt', async ($, on) => {
  on('command.register', () => ({ value: { command: 'clawd-yoohoo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const { text } = await $.command.run({ command: 'clawd-yoohoo' })
  expect(text).toBe('Yoohoo! 👋')

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /pinged/ }))?.text).toBe('a session pinged you!')
  await ui.unmount()
})

test('passing tests earn a ta-da, on every surface', async ($, on) => {
  on('command.register', () => ({ value: { command: 'clawd-yoohoo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /ta-da/ }))?.text).toContain('ta-da!')
    await ui.unmount()
  }
})

test('/clawd-nap sends him to doze straight away', async ($, on) => {
  mock.clock(on, { now: at(16, 15, 0) })
  on('command.register', () => ({ value: { command: 'clawd-nap' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const { text } = await $.command.run({ command: 'clawd-nap' })
  expect(text).toContain('dozing')
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /dozing/ }))?.text).toContain('dozing')
  await ui.unmount()
})
