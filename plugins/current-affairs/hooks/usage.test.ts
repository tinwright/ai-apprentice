import { expect, test } from 'claude-code/testing'

import { contextWarning, limitLabel, limitPace, meter, paceText, resetsIn, tokens, usageRows } from './usage'

test('meters fill in eighths and always keep their width', async () => {
  expect(meter(0, 8)).toEqual({ filled: '', empty: '░░░░░░░░' })
  expect(meter(50, 8)).toEqual({ filled: '████', empty: '░░░░' })
  expect(meter(100, 8)).toEqual({ filled: '████████', empty: '' })
  const part = meter(30, 10)
  expect(part.filled).toBe('███')
  expect(part.filled.length + part.empty.length).toBe(10)
  expect(meter(140, 4).filled).toBe('████')
})

test('token counts read at a glance', async () => {
  expect(tokens(950)).toBe('950')
  expect(tokens(12_300)).toBe('12.3k')
  expect(tokens(20_000)).toBe('20k')
  expect(tokens(184_400)).toBe('184k')
  expect(tokens(1_000_000)).toBe('1M')
})

test('limit windows and resets are named for people', async () => {
  expect(limitLabel('five_hour')).toBe('5-hour limit')
  expect(limitLabel('seven_day')).toBe('Weekly limit')
  expect(limitLabel('seven_day_opus')).toBe('Seven day opus')
  const now = Date.parse('2026-10-17T12:00:00Z')
  expect(resetsIn('2026-10-17T12:42:00Z', now)).toBe('in 42m')
  expect(resetsIn('2026-10-17T15:00:00Z', now)).toBe('in 3h')
  expect(resetsIn('2026-10-20T12:00:00Z', now)).toBe('in 3d')
  expect(resetsIn('2026-10-17T11:00:00Z', now)).toBeUndefined()
  expect(resetsIn(undefined, now)).toBeUndefined()
})

test('context comes first, then each window; no fill yet means no context row', async () => {
  const now = Date.parse('2026-10-17T12:00:00Z')
  const rows = usageRows(
    {
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-17T14:00:00Z' }],
      costUsd: 1.5,
    },
    now,
  )
  expect(rows.map(r => r.key)).toEqual(['context', 'five_hour'])
  expect(rows[0].detail).toBe('84k / 200k')
  expect(rows[1].detail).toBe('resets in 2h')
  expect(usageRows({ context: { window: 200_000 }, rateLimits: [] }, now)).toEqual([])
})

test('the context warning comes once per mark, and resets when the context drops back', () => {
  expect(contextWarning(undefined, 80, 0)).toEqual({ level: 0 })
  expect(contextWarning(79, 80, 0)).toEqual({ level: 0 })
  expect(contextWarning(80, 80, 0).text).toBe('Context 80% full: /compact or start a fresh session soon')
  expect(contextWarning(88, 80, 80)).toEqual({ level: 80 })
  expect(contextWarning(91, 80, 80)).toEqual({ level: 90, text: 'Context 91% full: /compact now, or start a fresh session' })
  expect(contextWarning(30, 80, 90)).toEqual({ level: 0 })
  // A mark above 90 is the only warning; 0 is none.
  expect(contextWarning(92, 95, 0)).toEqual({ level: 0 })
  expect(contextWarning(96, 95, 0).level).toBe(95)
  expect(contextWarning(99, 0, 0)).toEqual({ level: 0 })
})

test('a limit\'s pace is where it ends up by its reset at the rate so far', () => {
  const now = Date.parse('2026-10-24T12:00:00Z')
  const hours = (n: number) => new Date(now + n * 3_600_000).toISOString()
  // Two days into the week at 3%: about 10% by the reset.
  const week = limitPace({ kind: 'seven_day', percentUsed: 3, resetsAt: hours(5 * 24) }, now)
  expect(Math.round(week?.percent ?? 0)).toBe(11)
  expect(paceText(week)).toBe('on pace for 11% by reset')
  // An hour into the 5-hour window at 40%: out an hour and a half from now.
  const fast = limitPace({ kind: 'five_hour', percentUsed: 40, resetsAt: hours(4) }, now)
  expect(fast?.runsOutInMs).toBe(1.5 * 3_600_000)
  expect(paceText(fast)).toBe('at this pace, out in 2h')
  // Too early in the window, an unknown window, nothing used yet: no pace.
  expect(limitPace({ kind: 'seven_day', percentUsed: 1, resetsAt: hours(7 * 24 - 1) }, now)).toBeUndefined()
  expect(limitPace({ kind: 'spend_limit', percentUsed: 50, resetsAt: hours(2) }, now)).toBeUndefined()
  expect(limitPace({ kind: 'five_hour', percentUsed: 0, resetsAt: hours(2) }, now)).toBeUndefined()
  expect(usageRows({ context: { window: 1 }, rateLimits: [{ kind: 'seven_day', percentUsed: 3, resetsAt: hours(5 * 24) }] }, now)[0].pace).toBe(
    'on pace for 11% by reset',
  )
})
