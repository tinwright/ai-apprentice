import { expect, test } from 'claude-code/testing'

import { COLORS, INKS, lookFor, scene, SCENE, SCENE_LIMIT, settingsFrom } from './scene'

const TYPICAL = { strength: 1, glasses: 'typical' } as const

test('the scene is an SVG under the backdrop limit, and holds still for reduced motion', () => {
  const source = scene(TYPICAL)
  expect(source.startsWith('<svg')).toBe(true)
  expect(source.length).toBeLessThan(SCENE_LIMIT)
  expect(source).toContain('prefers-reduced-motion')
})

test('every depth an eye is drawn at has a rule placing it', () => {
  const source = scene(TYPICAL)
  const used = new Set([...source.matchAll(/class="eye [rc] (d[\w]+)"/g)].map(m => m[1]))
  expect(used.size).toBeGreaterThan(3)
  for (const name of used) {
    expect(source).toContain(`.r.${name}{transform:translateX(`)
    expect(source).toContain(`.c.${name}{transform:translateX(`)
  }
})

test('the two eyes are pushed apart in opposite directions, by the same amount', () => {
  const at = (source: string, eye: 'r' | 'c') => Number(new RegExp(`\\.${eye}\\.dm6_5\\{transform:translateX\\((-?[\\d.]+)px`).exec(source)?.[1])
  const source = scene(TYPICAL)
  expect(at(source, 'r')).toBeLessThan(0)
  expect(at(source, 'r')).toBe(-at(source, 'c'))
})

test('depth scales how far apart the eyes are', () => {
  const offset = (strength: number) => Number(/\.r\.dm6_5\{transform:translateX\((-?[\d.]+)px/.exec(scene({ strength, glasses: 'typical' }))?.[1])
  expect(Math.abs(offset(2) - offset(1) * 2)).toBeLessThan(0.05)
})

test('the inks follow the glasses setting', () => {
  for (const glasses of ['clean', 'typical', 'leaky'] as const) {
    const source = scene({ strength: 1, glasses })
    expect(source).toContain(`stroke="${INKS[glasses].red}"`)
    expect(source).toContain(`stroke="${INKS[glasses].cyan}"`)
  }
})

test('settings fall back to defaults and keep depth in range', () => {
  expect(settingsFrom({})).toEqual({ strength: 1, glasses: 'typical' })
  expect(settingsFrom({ depth: 9, glasses: 'leaky' })).toEqual({ strength: 2, glasses: 'leaky' })
  expect(settingsFrom({ depth: 0, glasses: 'rose' })).toEqual({ strength: 0.2, glasses: 'typical' })
})

test('the desktop app paints the theme, and the look names the scene', () => {
  expect(COLORS.problems.filter(line => line.startsWith("Desktop won't paint"))).toEqual([])
  expect(lookFor(TYPICAL).args.backdrop).toMatchObject({ scene: SCENE })
})
