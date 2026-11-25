import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { INKS, SCENE } from './scene'

// What the app answers beneath the mod: the themes it sets, collected so a test can see them.
function app(on: On): { scenes: unknown[] } {
  const seen = { scenes: [] as unknown[] }
  on('theme.set', (_$, e: any) => {
    seen.scenes.push(e.backdrop?.scene)
    return { value: { isDrawn: true } } as any
  })
  on('session.start', (_$, e) => e)
  return seen
}

const START = { cwd: '/home/me/project', surface: 'desktop', isInteractive: true } as any
const glass = { blur: 3, opacity: 0.7 }
const backdrop = (plugin: string, surface: 'desktop' | 'terminal') =>
  ({ plugin, surface, component: 'Backdrop', props: { scene: SCENE, plugin, glass } }) as any

test('the session starts with the anaglyph backdrop', async ($, on) => {
  const seen = app(on)
  await $.session.start(START)
  expect(seen.scenes).toEqual([SCENE])
})

test('the desktop app draws the scene, and a terminal draws nothing', async ($, on) => {
  app(on)
  await $.session.start(START)
  const desktop = await $.ui.mount(backdrop('anaglyph-look', 'desktop'))
  expect((await desktop.find({ type: 'Svg' } as any))?.props.source).toContain(INKS.typical.red)
  await desktop.unmount()
  const terminal = await $.ui.mount(backdrop('anaglyph-look', 'terminal'))
  expect(await terminal.find({ type: 'Svg' } as any)).toBeUndefined()
  await terminal.unmount()
})

test("another mod's backdrop is left alone", async ($, on) => {
  app(on)
  await $.session.start(START)
  const ui = await $.ui.mount(backdrop('skywatch', 'desktop'))
  expect(await ui.find({ type: 'Svg' } as any)).toBeUndefined()
  await ui.unmount()
})

test('the glasses setting changes the inks', { options: { glasses: 'leaky' } }, async ($, on) => {
  app(on)
  await $.session.start(START)
  const ui = await $.ui.mount(backdrop('anaglyph-look', 'desktop'))
  expect((await ui.find({ type: 'Svg' } as any))?.props.source).toContain(INKS.leaky.cyan)
  await ui.unmount()
})
