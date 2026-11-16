import { expect, test } from 'claude-code/testing'

import { arc, clockTime, moonPhase, periodAt, placeFrom, sunTimes } from './sky'

const NEW_YORK = { lat: 40.71, lon: -74.01 }

test('sunrise and sunset land within a few minutes of the almanac', () => {
  // 15 November in New York (UTC-5): sunrise 06:43, sunset 16:38.
  const nov = sunTimes(319, -5, NEW_YORK)
  expect(Math.abs(nov.rise - (6 + 43 / 60))).toBeLessThan(0.1)
  expect(Math.abs(nov.set - (16 + 38 / 60))).toBeLessThan(0.1)
  // 21 June, on daylight saving time (UTC-4): sunrise 05:25, sunset 20:31.
  const jun = sunTimes(172, -4, NEW_YORK)
  expect(Math.abs(jun.rise - (5 + 25 / 60))).toBeLessThan(0.1)
  expect(Math.abs(jun.set - (20 + 31 / 60))).toBeLessThan(0.1)
})

test('with no place the day runs 06:00 to 18:00', () => {
  expect(sunTimes(319, 0)).toEqual({ rise: 6, set: 18 })
})

test('polar night and midnight sun give a sky, not NaN', () => {
  const svalbard = { lat: 78.2, lon: 15.6 }
  for (const day of [1, 172]) {
    const { rise, set } = sunTimes(day, 1, svalbard)
    expect(Number.isFinite(rise) && Number.isFinite(set)).toBe(true)
    for (let hour = 0; hour < 24; hour += 0.5) {
      const { t } = periodAt(hour, rise, set)
      expect(t >= 0 && t <= 1).toBe(true)
    }
  }
})

test('the day goes dawn, day, dusk, night', () => {
  expect(periodAt(6.5, 7, 16).period).toBe('dawn')
  expect(periodAt(12, 7, 16).period).toBe('day')
  expect(periodAt(15.5, 7, 16).period).toBe('dusk')
  expect(periodAt(23, 7, 16).period).toBe('night')
  expect(periodAt(3, 7, 16).period).toBe('night')
})

test('the moon is full and new on the right nights', () => {
  // Full moon 13 Jan 2025 22:27 UTC; new moon 29 Jan 2025 12:36 UTC.
  expect(Math.abs(moonPhase(new Date(Date.UTC(2025, 0, 13, 22, 27))) - 0.5)).toBeLessThan(0.03)
  const fresh = moonPhase(new Date(Date.UTC(2025, 0, 29, 12, 36)))
  expect(Math.min(fresh, 1 - fresh)).toBeLessThan(0.03)
})

test('a place needs both halves, in range', () => {
  expect(placeFrom({ latitude: 40.7, longitude: -74 })).toEqual({ lat: 40.7, lon: -74 })
  expect(placeFrom({ latitude: 40.7 })).toBeUndefined()
  expect(placeFrom({ latitude: 91, longitude: 0 })).toBeUndefined()
  expect(placeFrom({ latitude: '40', longitude: '-74' })).toBeUndefined()
  expect(placeFrom({})).toBeUndefined()
})

test('the sun stays in the top of the window', () => {
  for (const t of [0, 0.25, 0.5, 1]) {
    const [x, y] = arc(t)
    expect(x >= 0 && x <= 1600 && y >= 0 && y <= 500).toBe(true)
  }
  expect(clockTime(7.38)).toBe('07:23')
  expect(clockTime(23.999)).toBe('00:00')
})
