import { expect, test } from 'claude-code/testing'

import { arenaScene, MODES } from './arena'
import { COLORS, gridScene, INKS, lookFor, settingsFrom } from './scene'
import { SCENE_LIMIT } from './stereo'

const INK = INKS.typical

// Every depth an eye is drawn at needs a rule placing it, or both eyes sit on top of each other.
function placesEveryDepth(source: string) {
  const used = new Set([...source.matchAll(/class="eye [rc] (d[\w]+)"/g)].map(m => m[1]))
  expect(used.size).toBeGreaterThan(3)
  for (const name of used) {
    expect(source).toContain(`.r.${name}{transform:translateX(`)
    expect(source).toContain(`.c.${name}{transform:translateX(`)
  }
}

const offset = (source: string, eye: 'r' | 'c', name: string) => Number(new RegExp(`\\.${eye}\\.${name}\\{transform:translateX\\((-?[\\d.]+)px`).exec(source)?.[1])

test('the grid scene is an SVG under the backdrop limit, still for reduced motion, with every depth placed', () => {
  const source = gridScene({ inks: INK, strength: 1 })
  expect(source.startsWith('<svg')).toBe(true)
  expect(source.length).toBeLessThan(SCENE_LIMIT)
  expect(source).toContain('prefers-reduced-motion')
  placesEveryDepth(source)
})

test('every arena mode is an SVG under the limit, with every depth placed', () => {
  for (const mode of MODES) {
    const source = arenaScene({ inks: INK, strength: 1, mode, phase: 12.5 })
    expect(source.length).toBeLessThan(SCENE_LIMIT)
    expect(source).toContain('prefers-reduced-motion')
    placesEveryDepth(source)
  }
})

test('the two eyes are pushed apart in opposite directions, and depth scales how far', () => {
  const one = gridScene({ inks: INK, strength: 1 })
  expect(offset(one, 'r', 'dm6_5')).toBeLessThan(0)
  expect(offset(one, 'r', 'dm6_5')).toBe(-offset(one, 'c', 'dm6_5'))
  const two = gridScene({ inks: INK, strength: 2 })
  expect(Math.abs(offset(two, 'r', 'dm6_5') - offset(one, 'r', 'dm6_5') * 2)).toBeLessThan(0.05)
})

test('the arena parks when idle or waiting, shoots only when firing, and picks up where it was', () => {
  const at = (mode: (typeof MODES)[number], phase = 0) => arenaScene({ inks: INK, strength: 1, mode, phase })
  expect(at('idle')).toContain('class="idle"')
  expect(at('waiting')).toContain('class="waiting"')
  expect(at('firing')).toContain('class="working"')
  expect(at('idle')).toContain('.idle .come')
  expect(at('firing')).toContain('class="bolt"')
  expect(at('working')).not.toContain('class="bolt"')
  expect(at('working', 0)).not.toBe(at('working', 7))
})

test('scenes draw in the inks they are given', () => {
  for (const source of [gridScene({ inks: INKS.leaky, strength: 1 }), arenaScene({ inks: INKS.leaky, strength: 1, mode: 'idle', phase: 0 })]) {
    expect(source).toContain(`stroke="${INKS.leaky.red}"`)
    expect(source).toContain(`stroke="${INKS.leaky.cyan}"`)
  }
})

test('settings fall back to defaults and keep depth in range', () => {
  expect(settingsFrom({})).toEqual({ strength: 1, inks: INKS.typical, scene: 'arena' })
  expect(settingsFrom({ depth: 9, glasses: 'leaky', scene: 'grid' })).toEqual({ strength: 2, inks: INKS.leaky, scene: 'grid' })
  expect(settingsFrom({ depth: 0, glasses: 'rose', scene: 'moon' })).toEqual({ strength: 0.2, inks: INKS.typical, scene: 'arena' })
})

test('the desktop app paints the theme, and the look names its scene', () => {
  expect(COLORS.problems.filter(line => line.startsWith("Desktop won't paint"))).toEqual([])
  expect(lookFor('arena-idle-1').backdrop).toMatchObject({ scene: 'arena-idle-1' })
})
