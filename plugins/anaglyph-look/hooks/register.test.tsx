import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { INKS } from './scene'

// What the app answers beneath the mod: the store, the panes, the toasts and the themes it sets,
// collected so a test can see them.
function app(on: On, stored: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: Date.UTC(2026, 10, 25, 15) })
  const seen = { clock, scenes: [] as string[], atCall: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[], panes: [] as string[], store: { ...stored } }
  on('command.register', () => ({ value: undefined }) as any)
  on('theme.set', (_$, e: any) => {
    seen.scenes.push(e.backdrop?.scene)
    return { value: { isDrawn: true } } as any
  })
  on('store.get', (_$, e: any) => ({ value: seen.store[e.key] }) as any)
  on('store.set', (_$, e: any) => {
    seen.store[e.key] = e.value
    return { value: undefined } as any
  })
  on('store.delete', (_$, e: any) => {
    delete seen.store[e.key]
    return { value: undefined } as any
  })
  on('ui.toast', (_$, e: any) => {
    seen.toasts.push(String(e.text ?? e))
    return { value: undefined } as any
  })
  on('ui.status', (_$, e: any) => {
    seen.statuses.push(e.text ?? (typeof e === 'string' ? e : undefined))
    return { value: undefined } as any
  })
  on('ui.open', (_$, e: any) => {
    seen.panes.push(e.id)
    return { value: { isPlaced: true } } as any
  })
  on('ui.close', (_$, e: any) => {
    seen.panes = seen.panes.filter(id => id !== e.id)
    return { value: undefined } as any
  })
  on('session.start', (_$, e) => e)
  on('turn.start', (_$, e) => e as any)
  on('turn.complete', (_$, e: any) => ({ text: e.answer }) as any)
  // What the backdrop showed while each tool ran.
  on('tool.call', () => {
    seen.atCall.push(seen.scenes.at(-1) ?? '')
    return { result: {} } as any
  })
  return seen
}

const START = { cwd: '/home/me/project', surface: 'desktop', isInteractive: true } as any
const TURN = { turnId: 't1', prompt: 'hi' } as any
const DONE = { turnId: 't1', answer: 'done', durationMs: 1, isAborted: false, reason: 'answer' } as any
const backdrop = (plugin: string, scene: string, surface: 'desktop' | 'terminal' = 'desktop') =>
  ({ plugin, surface, component: 'Backdrop', props: { scene, plugin, glass: { blur: 2, opacity: 0.5 } } }) as any
const PANE = { plugin: 'anaglyph-look', surface: 'desktop', component: 'Pane', requestId: 'anaglyph-calibrate', props: { title: 'x', isFocused: true, bodyColumns: 80, placement: 'dock' } } as any

test('the arena parks at the start, drives through a turn, fires at a tool, blows up the tank ahead, and parks', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  expect(seen.scenes.at(-1)).toMatch(/^arena-idle-/)
  await $.turn.start(TURN)
  expect(seen.scenes.at(-1)).toMatch(/^arena-working-/)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  expect(seen.scenes.at(-1)).toMatch(/^arena-firing-/)
  await $.turn.complete(DONE)
  expect(seen.scenes.at(-1)).toMatch(/^arena-blast-/)
  await seen.clock.advance(3000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-idle-/)
})

test('a turn that only answers parks without a blast', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  await $.turn.start(TURN)
  await $.turn.complete(DONE)
  expect(seen.scenes.some(s => s.startsWith('arena-blast-'))).toBe(false)
  expect(seen.scenes.at(-1)).toMatch(/^arena-idle-/)
})

test('a question to you lights the beacons until it is answered', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  await $.turn.start(TURN)
  await $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'q1', questions: [] } as never)
  expect(seen.atCall[0]).toMatch(/^arena-waiting-/)
  expect(seen.scenes.at(-1)).toMatch(/^arena-working-/)
})

test('the desktop app draws the current scene, a terminal nothing, and another mod keeps its own', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  const scene = seen.scenes.at(-1) ?? ''
  const desktop = await $.ui.mount(backdrop('anaglyph-look', scene))
  expect((await desktop.find({ type: 'Svg' } as any))?.props.source).toContain(INKS.typical.red)
  await desktop.unmount()
  for (const target of [backdrop('anaglyph-look', scene, 'terminal'), backdrop('skywatch', scene)]) {
    const ui = await $.ui.mount(target)
    expect(await ui.find({ type: 'Svg' } as any)).toBeUndefined()
    await ui.unmount()
  }
})

test('the grid setting draws the grid, which a turn leaves alone', { options: { scene: 'grid' } }, async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  await $.turn.start(TURN)
  expect(seen.scenes).toHaveLength(1)
  expect(seen.scenes[0]).toMatch(/^grid-/)
})

test('the first session suggests calibrating, once', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  await $.session.start(START)
  expect(seen.toasts.filter(t => t.includes('/anaglyph-calibrate'))).toHaveLength(1)
})

test('calibrating changes the scene as you go, and Save keeps it for the next session', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  const { text } = await $.command.run({ command: 'anaglyph-calibrate', args: '' } as never)
  expect(text).toContain('Calibration open')
  expect(seen.panes).toContain('anaglyph-calibrate')

  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Svg' } as any))?.props.source).toContain('LEFT')
  await ui.press({ key: 'leaky' })
  await ui.press({ key: 'cyan-' })
  const shown = seen.scenes.at(-1) ?? ''
  const drawn = await $.ui.mount(backdrop('anaglyph-look', shown))
  expect((await drawn.find({ type: 'Svg' } as any))?.props.source).toContain(INKS.leaky.red)
  await drawn.unmount()

  await ui.press({ key: 'save' })
  await ui.unmount()
  expect(seen.panes).not.toContain('anaglyph-calibrate')
  expect(seen.store.calibration).toMatchObject({ red: INKS.leaky.red, strength: 1 })
})

test('a saved calibration wins over the glasses setting', { options: { glasses: 'clean' } }, async ($, on) => {
  const seen = app(on, { calibration: { red: '#5d0808', cyan: '#004b45', strength: 1.2 } })
  await $.session.start(START)
  const drawn = await $.ui.mount(backdrop('anaglyph-look', seen.scenes.at(-1) ?? ''))
  const source = (await drawn.find({ type: 'Svg' } as any))?.props.source as string
  expect(source).toContain('#5d0808')
  expect(source).not.toContain(INKS.clean.red)
  await drawn.unmount()
  expect(seen.toasts).toHaveLength(0)
})

test('a shot shows for a moment, then the tanks drive on', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  await $.turn.start(TURN)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  expect(seen.scenes.at(-1)).toMatch(/^arena-firing-/)
  await seen.clock.advance(2000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-working-/)
})

test('the demo plays every arena state, holds off real activity, then hands back', { options: { scene: 'grid' } }, async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  const { text } = await $.command.run({ command: 'anaglyph-demo', args: '' } as never)
  expect(text).toContain('Demo running')
  await seen.clock.advance(100)
  expect(seen.scenes.at(-1)).toMatch(/^arena-idle-/)
  await seen.clock.advance(3000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-working-/)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  expect(seen.scenes.at(-1)).toMatch(/^arena-working-/)
  await seen.clock.advance(4000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-firing-/)
  await seen.clock.advance(7000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-waiting-/)
  expect(seen.statuses.some(s => s?.includes('beacons'))).toBe(true)
  await seen.clock.advance(7000)
  expect(seen.scenes.at(-1)).toMatch(/^arena-blast-/)
  await seen.clock.advance(5000)
  expect(seen.scenes.at(-1)).toMatch(/^grid-/)
  expect(seen.statuses.at(-1)).toBeUndefined()
})


test('the readout above the prompt says what the tank is doing and counts shots', async ($, on) => {
  app(on)
  await $.session.start(START)
  await $.turn.start(TURN)
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' } as never)
  const band = { plugin: 'anaglyph-look', component: 'AbovePrompt', props: { hasSurvey: false, isCollapsed: false, isWorking: true, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as any
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...band, surface })
    expect((await ui.find({ type: 'Text', text: /FIRING/ } as any))?.text).toContain('FIRING')
    expect((await ui.find({ type: 'Text', text: /Shots/ } as any))?.text).toContain('Shots 1')
    await ui.unmount()
  }
})
