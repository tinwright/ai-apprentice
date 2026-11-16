import { expect, test } from 'claude-code/testing'

import { POINTING, sleeping } from './critter'
import { lookFor, scene } from './scene'
import type { Period } from './sky'

const PERIODS: Period[] = ['dawn', 'day', 'dusk', 'night']

test('every scene is an SVG well under the backdrop limit, and still for reduced motion', () => {
  for (const period of PERIODS) {
    const source = scene({ period, t: 0.5, phase: 0.3 })
    expect(source.startsWith('<svg')).toBe(true)
    expect(source.length).toBeLessThan(131_072)
    expect(source).toContain('prefers-reduced-motion')
  }
})

test('the sun and moon are drawn over the sky, not hidden under it', () => {
  for (const period of PERIODS) {
    const source = scene({ period, t: 0.5, phase: 0.3 })
    const sky = source.indexOf('fill="url(#sky)"')
    const disc = source.search(/<circle cx="[\d.]+" cy="[\d.]+" r="30" fill="#/)
    expect(sky).toBeGreaterThan(-1)
    expect(disc).toBeGreaterThan(sky)
    expect(source.slice(source.indexOf('</defs>'))).not.toContain('<defs>')
  }
})

test('the moon\'s shadow sits on the other side in the southern hemisphere', () => {
  const shadow = (south: boolean) => /<circle cx="([\d.]+)" cy="[\d.]+" r="30" fill="black"/.exec(scene({ period: 'night', t: 0.5, phase: 0.25, south }))?.[1]
  expect(Number(shadow(false))).toBeLessThan(800)
  expect(Number(shadow(true))).toBeGreaterThan(800)
})

test('each look names its scene and paints light by day, dark by night', () => {
  const day = lookFor({ period: 'day', t: 0.4, phase: 0 })
  expect(day.key).toBe('day-24')
  expect(day.args.backdrop).toMatchObject({ scene: 'day-24' })
  const night = lookFor({ period: 'night', t: 0.5, phase: 0 })
  expect(night.key).toBe('night-30')
  expect(day.source).not.toBe(night.source)
})

test('the critter dreams of the sky it sleeps under', () => {
  expect(sleeping('night')).toContain('class="sheep')
  expect(sleeping('day')).toContain('class="fly"')
  expect(sleeping('dawn')).toContain('class="rise"')
  expect(sleeping('dusk')).toContain('class="ff"')
  expect(POINTING).toContain('class="point"')
  for (const period of PERIODS) expect(sleeping(period)).toContain('prefers-reduced-motion')
})
