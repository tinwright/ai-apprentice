import { expect, test } from 'claude-code/testing'

import { calibrationFrom, scaled, step, testCard, tilted } from './calibrate'
import { INKS } from './scene'

const START = { red: '#5d0808', cyan: '#004b45', strength: 1 }

test('only a whole calibration is read back from the store', () => {
  expect(calibrationFrom(START)).toEqual(START)
  expect(calibrationFrom({ ...START, strength: 9 })).toEqual({ ...START, strength: 2 })
  expect(calibrationFrom({ ...START, red: 'red' })).toBeUndefined()
  expect(calibrationFrom({ red: START.red, cyan: START.cyan })).toBeUndefined()
  expect(calibrationFrom(undefined)).toBeUndefined()
})

test('dimmer and brighter keep the hue, and never reach black', () => {
  expect(scaled('#804020', 1.5)).toBe('#c06030')
  expect(scaled('#ff8080', 2)).toBe('#ffffff')
  expect(scaled('#100000', 0.5)).toBe('#100000')
})

test('greener and bluer move a cyan between green and blue', () => {
  expect(tilted('#004b45', 'green')).toBe('#005739')
  expect(tilted('#004b45', 'blue')).toBe('#003f51')
  expect(tilted('#0000ff', 'blue')).toBe('#0000ff')
})

test('each step changes one thing, and a preset sets both inks', () => {
  expect(step(START, 'red-').cyan).toBe(START.cyan)
  expect(step(START, 'red-').red).not.toBe(START.red)
  expect(step(START, 'cyan+').red).toBe(START.red)
  expect(step(START, 'depth+').strength).toBe(1.1)
  expect(step({ ...START, strength: 0.2 }, 'depth-').strength).toBe(0.2)
  expect(step(START, 'clean')).toEqual({ ...INKS.clean, strength: 1 })
})

test('the test card prints each word in its own ink', () => {
  const card = testCard(START)
  expect(card).toContain(`fill="${START.red}" style="mix-blend-mode:screen">LEFT`)
  expect(card).toContain(`fill="${START.cyan}" style="mix-blend-mode:screen">RIGHT`)
})
