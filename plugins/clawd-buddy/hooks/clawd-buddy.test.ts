import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { DEMO_MS, HOLD_MS, MOMENT_MIN_MS, activityFor, choosePose, fridayAt, isPing, minis, phaseAt, scene } from './clawd'

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

test('helpers are their own drawing, so Clawd\'s never changes with them', () => {
  expect(scene('typing', false).startsWith('<svg')).toBe(true)
  expect(scene('typing', false).includes('class="mini')).toBe(false)
  expect(minis(1).match(/class="mini[ "]/g)?.length).toBe(1)
  expect(minis(5).match(/class="mini[ "]/g)?.length).toBe(2)
})

test('/clawd-yoohoo makes him wave in the band above the prompt', async ($, on) => {
  mock.clock(on, { now: at(16, 15) })
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
  mock.clock(on, { now: at(16, 15) })
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

const caption = async ($: Parameters<TestBody>[0], text: RegExp) => {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const found = (await ui.find({ type: 'Text', text }))?.text
  await ui.unmount()
  return found
}

test('a parallel tool finishing does not end a pending question', async ($, on) => {
  mock.clock(on, { now: at(16, 15) })
  on('command.register', () => ({ value: { command: 'clawd-yoohoo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  let answer = () => {}
  on('tool.call', (_, e) =>
    e.tool === 'AskUserQuestion' ? new Promise(resolve => { answer = () => resolve({ result: {} }) }) : { result: {} },
  )
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const asking = $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'q1', questions: [] } as never)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  expect(await caption($, /needs your OK/)).toBe('needs your OK')

  answer()
  await asking
  expect(await caption($, /needs your OK/)).toBe(undefined)
})

test('a yoohoo left over from before a restart does not stick', async ($, on) => {
  mock.clock(on, { now: at(16, 15) })
  on('command.register', () => ({ value: { command: 'clawd-yoohoo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'clawd-yoohoo' } as never)
  expect(await caption($, /pinged/)).toBe('a session pinged you!')

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await caption($, /pinged/)).toBe(undefined)
})

// ── Smooth transitions ─────────────────────────────────────────────────────
type On = Parameters<TestBody>[1]
type Engine = Parameters<TestBody>[0]

/** A session at 3pm on a quiet Monday, with tool calls answered by `tools`. */
async function boot($: Engine, on: On, tools: (e: { tool: string }) => unknown = () => ({ result: {} }), extra: () => void = () => {}) {
  const clock = mock.clock(on, { now: at(16, 15) })
  extra()
  on('command.register', () => ({ value: { command: 'clawd-yoohoo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('tool.call', (_, e) => tools(e) as never)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  return clock
}

/** Resolves a pending mocked tool call when `done()` runs. */
function pending() {
  let done = (_result: unknown = { result: {} }) => {}
  const promise = new Promise(resolve => { done = resolve })
  return { promise, done: (result: unknown = { result: {} }) => done(result) }
}

test('a finished tool\'s pose holds a moment instead of snapping back', async ($, on) => {
  const clock = await boot($, on)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  expect(await caption($, /looking/)).toBe('looking things up')

  await clock.advance(HOLD_MS)
  expect(await caption($, /looking/)).toBe(undefined)
})

test('short calls beside a long command leave the command\'s pose alone', async ($, on) => {
  const bash = pending()
  const grep = pending()
  const clock = await boot($, on, e => (e.tool === 'Bash' ? bash.promise : grep.promise))

  const running = $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'pnpm build' } as never)
  const searching = $.tool.call({ tool: 'Grep', tool_use_id: 'g1', pattern: 'x' } as never)
  await clock.settle()
  expect(await caption($, /running a command|looking/)).toBe('running a command')

  grep.done()
  await searching
  expect(await caption($, /running a command|looking/)).toBe('running a command')
  bash.done()
  await running
})

test('new work ends a reaction once it has been seen', async ($, on) => {
  const read = pending()
  const clock = await boot($, on, e => (e.tool === 'Read' ? read.promise : { result: {} }))
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'npm test' } as never)
  const reading = $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  await clock.settle()
  expect(await caption($, /ta-da|looking/)).toBe('ta-da!')

  await clock.advance(MOMENT_MIN_MS)
  expect(await caption($, /ta-da|looking/)).toBe('looking things up')
  read.done()
  await reading
})

test('only failing commands say oops, and not over and over', async ($, on) => {
  const clock = await boot($, on, () => ({ result: {}, isError: true, text: 'failed' }))
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/missing' } as never)
  expect(await caption($, /oops/)).toBe(undefined)

  await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'false' } as never)
  expect(await caption($, /oops/)).toBe('oops!')

  await clock.advance(3000)
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b2', command: 'false' } as never)
  expect(await caption($, /oops/)).toBe(undefined)
})

test('the wave shows only while a person is asked, and ends with that call', async ($, on) => {
  const bash = pending()
  await boot($, on, e => (e.tool === 'Bash' ? bash.promise : { result: {} }), () => on('classic.PermissionRequest', () => ({})))

  const running = $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'rm -rf build' } as never)
  expect(await caption($, /needs your OK/)).toBe(undefined)

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
  expect(await caption($, /needs your OK/)).toBe('needs your OK')

  bash.done()
  await running
  expect(await caption($, /needs your OK/)).toBe(undefined)
})

test('a workflow\'s agents show as mini Clawds until each one finishes', async ($, on) => {
  let n = 0
  await boot($, on, undefined, () => {
    on('agent.spawn', () => ({ model: 'm', agentId: `wa${++n}` }))
    on('turn.complete', (_, e) => ({ text: e.answer }))
  })
  const spawn = (i: number) =>
    $.agent.spawn({ prompt: 'p', description: 'd', subagentType: 'general-purpose', tool_use_id: 'w', workflow: { runId: 'wf_1', index: i } } as never)

  await spawn(1)
  await spawn(2)
  expect(await caption($, /helper/)).toBe('+ 2 helpers')

  await $.turn.complete({ agentId: 'wa1', answer: 'done', durationMs: 1, isAborted: false, turnId: 't-wa1', reason: 'answer' } as never)
  expect(await caption($, /helper/)).toBe('+ 1 helper')
  await $.turn.complete({ agentId: 'wa2', answer: 'done', durationMs: 1, isAborted: false, turnId: 't-wa2', reason: 'answer' } as never)
  expect(await caption($, /helper/)).toBe(undefined)
})

test('the sweep ends with compaction, not seconds after', async ($, on) => {
  const compaction = pending()
  const clock = await boot($, on, undefined, () => on('session.compact', () => compaction.promise as never))

  const compacting = $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [] }] } as never)
  await clock.settle()
  expect(await caption($, /tidying/)).toBe('tidying up')

  await clock.advance(MOMENT_MIN_MS)
  compaction.done({ messages: [{ role: 'user', text: 'summary', toolUses: [] }] })
  await compacting
  expect(await caption($, /tidying/)).toBe(undefined)
})

test('a restart during /clawd-demo stops the demo for good', async ($, on) => {
  const clock = await boot($, on)
  await $.command.run({ command: 'clawd-demo' } as never)
  expect(await caption($, /\(1\/18\)/)).toContain('(1/18)')

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.advance(DEMO_MS * 2)
  expect(await caption($, /\/18\)/)).toBe(undefined)
})

test('a passing PowerShell push earns the thumbs-up too', async ($, on) => {
  await boot($, on)
  await $.tool.call({ tool: 'PowerShell', tool_use_id: 'p1', command: 'git push' } as never)
  expect(await caption($, /GitHub/)).toBe('saved to GitHub 👍')
})

test('a denied workflow spawn adds no mini Clawd', async ($, on) => {
  await boot($, on, undefined, () => on('agent.spawn', () => ({ deny: 'Kiro is unavailable' })))
  await $.agent.spawn({ prompt: 'p', description: 'd', subagentType: 'general-purpose', tool_use_id: 'w', workflow: { runId: 'wf_1', index: 1 } } as never).catch(() => {})
  expect(await caption($, /helper/)).toBe(undefined)
})
